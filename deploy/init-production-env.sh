#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

cd "$(dirname "$0")/.."
if [[ -e .env.production ]]; then
  echo ".env.production already exists; refusing to overwrite it" >&2
  exit 1
fi

postgres_password="$(openssl rand -hex 24)"
jwt_access_secret="$(openssl rand -base64 48 | tr -d '\n')"
jwt_refresh_secret="$(openssl rand -base64 48 | tr -d '\n')"
s3_secret="$(openssl rand -hex 32)"
admin_password="$(openssl rand -base64 24 | tr -d '\n')"

cat > .env.production <<EOF
COMPOSE_PROJECT_NAME=domobmen
APP_DOMAIN=domobmen.ru
FILES_DOMAIN=files.domobmen.ru
ACME_EMAIL=oleglambin@gmail.com
BASIC_AUTH_HASH=
SERVER_IP=194.169.163.240
CLIENT_IMAGE=ghcr.io/riflemanim/dom-change-client
SERVER_IMAGE=ghcr.io/riflemanim/dom-change-server
IMAGE_TAG=latest
APP_NAME=DomObmen
POINTS_NAME=ДомБаллы
NODE_ENV=production
PORT=4000
APP_URL=https://domobmen.ru
PUBLIC_API_URL=https://domobmen.ru/api/v1
API_URL=https://domobmen.ru
NEXT_PUBLIC_API_URL=https://domobmen.ru/api/v1
NEXT_PUBLIC_REALTIME_URL=https://domobmen.ru/realtime
CORS_ORIGINS=https://domobmen.ru,https://www.domobmen.ru
TRUST_PROXY=true
INCLUDE_FAKE_PROPERTIES=true
POSTGRES_DB=domobmen
POSTGRES_USER=domobmen
POSTGRES_PASSWORD=${postgres_password}
DATABASE_URL=postgresql://domobmen:${postgres_password}@postgres:5432/domobmen?schema=public
REDIS_URL=redis://redis:6379
JWT_ACCESS_SECRET=${jwt_access_secret}
JWT_REFRESH_SECRET=${jwt_refresh_secret}
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://files.domobmen.ru
S3_REGION=us-east-1
S3_ACCESS_KEY=domobmen
S3_SECRET_KEY=${s3_secret}
S3_BUCKET_PUBLIC=domobmen-public
S3_BUCKET_PRIVATE=domobmen-private
SMTP_HOST=mailpit
SMTP_PORT=1025
SMS_PROVIDER=log
SEED_ADMIN_EMAIL=oleglambin@gmail.com
SEED_ADMIN_PASSWORD=${admin_password}
POINTS_WELCOME_BONUS=500
POINTS_EMAIL_VERIFICATION_BONUS=100
POINTS_PHONE_VERIFICATION_BONUS=200
POINTS_PROFILE_COMPLETION_BONUS=200
POINTS_HOST_REWARD_DELAY_HOURS=24
BONUS_EXPIRATION_DAYS=180
EOF

chmod 600 .env.production
printf '%s\n' ".env.production created for domobmen.ru"
printf '%s\n' "Save the generated SEED_ADMIN_PASSWORD from $(pwd)/.env.production in a password manager."
