#!/usr/bin/env bash
set -Eeuo pipefail
umask 027
cd /app
mkdir -p /data/media /data/backups
if [[ -f /data/app.db ]]; then
  python3 - <<'PY'
import sqlite3, datetime
source = sqlite3.connect('/data/app.db')
name = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
with sqlite3.connect('/data/backups/pre-deploy-' + name + '.db') as destination:
    source.backup(destination)
source.close()
PY
  python3 scripts/migrate-audit-log.py /data/app.db
  python3 scripts/migrate-site-visits.py /data/app.db
  python3 scripts/migrate-seller-accounts.py /data/app.db
  python3 scripts/migrate-public-phone.py /data/app.db
  # Existing schema changes require a reviewed migration, never data-loss flags.
  bun x prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
else
  python3 -c 'import sqlite3; c=sqlite3.connect("/data/app.db"); c.execute("PRAGMA user_version=0"); c.close()'
  bun x prisma db push --skip-generate
fi
bun run scripts/bootstrap-admin.ts </run/secrets/admin_password
chown -R 1000:1000 /data
chmod 750 /data /data/media /data/backups
