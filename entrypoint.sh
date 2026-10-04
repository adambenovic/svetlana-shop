#!/bin/sh
set -e
# Pending migrations (prodMigrations in payload.config.ts) run when Payload
# initialises — on the first request that touches the DB, not at container
# start. After a deploy, hit /api/health to trigger them and check the logs.
exec node server.js
