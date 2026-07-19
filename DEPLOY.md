# Deploying Svetlana Shop

## Local deployment behind a Cloudflare tunnel

The app runs in Docker and is published only on `127.0.0.1:43117` (a deliberately
uncommon port — this host runs many other services). Cloudflare terminates TLS,
so there is no reverse proxy in the stack.

```bash
docker build --build-arg NEXT_PUBLIC_APP_URL=https://svetlanalampe.sk \
  --build-arg NEXT_PUBLIC_PACKETA_WIDGET_KEY="$(grep ^NEXT_PUBLIC_PACKETA_WIDGET_KEY= .env.tunnel | cut -d= -f2)" \
  -t svetlana-shop:latest .
docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d
```

Secrets live in `.env.tunnel` (gitignored). Fill in the GoPay/Packeta/Brevo keys
there, then `docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d`
again to restart the app with the new values (no rebuild needed — all keys are
read at runtime).

### Invoices (faktúry)

Paid orders get an invoice automatically (webhook): sequential number from the
`invoice_number_seq` DB sequence (`FV-YYYY-NNNNN`), PDF stored in the `invoices`
volume (`/app/invoices`, not publicly served), destination-country VAT per OSS
(`VAT_RATES` in `lib/invoice.ts` — review when EU rates change). The customer
gets the PDF attached to the confirmation email plus a tokenized link
(`/api/invoices/<token>`) gated by billing ZIP or order email. Missing PDFs are
regenerated on demand from order data.

Backfill for paid orders without an invoice:

```bash
curl -X POST http://localhost:43117/api/invoices/backfill \
  -H "Authorization: Bearer $INVOICE_BACKFILL_TOKEN"
```

eKasa note: distance sales paid via payment gateway are exempt from eKasa
(zákon č. 289/2008 Z. z., resp. 384/2025 — "predaj na diaľku alebo na faktúru"),
so no pokladničný doklad is required; the faktúra is the customer document.

### Switching GoPay between production and sandbox

`GOPAY_ENV` in `.env.tunnel` selects the credential set at runtime — no rebuild:

- `GOPAY_ENV=prod` (default) → `GOPAY_API_URL` / `GOPAY_CLIENT_ID` / `GOPAY_CLIENT_SECRET` / `GOPAY_GO_ID`
- `GOPAY_ENV=test` → `GOPAY_TEST_*` variants, defaulting to the sandbox gateway
  `https://gw.sandbox.gopay.com/api` (create sandbox credentials at https://sandbox.gopay.com)

After changing the value: `docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d`.
Note: orders created while in test mode carry sandbox payment IDs — don't flip back
to prod while a test payment is mid-flight, its webhook would fail verification.

### Legal pages & document PDFs

`POST /api/seed-pages` (Bearer-gated) loads legal HTML from the in-repo `legal/` dir (baked into the image)
into the Pages collection for all 10 locales. The lamp-manual and
declaration-of-conformity pages show pre-rendered page images (mobile browsers
can't embed PDFs) plus a download link. To regenerate after replacing a PDF in
`public/docs/`:

```bash
docker run --rm -v "$PWD/public/docs:/d" alpine sh -c '
  apk add -q poppler-utils libwebp-tools
  pdftoppm -png -r 110 "/d/LEAH_Manual.pdf" /d/manual-pages/page
  for f in /d/manual-pages/*.png; do cwebp -quiet -q 82 "$f" -o "${f%.png}.webp" && rm "$f"; done'
# keep filenames zero-padded to 2 digits (page-01.webp …), update pageCount in
# app/api/seed-pages/route.ts, rebuild, then re-run the seed
```

### Configurator render images

> **Warning — translucent/clear shades:** the PNG masters in `~/projects/benoshop/renders/shades`
> hold OLD (opaque) renders for the `clear` and `translucent-*` shade colors. The correct
> versions were pulled from the Shopify CDN (2026-07-19) directly into
> `public/assets/shades/`. The regeneration command below skips existing files, so it
> won't clobber them — but do NOT regenerate those 168 files from the masters.


The configurator's lamp preview loads `/assets/bases/<Base>-<color>.webp` and
`/assets/shades/<Shade>-<color>.webp`. These ~1,370 files are **not in git or the
Docker image** — the PNG masters live in `~/projects/benoshop/renders/`, converted
to webp into `public/assets/{bases,shades}` (gitignored, excluded via .dockerignore)
and bind-mounted read-only into the container by `docker-compose.tunnel.yml`.

To regenerate after new renders are added:

```bash
docker run --rm -v ~/projects/benoshop/renders:/in:ro -v "$PWD/public/assets:/out" alpine sh -c \
  'apk add -q libwebp-tools && for d in bases shades; do for f in /in/$d/*.png; do
     b=$(basename "$f" .png); [ -f "/out/$d/$b.webp" ] || cwebp -quiet -q 85 "$f" -o "/out/$d/$b.webp"; done; done'
```

Point the host's cloudflared tunnel at the app, e.g. in the tunnel config:

```yaml
ingress:
  - hostname: svetlanalampe.sk
    service: http://localhost:43117
  - service: http_status:404
```

## Build the image (on your server or CI)

```bash
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://shop.svetlana-lampe.com \
  -t svetlana-shop:latest .
```

## Create production env file

Copy `.env.local` to `.env.prod` on the server, fill in real values (no sandbox keys).

## Start

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Update (zero-downtime is not guaranteed — acceptable for this scale)

```bash
docker build --build-arg NEXT_PUBLIC_APP_URL=https://shop.svetlana-lampe.com -t svetlana-shop:latest .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps app
```

## Logs

```bash
docker compose -f docker-compose.prod.yml logs -f app
```
