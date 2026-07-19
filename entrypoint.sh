#!/bin/sh
set -e
# Migrations run automatically on startup via prodMigrations in payload.config.ts
exec node server.js
