#!/usr/bin/env bash
# Payment reconciliation (run every 15 min by svetlana-reconcile.timer):
# asks the app to re-check pending orders against GoPay, so a lost or late
# webhook can't leave a paid order unfulfilled.
#
# Reads INVOICE_BACKFILL_TOKEN from the repo's .env.tunnel (never printed —
# the Authorization header goes to curl on stdin, not on the command line).
# Exits non-zero on any failure (app down, auth error, 5xx) so the systemd
# unit shows as failed.
set -euo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env.tunnel}"
URL="${RECONCILE_URL:-http://127.0.0.1:43117/api/payments/reconcile}"

die() { echo "reconcile: ERROR: $*" >&2; exit 1; }

[ -r "$ENV_FILE" ] || die "cannot read $ENV_FILE"
line=$(grep -E '^INVOICE_BACKFILL_TOKEN=' "$ENV_FILE" | tail -n 1) || die "INVOICE_BACKFILL_TOKEN not set in $ENV_FILE"
token=${line#*=}
token=${token%$'\r'}
token=${token#\"}; token=${token%\"}
token=${token#\'}; token=${token%\'}
[ -n "$token" ] || die "INVOICE_BACKFILL_TOKEN is empty in $ENV_FILE"

body=$(mktemp)
trap 'rm -f "$body"' EXIT

# printf is a shell builtin, so the token never appears in the process list.
# One run checks up to 200 orders with one GoPay call each — allow 4 min
# (the unit's TimeoutStartSec is 5 min).
code=$(printf 'Authorization: Bearer %s\n' "$token" \
  | curl -sS --max-time 240 -X POST -H @- -o "$body" -w '%{http_code}' "$URL") \
  || die "request to $URL failed (app down?)"

summary=$(head -c 500 "$body" | tr -d '\n')
case "$code" in
  2??) echo "reconcile: HTTP $code $summary" ;;
  *) die "HTTP $code from $URL: $summary" ;;
esac
