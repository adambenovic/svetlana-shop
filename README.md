# Svetlana Lampe

E-commerce storefront for **Svetlana Lampe** — handcrafted, 3D-printed designer table lamps, built to order and shipped across Central Europe. Operated by BenoCode s.r.o. (Slovakia).

The centerpiece is a live **lamp configurator**: customers pick a base shape, shade, colors, cable, switch, plug and bulb, see a composited render update in real time, and add the result to the cart. Every order is a made-to-order build.

## Highlights

- **Configurator** — URL-backed state (shareable/deep-linkable), live composited preview from render assets, per-part pricing.
- **10 locales** — sk (default), cs, de, pl, hu, uk, en, es, fr, it — with **fully localized URL pathnames** (`/konfigurator`, `/de/warenkorb`, `/fr/panier`, …) via `next-intl`.
- **Multi-currency** — manual per-currency prices (EUR/CZK/PLN/HUF) set in the admin; displayed and charged in the selected currency with EUR fallback.
- **Payments** — [GoPay](https://gopay.com) gateway (cards, Google Pay, Apple Pay) with a runtime prod/sandbox switch. Prices recomputed and discounts re-validated server-side; the webhook verifies payment state against GoPay before fulfilling.
- **Shipping** — [Packeta](https://www.packeta.com) pickup points; delivery to SK, CZ, AT, PL, HU only (enforced client- and server-side).
- **Discount codes** — admin-managed, usage-capped, counted atomically on payment.
- **Invoices (faktúry)** — generated on payment with destination-country VAT (EU OSS), stored privately, emailed as PDF, and reachable by a tokenized link gated on the customer's ZIP/email.
- **Transactional email** — [Brevo](https://www.brevo.com).
- **CMS** — [Payload](https://payloadcms.com) admin at `/admin` for products, orders, pages, discounts.
- **SEO** — per-locale metadata, hreflang + x-default, canonicals, JSON-LD, localized sitemap.

## Tech stack

| Area | Choice |
|------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| CMS / ORM | Payload CMS 3 on PostgreSQL |
| i18n | next-intl 4 (localized pathnames) |
| Client state | Zustand (cart, currency) |
| PDF | pdfkit |
| Payments / Shipping / Email | GoPay · Packeta · Brevo |
| Deploy | Docker, behind a Cloudflare tunnel |

> ⚠️ **Read `AGENTS.md` before contributing.** This project pins a specific Next.js version whose APIs and conventions differ from older releases — consult the bundled docs in `node_modules/next/dist/docs/` rather than relying on memory.

## Project layout

```
app/
  [locale]/          Storefront pages (home, configurator, gallery, product, cart, checkout, pages, policies)
  (payload)/         Payload admin UI + REST/GraphQL (/admin)
  api/               orders, webhooks/gopay, discounts/validate, invoices/*, seed-* , test-fixtures
collections/         Payload collections: Products, Orders, Discounts, Pages, Media, Users
components/          UI: configurator, cart, checkout, gallery, layout, ui
lib/                 gopay, packeta, email, invoice, prices, countries, rate-limit, …
store/               Zustand stores (cart, currency)
i18n/                routing (localized pathnames) + navigation helpers
messages/            Translation catalogs, one per locale
legal/               Legal texts (privacy, terms, refund, shipping, cookies, contact) × 10 locales
migrations/          Payload/Drizzle SQL migrations (auto-run on start)
public/              parts.json, fonts, render assets (bases/shades — see DEPLOY.md), docs (PDFs)
```

## Local development

**Prerequisites:** Node 22, Docker (for PostgreSQL), and a `.env` with at least the core variables below.

```bash
npm install
docker compose up -d postgres          # local Postgres
cp .env.example .env                    # then fill in values (see table below)
npm run dev                             # http://localhost:3000
```

Migrations run automatically on server start (`prodMigrations`). On a fresh database, create the first admin at `/admin`, then seed content (endpoints are Bearer-gated — see below).

### Seeding

```bash
TOKEN=$INVOICE_BACKFILL_TOKEN
curl -X POST localhost:3000/api/seed-product  -H "Authorization: Bearer $TOKEN"   # configurator base product
curl -X POST localhost:3000/api/seed-gallery  -H "Authorization: Bearer $TOKEN"   # 8 signature gallery lamps
curl -X POST localhost:3000/api/seed-pages    -H "Authorization: Bearer $TOKEN"   # legal pages (from legal/) × 10 locales
```

### Testing

```bash
npm test            # Jest unit tests (lib/, store/)
npm run test:e2e    # Playwright end-to-end (e2e/)
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URI` | PostgreSQL connection string |
| `PAYLOAD_SECRET` | Payload encryption/auth secret |
| `NEXT_PUBLIC_APP_URL` | Public base URL (build-time; used for SEO, GoPay return URLs) |
| `GOPAY_ENV` | `prod` (default) or `test` — selects the credential set below |
| `GOPAY_API_URL` / `GOPAY_CLIENT_ID` / `GOPAY_CLIENT_SECRET` / `GOPAY_GO_ID` | Production GoPay |
| `GOPAY_TEST_*` | Sandbox GoPay (used when `GOPAY_ENV=test`) |
| `PACKETA_API_KEY` | Packeta REST API password |
| `NEXT_PUBLIC_PACKETA_WIDGET_KEY` | Packeta pickup-point widget key (build-time) |
| `BREVO_API_KEY` / `EMAIL_FROM` | Transactional email (verified sender) |
| `INVOICE_BACKFILL_TOKEN` | Bearer token gating the seed/backfill operator endpoints |

`NEXT_PUBLIC_*` values are inlined at build time — pass them as Docker build args (see `DEPLOY.md`).

## Deployment

Production runs as a Docker image published on a loopback port behind a **Cloudflare tunnel** (Cloudflare terminates TLS; no reverse proxy in the stack). Legal texts and render assets, the invoice volume, the GoPay prod/sandbox switch, and regeneration commands are all documented in **[`DEPLOY.md`](./DEPLOY.md)**.

```bash
docker build --build-arg NEXT_PUBLIC_APP_URL=https://svetlanalampe.sk \
  --build-arg NEXT_PUBLIC_PACKETA_WIDGET_KEY="…" -t svetlana-shop:latest .
docker compose -f docker-compose.tunnel.yml --env-file .env.tunnel up -d
```

## License

Private / proprietary — © BenoCode s.r.o. All rights reserved.
