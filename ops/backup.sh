#!/usr/bin/env bash
# Nightly backup of the Svetlana shop (run by svetlana-backup.timer, or by hand
# before a deploy):
#   1. pg_dump -Fc of the shop database, verified with pg_restore -l
#   2. add-only mirror of the invoices + media volumes (files are never deleted
#      or overwritten in the mirror — invoices are immutable legal records)
#   3. retention: the last 30 days of dumps (never fewer than the newest 30)
#   4. optional off-site copy with restic (only if ~/.config/svetlana-backup/restic.env exists)
#   5. optional healthchecks.io ping (HC_URL)
#
# Layout:  $BACKUP_DIR/db/svetlana-YYYYmmdd-HHMMSS.dump
#          $BACKUP_DIR/volumes/{invoices,media}/
#
# Overrides (env, or ~/.config/svetlana-backup/backup.env via the systemd unit):
#   SVETLANA_BACKUP_DIR  destination (default /home/adam/backups/svetlana)
#   KEEP_DAYS            retention (default 30)
#   HC_URL               healthchecks.io ping URL (falls back to HC_URL= in the repo's .env.tunnel)
# No secrets live here: the DB is dumped over the container's local socket and
# restic credentials come from restic.env.
set -euo pipefail
umask 077

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${SVETLANA_BACKUP_DIR:-/home/adam/backups/svetlana}"
KEEP_DAYS="${KEEP_DAYS:-30}"
PG_CONTAINER="${PG_CONTAINER:-svetlana-shop-postgres-1}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-svetlana-shop}"
VOLUMES=(invoices media)
RESTIC_ENV="${RESTIC_ENV:-$HOME/.config/svetlana-backup/restic.env}"
ENV_FILE="$REPO_DIR/.env.tunnel"

log() { echo "[$(date '+%F %T')] $*"; }
die() { log "ERROR: $*" >&2; exit 1; }

# Reads KEY=value from an env file without echoing it (strips optional quotes)
env_file_get() {
  local line
  [ -r "$2" ] || return 0
  line=$(grep -E "^$1=" "$2" | tail -n 1) || return 0
  line=${line#*=}
  line=${line%$'\r'}
  line=${line#\"}; line=${line%\"}
  line=${line#\'}; line=${line%\'}
  printf '%s' "$line"
}

HC_URL="${HC_URL:-$(env_file_get HC_URL "$ENV_FILE")}"

hc_ping() { # $1 = "" | /start | /fail — never fails the backup itself
  [ -n "$HC_URL" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HC_URL}$1" || log "WARNING: healthcheck ping failed"
}

on_exit() {
  local rc=$?
  rm -f "${TMP_DUMP:-}"
  if [ "$rc" -eq 0 ]; then hc_ping ""; else hc_ping /fail; fi
}
trap on_exit EXIT

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/volumes"
exec 9>"$BACKUP_DIR/.lock"
flock -n 9 || die "another backup is running"

hc_ping /start

# ── 1. database ──────────────────────────────────────────────────────
docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -qx true \
  || die "container $PG_CONTAINER is not running"

stamp=$(date +%Y%m%d-%H%M%S)
dump="$BACKUP_DIR/db/svetlana-$stamp.dump"
TMP_DUMP="$dump.partial"

log "dumping database from $PG_CONTAINER"
# POSTGRES_USER/POSTGRES_DB come from the container's own env; local socket auth
docker exec "$PG_CONTAINER" sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$TMP_DUMP"

# Integrity: the archive must parse and contain the core tables' data
toc=$(docker exec -i "$PG_CONTAINER" pg_restore -l < "$TMP_DUMP") || die "pg_restore -l rejected the dump"
for table in orders products payload_migrations; do
  grep -qE "TABLE DATA public $table " <<<"$toc" || die "dump has no data section for table '$table'"
done
mv "$TMP_DUMP" "$dump"
TMP_DUMP=
log "dump ok: $(basename "$dump") ($(du -h "$dump" | cut -f1))"

# ── 2. volumes (add-only mirror) ─────────────────────────────────────
for v in "${VOLUMES[@]}"; do
  vol="${COMPOSE_PROJECT}_$v"
  dst="$BACKUP_DIR/volumes/$v"
  mkdir -p "$dst"
  docker volume inspect "$vol" >/dev/null 2>&1 || die "volume $vol not found"
  # Read the volume in a throwaway container (volume data is root-only on the
  # host), unpack on the host as this user; --skip-old-files = never overwrite.
  docker run --rm --network none -v "$vol:/src:ro" alpine tar -C /src -cf - . \
    | tar -C "$dst" --skip-old-files -xf -
  log "mirrored volume $vol ($(find "$dst" -type f | wc -l) files)"
done

# ── 3. retention ─────────────────────────────────────────────────────
mapfile -t dumps < <(find "$BACKUP_DIR/db" -maxdepth 1 -type f -name 'svetlana-*.dump' -printf '%f\n' | sort -r)
removed=0
for f in "${dumps[@]:$KEEP_DAYS}"; do
  # only beyond the newest $KEEP_DAYS AND older than $KEEP_DAYS days
  if [ -n "$(find "$BACKUP_DIR/db/$f" -mtime +"$KEEP_DAYS")" ]; then
    rm -f -- "$BACKUP_DIR/db/$f"
    removed=$((removed + 1))
  fi
done
log "retention: ${#dumps[@]} dumps before, $removed removed"

# ── 4. off-site (optional) ───────────────────────────────────────────
if [ -f "$RESTIC_ENV" ]; then
  command -v restic >/dev/null || die "restic.env exists but restic is not installed"
  log "restic: backing up $BACKUP_DIR"
  (
    set -a
    # shellcheck source=/dev/null
    . "$RESTIC_ENV"
    set +a
    restic backup --tag svetlana --exclude "$BACKUP_DIR/.lock" "$BACKUP_DIR"
    restic forget --quiet --tag svetlana --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
  )
  log "restic: done"
else
  log "restic: skipped (no $RESTIC_ENV)"
fi

log "backup finished"
