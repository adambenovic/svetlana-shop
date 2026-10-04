# ── deps ──────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined into client AND server bundles at build time
# (payload.config.ts derives serverURL/csrf from NEXT_PUBLIC_APP_URL) — pass as build args
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PACKETA_WIDGET_KEY=
ENV NEXT_PUBLIC_PACKETA_WIDGET_KEY=$NEXT_PUBLIC_PACKETA_WIDGET_KEY
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
# TZ: Node's bundled ICU carries the zone data, no tzdata package needed.
# HOSTNAME: Next standalone binds to $HOSTNAME — Docker sets it to the container
# id, which would leave 127.0.0.1 (the healthcheck) unreachable.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=Europe/Bratislava \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# App files stay root-owned (read-only for the runtime user)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Legal texts (source of truth in-repo) — read by /api/seed-pages at runtime
COPY --from=builder /app/legal ./legal
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
# sharp must be local (not global) so standalone server can resolve it
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp

# The only paths the app writes at runtime: media uploads + invoice PDFs (both
# volumes in production) and Next's image-optimizer cache. Existing volumes
# created by the old root image need a one-time chown to 1000:1000 (DEPLOY.md).
RUN mkdir -p /app/public/media /app/invoices /app/.next/cache \
 && chown -R node:node /app/public/media /app/invoices /app/.next/cache

USER node
EXPOSE 3000
ENTRYPOINT ["sh", "entrypoint.sh"]
