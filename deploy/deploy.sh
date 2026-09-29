#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <image-tag>" >&2
  exit 64
fi

cd "$(dirname "$0")/.."
[[ -f .env.production ]] || { echo ".env.production is missing" >&2; exit 1; }

image_tag="$1"
previous_tag="$(cat .deployed-image-tag 2>/dev/null || true)"
export IMAGE_TAG="$image_tag"
compose=(docker compose --env-file .env.production -f compose.production.yaml)

"${compose[@]}" config --quiet
"${compose[@]}" pull
"${compose[@]}" up -d postgres redis rustfs mailpit
"${compose[@]}" run --rm server npx prisma migrate deploy
"${compose[@]}" up -d --remove-orphans

healthy=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error https://domobmen.ru/api/v1/health >/dev/null; then
    healthy=true
    break
  fi
  sleep 5
done

if [[ "$healthy" != true ]]; then
  "${compose[@]}" ps
  "${compose[@]}" logs --tail=150 server client caddy
  if [[ -n "$previous_tag" ]]; then
    echo "Health check failed; rolling application containers back to $previous_tag" >&2
    export IMAGE_TAG="$previous_tag"
    "${compose[@]}" up -d client server
  fi
  exit 1
fi

# Keep manual `docker compose up` aligned with the image verified by this deployment.
if grep -q '^IMAGE_TAG=' .env.production; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${image_tag}/" .env.production
else
  printf 'IMAGE_TAG=%s\n' "$image_tag" >> .env.production
fi
printf '%s\n' "$image_tag" > .deployed-image-tag
docker image prune -f
echo "Deployment $image_tag is healthy"
