#!/usr/bin/env bash
# Run ON the VPS, from the complete project checkout.
set -Eeuo pipefail
umask 077
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
domain=parrotrehome.com
email=''
admin_email=''
plan=false
while (($#)); do
  case "$1" in
    --domain|--email|--admin-email)
      (($# >= 2)) || die "Missing value for $1"
      case "$1" in
        --domain) domain=${2,,} ;;
        --email) email=$2 ;;
        --admin-email) admin_email=$2 ;;
      esac
      shift 2 ;;
    --plan) plan=true; shift ;;
    --help|-h)
      echo 'sudo bash scripts/deploy-vps.sh --email owner@example.com --admin-email admin@example.com [--domain parrotrehome.com] [--plan]'
      echo 'Run on Ubuntu/Debian VPS. Requires project files, DNS pointing to VPS and ports 80/443 free. Mail defaults to preview; live delivery requires explicit server configuration.'
      exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done
[[ ${#domain} -le 253 && $domain =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]([a-z0-9-]*[a-z0-9])?$ ]] || die 'Invalid domain.'
for address in "$email" "$admin_email"; do
  [[ $address =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || die 'Provide valid --email and --admin-email.'
done
source_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
[[ -f "$source_dir/deploy/compose.yaml" && -f "$source_dir/bun.lock" ]] || die 'The complete ParrotRehome checkout is required.'
if $plan; then
  printf 'Source: %s\nDomain: %s\nCertificate contact: %s\nAdministrator: %s\n' "$source_dir" "$domain" "$email" "$admin_email"
  echo 'Docker Compose: initialize database/admin → app → Caddy HTTPS. Persistent volumes: data, caddy_data, caddy_config.'
  echo 'Credentials: /etc/parrotrehome. No demo seed or real outgoing email. No machine changes made.'
  exit 0
fi
((EUID == 0)) || die 'Run with sudo on the VPS.'
[[ -d /run/systemd/system ]] || die 'A systemd Ubuntu/Debian VPS is required.'
. /etc/os-release
[[ $ID == ubuntu || $ID == debian ]] || die 'Only Ubuntu/Debian are supported.'
exec 9>/var/lock/parrotrehome-deploy.lock
flock -n 9 || die 'Another deployment is running.'
trap 'echo "Deployment failed; data retained. See Docker Compose logs with the command in docs/docker-vps.md." >&2' ERR
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg openssl
if ! command -v docker >/dev/null; then
  install -d -m 755 /etc/apt/keyrings
  curl --fail --silent --show-error --location "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/parrotrehome-docker.asc
  chmod 644 /etc/apt/keyrings/parrotrehome-docker.asc
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/parrotrehome-docker.asc] https://download.docker.com/linux/%s %s stable\n' "$(dpkg --print-architecture)" "$ID" "$VERSION_CODENAME" >/etc/apt/sources.list.d/parrotrehome-docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker compose version >/dev/null || die 'Install the Compose plugin for your existing Docker installation.'
systemctl enable --now docker
config_dir=/etc/parrotrehome
install -d -m 700 "$config_dir"
marker='# Managed by parrotrehome Docker deployment'
for file in compose.env runtime.env; do
  if [[ -e "$config_dir/$file" ]] && ! head -n 1 "$config_dir/$file" | grep -Fxq "$marker"; then
    die "Unmanaged $config_dir/$file exists; reconcile it before deploying."
  fi
done
if [[ ! -f "$config_dir/compose.env" ]]; then
  printf '%s\n' "$marker" "DOMAIN=$domain" "CERT_EMAIL=$email" "ADMIN_EMAIL=$admin_email" >"$config_dir/compose.env"
else
  grep -Fxq "DOMAIN=$domain" "$config_dir/compose.env" || die 'Domain changed; update configuration deliberately first.'
  grep -Fxq "ADMIN_EMAIL=$admin_email" "$config_dir/compose.env" || die 'Administrator changed; existing accounts are never replaced automatically.'
fi
if [[ ! -f "$config_dir/runtime.env" ]]; then
  secret=$(openssl rand -hex 32)
  printf '%s\n' "$marker" 'DATABASE_URL=file:/data/app.db' "NEXTAUTH_URL=https://$domain" "NEXTAUTH_SECRET=$secret" 'MEDIA_DIR=/data/media' 'EMAIL_TEMPLATES_FILE=/data/email-templates.json' 'MAIL_TRANSPORT=preview' 'PAYMENT_EMAIL_LABEL=CHMK' 'DEMO_ENABLED=false' >"$config_dir/runtime.env"
  unset secret
fi
if [[ ! -f "$config_dir/admin_password" ]]; then
  [[ -r /dev/tty ]] || die 'First deployment requires an interactive SSH terminal.'
  read -r -s -p 'Initial administrator password (12 characters minimum): ' password </dev/tty
  printf '\n'
  read -r -s -p 'Confirm password: ' confirmation </dev/tty
  printf '\n'
  [[ ${#password} -ge 12 && $password == "$confirmation" ]] || die 'Passwords differ or are too short.'
  printf '%s' "$password" >"$config_dir/admin_password"
  unset password confirmation
fi
chmod 600 "$config_dir"/compose.env "$config_dir"/runtime.env "$config_dir"/admin_password
cd "$source_dir"
compose=(docker compose --env-file "$config_dir/compose.env" -f deploy/compose.yaml)
"${compose[@]}" config --quiet
# Do not replace another site's proxy or stop an unrelated Nginx installation.
if [[ -z $("${compose[@]}" ps -q proxy) ]] && command -v ss >/dev/null; then
  [[ -z $(ss -H -ltn '( sport = :80 or sport = :443 )') ]] || die 'Ports 80/443 are already occupied. Review the existing proxy before using Docker Caddy.'
fi
"${compose[@]}" --profile setup build --pull
"${compose[@]}" pull proxy
# Build failures leave the old app running. Stop only this project for backup/init.
"${compose[@]}" stop app
if ! "${compose[@]}" run --rm --no-deps init; then
  "${compose[@]}" start app || true
  die 'Database initialization failed; previous app restarted when available.'
fi
"${compose[@]}" up -d --no-deps app proxy
ready=false
for attempt in {1..30}; do
  if "${compose[@]}" exec -T app node -e 'fetch("http://127.0.0.1:3000/api/payment-methods").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then
    ready=true; break
  fi
  sleep 2
done
$ready || die 'Database-backed application health check failed.'
curl --fail --silent --show-error --resolve "$domain:443:127.0.0.1" --retry 6 --retry-delay 5 --retry-all-errors --max-time 15 "https://$domain/api/payment-methods" >/dev/null
curl --fail --silent --show-error --retry 6 --retry-delay 5 --retry-all-errors --max-time 15 "https://$domain/api/payment-methods" >/dev/null
printf '\nSite: https://%s\nAdmin: https://%s/admin\nAccount: %s\nConfigure catalog, delivery areas and payment provider before accepting orders.\n' "$domain" "$domain" "$admin_email"

"${compose[@]}" exec -T app node -e 'console.log("Email transport: " + (process.env.MAIL_TRANSPORT || "preview") + "; Resend API key: " + (process.env.RESEND_API_KEY ? "configured" : "not configured") + ". Verify delivery with a test request.");'
