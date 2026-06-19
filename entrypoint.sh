#!/bin/sh
set -e
echo "Running Payload migrations..."
node -e "
const { getPayload } = require('payload');
const config = require('./payload.config.js');
getPayload({ config }).then(p => p.db.migrate()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
"
echo "Starting server..."
exec node server.js
