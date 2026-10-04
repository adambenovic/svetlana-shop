# Deploying Svetlana Shop

## Topology

The shop runs in Docker on this host and is published only on `127.0.0.1:43117`
(a deliberately uncommon port — this host runs many other services). The host's
`cloudflared` tunnel forwards `svetlanalampe.sk` to it; Cloudflare terminates TLS,
so there is no reverse proxy in the stack.

```yaml
# cloudflared tunnel ingress
ingress:
  - hostname: svetlanalampe.sk
    service: http://localhost:43117
  - service: http_status:404
```

`docker-compose.tunnel.yml` runs two containers:

| Container | Notes |
|-----------|-------|
| `svetlana-shop-postgres-1` | `postgres:16-alpine`, volume `svetlana-shop_pgdata`, `mem_limit 512m` |
| `svetlana-shop-app-1` | image `svetlana-shop:latest`; runs as the non-root `node` user (uid 1000), `cap_drop: ALL`, `no-new-privileges`, `mem_limit 1g`, `pids_limit 256`, DNS 1.1.1.1/9.9.9.9; volumes `svetlana-shop_media` → `/app/public/media`, `svetlana-shop_invoices` → `/app/invoices` |

Both run with `TZ=Europe/Bratislava` (invoice dates/years and log timestamps are
local time; Postgres `timestamptz` values are unaffected) and log to the host
journal (see [Logs](#logs)). The app has a healthcheck on `GET /api/health`
(`select 1` against the DB; 30 s interval, unhealthy after 3 failures, 60 s grace
at start). Docker only *reports* unhealthy — it doesn't restart the container — so
the external uptime monitor (see [Owner actions](#owner-actions)) is what alerts.

Secrets live in `.env.tunnel` (gitignored; keep it `chmod 600`). After changing a
value, `docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d`
recreates the app with it — no rebuild, **except** for `NEXT_PUBLIC_*` values,
which are baked in at build time.

## Build

```bash
git status --short          # commit first — the image tag should identify the code
docker build --build-arg NEXT_PUBLIC_APP_URL=https://svetlanalampe.sk \
  --build-arg NEXT_PUBLIC_PACKETA_WIDGET_KEY="$(grep ^NEXT_PUBLIC_PACKETA_WIDGET_KEY= .env.tunnel | cut -d= -f2)" \
  -t svetlana-shop:$(git rev-parse --short HEAD) -t svetlana-shop:latest .
```

`NEXT_PUBLIC_APP_URL` **must** be the public URL: it is inlined into client and
server code, and Payload derives its `serverURL` and CSRF origin allowlist from it.
A wrong value breaks admin sessions (the admin cookie is rejected for an unlisted
origin) and password-reset links.

Every build keeps a `svetlana-shop:<git-sha>` tag for rollback. The weekly
`docker-auto-update` job only prunes *dangling* images, so tagged ones stay until
removed by hand (`docker image ls svetlana-shop`, `docker image rm svetlana-shop:<old-sha>`).

## Deploy checklist

1. **Backup** — `systemctl --user start svetlana-backup.service` (blocks until done), then
   `journalctl --user -u svetlana-backup -n 20 --no-pager` should end with `backup finished`.
2. **Build** — as above (tags `:<sha>` and `:latest`).
3. **Start** — `docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d`
4. **Health** — `curl -fsS http://127.0.0.1:43117/api/health` → `{"ok":true}`. This first DB
   access also runs any pending migrations (they run when Payload initialises, not at
   container start). `docker inspect -f '{{.State.Health.Status}}' svetlana-shop-app-1` → `healthy`.
5. **Logs** — `journalctl CONTAINER_NAME=svetlana-shop-app-1 --since -10min --no-pager | grep -E 'Migrat|ERROR'`:
   `Migrating`/`Migrated` lines only if a migration was pending, no `ERROR`.
6. **Smoke test** — https://svetlanalampe.sk loads, configurator renders, cart re-prices, `/admin` login works.

### Rollback

```bash
docker image ls svetlana-shop                       # find the previous SHA tag
docker tag svetlana-shop:<previous-sha> svetlana-shop:latest
docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d
```

Migrations are forward-only. If the release being rolled back applied a migration,
the old image may not match the schema — restore the pre-deploy dump (step 1) as
described in [Restore](#restore).

### One-time: moving to the non-root image

Volumes created by the old (root) image are root-owned, so the `node` user can't
write invoices or media. Right before the first `up -d` with the new image:

```bash
docker run --rm -v svetlana-shop_invoices:/v -v svetlana-shop_media:/m alpine chown -R 1000:1000 /v /m
```

Symptom if skipped: invoice generation fails with `EACCES` on `/app/invoices`, uploads fail.

## Admin

- Use https://svetlanalampe.sk/admin. From the host itself, http://localhost:43117/admin
  also works (it is on the CSRF allowlist) — use `localhost`, not `127.0.0.1`.
  Password-reset links and a few admin navigation actions always point at the public URL.
- Auth cookies are `Secure` + `SameSite=Lax` in production; 5 failed logins lock the
  account for 10 minutes.
- Password-reset emails go through Brevo (`lib/payload-email.ts`, same `BREVO_API_KEY` /
  `EMAIL_FROM` as order emails). Without those set, the reset request fails with an error
  instead of silently not sending.
- Media uploads: JPEG/PNG/WebP up to 10 MB, stored in the `media` volume, publicly readable.

## Logs

Both containers use the `journald` log driver (tag = container name), so logs survive
container recreation and follow the host journal's retention:

```bash
journalctl CONTAINER_NAME=svetlana-shop-app-1 -f
journalctl CONTAINER_NAME=svetlana-shop-postgres-1 --since today
docker logs svetlana-shop-app-1      # still works with journald
```

(`adam` is in the `adm` group, so no sudo is needed to read the system journal.)

## Scheduled jobs (systemd user timers)

| Timer | Schedule | Runs |
|-------|----------|------|
| `svetlana-backup.timer` | daily 02:30 | `ops/backup.sh` |
| `svetlana-reconcile.timer` | every 15 min | `ops/reconcile.sh` |

Both are `Persistent=true` (a run missed while the host was down happens at the next
boot). Unit files live in `ops/systemd/`; install or update them with:

```bash
install -m 644 ops/systemd/svetlana-*.service ops/systemd/svetlana-*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now svetlana-backup.timer svetlana-reconcile.timer
systemctl --user list-timers 'svetlana-*'
```

User timers run without an open session because lingering is on (`loginctl show-user adam -p Linger`).
Failed runs show up in `systemctl --user --failed`.

### Payment reconciliation

`ops/reconcile.sh` calls `POST /api/payments/reconcile` with
`Authorization: Bearer $INVOICE_BACKFILL_TOKEN` (read from `.env.tunnel`, never printed),
so a lost or late GoPay webhook can't leave a paid order unfulfilled. Any non-2xx
response or an unreachable app fails the unit.

```bash
journalctl --user -u svetlana-reconcile -n 20 --no-pager
systemctl --user start svetlana-reconcile.service      # run now
```

## Backups

`ops/backup.sh` (daily 02:30, and step 1 of every deploy) writes to
`/home/adam/backups/svetlana` (override with `SVETLANA_BACKUP_DIR`):

- `db/svetlana-YYYYmmdd-HHMMSS.dump` — `pg_dump -Fc` of the shop DB, verified with
  `pg_restore -l` (must list data for `orders`, `products`, `payload_migrations`).
  Retention: 30 days, never fewer than the newest 30 dumps.
- `volumes/invoices/`, `volumes/media/` — **add-only** mirror of the volumes: files are
  never overwritten or deleted in the mirror (invoices are immutable records that must
  be kept for 10 years).

Optional settings go in `~/.config/svetlana-backup/backup.env` (read by the unit):
`SVETLANA_BACKUP_DIR`, `KEEP_DAYS`, `HC_URL` (healthchecks.io ping URL; may also be set in
`.env.tunnel`). With `HC_URL`, the script pings `/start`, success, or `/fail`.

`.env.tunnel` is deliberately **not** backed up — keep a copy of it in a password manager.

### Off-site copy (restic)

Runs only when `~/.config/svetlana-backup/restic.env` exists. One-time setup:

```bash
sudo apt install restic
install -d -m 700 ~/.config/svetlana-backup
cat > ~/.config/svetlana-backup/restic.env <<'EOF'
RESTIC_REPOSITORY=s3:https://<endpoint>/<bucket>/svetlana
RESTIC_PASSWORD_FILE=/home/adam/.config/svetlana-backup/restic.pass
AWS_ACCESS_KEY_ID=<key id>
AWS_SECRET_ACCESS_KEY=<secret>
EOF
chmod 600 ~/.config/svetlana-backup/restic.env
# put a long random password in restic.pass (chmod 600) AND in the password manager —
# without it the off-site copy is unreadable
(set -a; . ~/.config/svetlana-backup/restic.env; restic init)
```

Each run uploads the whole backup directory and keeps 14 daily / 8 weekly / 12 monthly
snapshots.

### Restore

Database (replaces the current contents):

```bash
DUMP=/home/adam/backups/svetlana/db/svetlana-YYYYmmdd-HHMMSS.dump
docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel stop app
docker exec -i svetlana-shop-postgres-1 sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction' < "$DUMP"
docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d
curl -fsS http://127.0.0.1:43117/api/health
```

Volumes (the mirror only adds files, so restoring it never loses newer ones):

```bash
for v in invoices media; do
  tar -C /home/adam/backups/svetlana/volumes/$v -cf - . \
    | docker run --rm -i -v svetlana-shop_$v:/v alpine sh -c 'tar -C /v -xf - && chown -R 1000:1000 /v'
done
```

From off-site: `(set -a; . ~/.config/svetlana-backup/restic.env; restic restore latest --tag svetlana --target /tmp/svetlana-restore)`,
then use the files under `/tmp/svetlana-restore/home/adam/backups/svetlana/` as above.

After restoring an older dump:

- **Invoice numbers** — the restored `invoice_number_seq` may be behind invoices already
  issued after the dump. Compare `ls volumes/invoices | sort | tail -1` with
  `select last_value from invoice_number_seq` and, if needed,
  `select setval('invoice_number_seq', <highest issued number>)` so no number is reused.
- **Orders** — orders placed after the dump exist only in GoPay; check the GoPay admin for
  payments after the dump time and re-enter them.

### Monthly restore drill

Restore the newest dump into a throwaway Postgres and sanity-check it (touches nothing live):

```bash
DUMP=$(ls -1 /home/adam/backups/svetlana/db/svetlana-*.dump | tail -n 1)
docker run -d --name svetlana-restore-drill --network none \
  -e POSTGRES_USER=svetlana -e POSTGRES_DB=svetlana -e POSTGRES_PASSWORD=drill postgres:16-alpine
until docker exec svetlana-restore-drill pg_isready -h 127.0.0.1 -U svetlana -q; do sleep 1; done
docker exec -i svetlana-restore-drill pg_restore -U svetlana -d svetlana --no-owner --exit-on-error < "$DUMP"
docker exec svetlana-restore-drill psql -U svetlana -d svetlana \
  -c "select count(*) as orders, max(created_at) as last_order from orders" \
  -c "select count(*) as products from products" \
  -c "select name as last_migration from payload_migrations order by id desc limit 1" \
  -c "select last_value as invoice_seq from invoice_number_seq"
docker rm -f svetlana-restore-drill
```

Expect the order count and last order to match production as of the dump, and
`invoice_seq` to match the newest PDF in `volumes/invoices/`. Note the date and result in
`/home/adam/backups/svetlana/restore-drills.log`. Once a quarter, run the drill from a
`restic restore` instead of the local dump.

## Invoices (faktúry)

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

## Switching GoPay between production and sandbox

`GOPAY_ENV` in `.env.tunnel` selects the credential set at runtime — no rebuild:

- `GOPAY_ENV=prod` (default) → `GOPAY_API_URL` / `GOPAY_CLIENT_ID` / `GOPAY_CLIENT_SECRET` / `GOPAY_GO_ID`
- `GOPAY_ENV=test` → `GOPAY_TEST_*` variants, defaulting to the sandbox gateway
  `https://gw.sandbox.gopay.com/api` (create sandbox credentials at https://sandbox.gopay.com)

After changing the value: `docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d`.
Note: orders created while in test mode carry sandbox payment IDs — don't flip back
to prod while a test payment is mid-flight, its webhook would fail verification.

## Legal pages & document PDFs

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

## Configurator render images

The configurator's lamp preview loads `/assets/bases/<Base>-<color>.webp` and
`/assets/shades/<Shade>-<color>.webp`. These ~1,370 files (≈36 MB) are **committed in
git** under `public/assets/{bases,shades}` and baked into the Docker image — the repo is
the source of truth, nothing is mounted from outside.

> **Translucent/clear shades:** the 168 `clear` / `translucent-*` shade renders in git are
> the current versions (pulled from the Shopify CDN, 2026-07-19). The old PNG masters in
> `~/projects/benoshop/renders/shades` hold outdated opaque renders for those colors — never
> regenerate them from the masters. The command below skips existing files.

Only if new renders are added (from PNG masters), convert them and commit the results:

```bash
docker run --rm -v ~/projects/benoshop/renders:/in:ro -v "$PWD/public/assets:/out" alpine sh -c \
  'apk add -q libwebp-tools && for d in bases shades; do for f in /in/$d/*.png; do
     b=$(basename "$f" .png); [ -f "/out/$d/$b.webp" ] || cwebp -quiet -q 85 "$f" -o "/out/$d/$b.webp"; done; done'
```

## Owner actions

Security/ops settings outside this repo — to be done by the owner:

- [ ] **Cloudflare → SSL/TLS → Edge Certificates:** turn on *Always Use HTTPS* and enable
      *HSTS* (max-age ≥ 6 months; `includeSubDomains` only once every subdomain is HTTPS).
- [ ] **www:** add a proxied `www` record (`cloudflared tunnel route dns <tunnel> www.svetlanalampe.sk`
      or a CNAME to the tunnel) and a *Redirect Rule* `www.svetlanalampe.sk/*` →
      `https://svetlanalampe.sk/${path}` (301, keep the query string).
- [ ] **Cloudflare Access for the admin:** Zero Trust → Access → Applications → self-hosted app
      covering `svetlanalampe.sk/admin`, `svetlanalampe.sk/api/users` (the login API) and
      `svetlanalampe.sk/api/graphql` (also exposes login; the storefront doesn't use it), policy
      = the owner's/operator's emails. Never put the rest of `/api` behind Access (storefront +
      GoPay webhook use it).
- [ ] **cloudflared token:** it is currently on the `ExecStart` command line of
      `/etc/systemd/system/cloudflared.service` (world-readable, visible in `ps`). Rotate it in
      Zero Trust → Networks → Tunnels, then store the new one in a root-only file:
      ```bash
      sudo install -d -m 700 /etc/cloudflared
      sudo sh -c 'umask 077; cat > /etc/cloudflared/tunnel-token'     # paste token, Ctrl-D
      sudo systemctl edit --full cloudflared
      #   ExecStart=/usr/bin/cloudflared --no-autoupdate tunnel run --token-file /etc/cloudflared/tunnel-token
      sudo systemctl daemon-reload && sudo systemctl restart cloudflared
      ```
- [ ] **`chmod 600 .env.tunnel`** (it is group/world-readable now), and keep a copy in a password manager.
- [ ] **Second admin user** in `/admin` → Users (separate email, password in the password manager)
      so a locked-out or lost account doesn't lock you out of the shop.
- [ ] **Off-site backup target:** create a bucket (e.g. Backblaze B2 / Hetzner Storage Box) and
      `restic.env` as in [Off-site copy](#off-site-copy-restic); set `HC_URL` so a missed
      backup alerts (healthchecks.io check: period 1 day, grace 2 h).
- [ ] **Uptime monitor** on `https://svetlanalampe.sk/api/health` (e.g. UptimeRobot / Better Stack,
      1–5 min interval, alert by email/SMS).
- [x] **`OPS_EMAIL`** in `.env.tunnel` — where payment/invoice alerts go (set to `contact@svetlanalampe.sk`;
      make sure someone actually reads that mailbox).

## Legacy files

`docker-compose.prod.yml` + `Caddyfile` are the old self-hosted-with-Caddy setup. They are not
maintained (no invoices volume, no GoPay sandbox switch, no hardening) — the tunnel
compose above is the supported deployment.
