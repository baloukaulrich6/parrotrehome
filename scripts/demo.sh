#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
test -f node_modules/next/dist/bin/next || { echo 'Install dependencies with bun install --frozen-lockfile first.' >&2; exit 1; }
export DEMO_ENABLED=true
export MAIL_TRANSPORT=preview
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
if [ -z "${NEXTAUTH_SECRET:-}" ]; then
  NEXTAUTH_SECRET=$(node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')
  export NEXTAUTH_SECRET
fi
# /demo is a self-contained simulation. No database reset or external email.
exec node node_modules/next/dist/bin/next dev -p 3000
