#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
docker compose --env-file /etc/parrotrehome/compose.env -f "$repo_dir/deploy/compose.yaml" exec -T app node -e '
if (!process.env.CRON_SECRET) { console.error("CRON_SECRET is not configured"); process.exit(1); }
fetch("http://127.0.0.1:3000/api/cron/payment-reminders", {
  method: "POST", headers: { Authorization: "Bearer " + process.env.CRON_SECRET }, signal: AbortSignal.timeout(120000)
}).then(async response => { if (!response.ok) throw new Error("Mail maintenance failed: " + response.status); console.log(await response.text()); }).catch(error => { console.error(error.message); process.exit(1); });
'
