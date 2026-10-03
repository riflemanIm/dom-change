#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

cd "$(dirname "$0")/.."
[[ -f .env.production ]] || { echo ".env.production is missing" >&2; exit 1; }

current_domain="$(sed -n 's/^APP_DOMAIN=//p' .env.production | head -n 1)"
if [[ "$current_domain" != domobmen.ru && "$current_domain" != domchange.ru ]]; then
  echo "Unexpected APP_DOMAIN: $current_domain" >&2
  exit 1
fi

backup=".env.production.before-domchange-$(date +%Y%m%d%H%M%S)"
cp -p .env.production "$backup"

set_value() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env.production; then
    sed -i "s#^${key}=.*#${key}=${value}#" .env.production
  else
    printf '%s=%s\n' "$key" "$value" >> .env.production
  fi
}

set_value APP_DOMAIN domchange.ru
set_value FILES_DOMAIN files.domchange.ru
set_value APP_NAME DomChange
set_value APP_URL https://domchange.ru
set_value PUBLIC_API_URL https://domchange.ru/api/v1
set_value API_URL https://domchange.ru
set_value NEXT_PUBLIC_API_URL https://domchange.ru/api/v1
set_value NEXT_PUBLIC_REALTIME_URL https://domchange.ru/realtime
set_value CORS_ORIGINS https://domchange.ru,https://www.domchange.ru
set_value S3_PUBLIC_ENDPOINT https://files.domchange.ru
set_value SMTP_FROM "'\"DomChange\" <oleglambin@gmail.com>'"

if ! docker compose --env-file .env.production -f compose.production.yaml config --quiet; then
  cp -p "$backup" .env.production
  echo "Compose validation failed; restored .env.production from $backup" >&2
  exit 1
fi

echo "Domain settings updated. Previous environment saved in $backup"
