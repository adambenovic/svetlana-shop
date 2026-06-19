# Deploying Svetlana Shop

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
