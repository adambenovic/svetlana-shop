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
# NEXT_PUBLIC_* vars are inlined into client bundles at build time — pass as build args
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PACKETA_WIDGET_KEY=
ENV NEXT_PUBLIC_PACKETA_WIDGET_KEY=$NEXT_PUBLIC_PACKETA_WIDGET_KEY
ENV NODE_ENV=production
RUN npm run build

# ── runner ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
# sharp must be local (not global) so standalone server can resolve it
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp

# Media uploads persist here — mount a volume in production
RUN mkdir -p /app/public/media

EXPOSE 3000
ENTRYPOINT ["sh", "entrypoint.sh"]
