# Production deployment: domchange.ru

Target infrastructure:

- domain: `domchange.ru` (NIC.RU);
- files endpoint: `files.domchange.ru`;
- VPS: `194.169.163.240` (RU VDS, Saint Petersburg);
- resources: 2 CPU, 4 GB RAM, 50 GB SSD RAID;
- repository: `riflemanIm/dom-change`;
- images: GitHub Container Registry.

## Migrating the existing VPS from domobmen.ru

Keep the Docker project name, database name, storage buckets and `/opt/domobmen` directory unchanged. They are internal identifiers and renaming them would detach existing data volumes. After the three A records for `@`, `www` and `files` point to `194.169.163.240`:

1. Upload `compose.production.yaml`, `Caddyfile` and `deploy/` to `/opt/domobmen` as shown in section 4.
2. Run `bash deploy/switch-domain.sh` in `/opt/domobmen`. It backs up `.env.production`, changes only public URLs and the email display name, and preserves the existing Gmail credentials and database secrets. Do not rerun `init-production-env.sh` on an existing server.
3. Recreate the runtime services with `docker compose --env-file .env.production -f compose.production.yaml up -d --no-deps --force-recreate server rustfs caddy`. Caddy issues certificates for the new names automatically after DNS is visible.
4. Deploy an image built with the new `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_REALTIME_URL` through CI. The old client image contains the old domain at build time, so updating `.env.production` alone is insufficient.
5. Verify the API, pages, uploads, account email and password-reset link on `domchange.ru`. The Caddy configuration redirects the former site domain and continues serving old signed file links.

The existing `SMTP_USER` and `SMTP_PASSWORD` remain the personal Gmail credentials; do not change the sender address to `@domchange.ru` without configuring a real mailbox and its DNS records.

## 0. Reinstall the operating system

The VPS was created from an Ubuntu 20.04 template. Ubuntu 20.04 has left standard support. Before storing any data, reinstall the server from the RU VDS panel using Ubuntu 24.04 LTS. The commands below assume Ubuntu 24.04.

## 1. Configure NIC.RU DNS

Create three `A` records:

| Host | Value |
| --- | --- |
| `@` | `194.169.163.240` |
| `www` | `194.169.163.240` |
| `files` | `194.169.163.240` |

Remove conflicting `A` records and remove `AAAA` records unless IPv6 is configured on this VPS.

Verify from the local machine:

```bash
dig +short domchange.ru
dig +short www.domchange.ru
dig +short files.domchange.ru
```

All three commands must return `194.169.163.240` before the first deployment. Caddy cannot obtain TLS certificates until DNS is correct.

## 2. Bootstrap the VPS

Connect with the SSH key selected in the RU VDS panel:

```bash
ssh root@194.169.163.240
```

Update the system and add basic tools:

```bash
apt update
apt upgrade -y
apt install -y ca-certificates curl git openssl ufw fail2ban
```

Create 2 GB swap:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Install Docker from the official repository:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker run --rm hello-world
```

Open only SSH and web traffic:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Ports for PostgreSQL, Redis, RustFS, Mailpit, Next.js and NestJS are not published publicly.

## 3. Create the deployment user

```bash
adduser --disabled-password --gecos '' deploy
usermod -aG docker deploy
install -d -m 755 -o deploy -g deploy /opt/domobmen
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

Create a dedicated key on the local computer. Do not reuse the notebook key for automation:

```bash
ssh-keygen -t ed25519 -C github-actions-domobmen -f ~/.ssh/domobmen_deploy
scp ~/.ssh/domobmen_deploy.pub root@194.169.163.240:/tmp/domobmen_deploy.pub
```

On the VPS:

```bash
install -m 600 -o deploy -g deploy /tmp/domobmen_deploy.pub /home/deploy/.ssh/authorized_keys
rm /tmp/domobmen_deploy.pub
```

Verify from the local computer:

```bash
ssh -i ~/.ssh/domobmen_deploy deploy@194.169.163.240
```

## 4. Upload the initial deployment files

From the repository on the local computer:

```bash
tar -czf - compose.production.yaml Caddyfile deploy \
  | ssh -i ~/.ssh/domobmen_deploy deploy@194.169.163.240 \
      'tar -xzf - -C /opt/domobmen'
```

Generate production secrets directly on the VPS:

```bash
ssh -i ~/.ssh/domobmen_deploy deploy@194.169.163.240
cd /opt/domobmen
bash deploy/init-production-env.sh
```

The script creates `/opt/domobmen/.env.production` with mode `600`. Save `SEED_ADMIN_PASSWORD` in a password manager:

```bash
grep '^SEED_ADMIN_PASSWORD=' /opt/domobmen/.env.production
```

Never commit or paste this file into chat.

## 5. Configure GitHub Container Registry access

The workflow publishes images using the repository `GITHUB_TOKEN`. If the GHCR packages remain private, create a GitHub classic PAT with only `read:packages`, then log in once on the VPS as `deploy`:

```bash
echo 'READ_PACKAGES_PAT' | docker login ghcr.io --username riflemanIm --password-stdin
```

If both packages are made public, this login is not required.

## 6. Configure GitHub Actions secrets

Open `riflemanIm/dom-change` → Settings → Secrets and variables → Actions and add:

- `DEPLOY_HOST`: `194.169.163.240`
- `DEPLOY_USER`: `deploy`
- `DEPLOY_SSH_KEY`: full contents of `~/.ssh/domobmen_deploy`
- `DEPLOY_KNOWN_HOSTS`: trusted host-key line for `194.169.163.240`

Obtain the host-key line locally after verifying the VPS fingerprint in the RU VDS panel:

```bash
ssh-keyscan -H 194.169.163.240
```

Create the GitHub Environment named `production` and allow deployments only from `main`.

## 7. First deployment

Commit and push the deployment files to `main`. The workflow will:

1. install dependencies;
2. generate Prisma Client;
3. run lint, unit tests and both builds;
4. build the client and server images;
5. push SHA and `latest` tags to GHCR;
6. upload deployment configuration over SSH;
7. pull images on the VPS;
8. run `prisma migrate deploy`;
9. start the stack;
10. verify `https://domchange.ru/api/v1/health`.

Watch the run under GitHub → Actions → CI and deploy.

## 8. Seed the empty database once

After the first successful deployment only:

```bash
ssh -i ~/.ssh/domobmen_deploy deploy@194.169.163.240
cd /opt/domobmen
set -a
. ./.env.production
set +a

docker compose --env-file .env.production -f compose.production.yaml \
  run --rm server npx tsx prisma/seed.ts
```

Do not add seeding to every deployment. Migrations run automatically; seed data does not.

## Real email delivery

Mailpit is available for local testing, but it does not deliver messages to real mailboxes. Production rejects Mailpit for account emails with HTTP 503 instead of falsely reporting that an email was sent.

Production currently sends through the owner's personal Gmail account. Keep its authenticated SMTP settings in `/opt/domobmen/.env.production` (mode 600) when changing the site domain. The sender address remains Gmail until a mailbox on `domchange.ru` is configured separately:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=oleglambin@gmail.com
SMTP_PASSWORD=<Google application password>
SMTP_FROM='"DomChange" <oleglambin@gmail.com>'
```

The `SMTP_FROM` address must be permitted for the authenticated mailbox. Never commit or paste the application password into a support chat.

Recreate only the application server, leaving PostgreSQL and other volumes intact:

```bash
cd /opt/domobmen
docker compose --env-file .env.production -f compose.production.yaml up -d --no-deps --force-recreate server
docker compose --env-file .env.production -f compose.production.yaml logs --tail=80 server
```

Request a password reset for an existing test account, check the external mailbox (including spam), and follow the reset link. If delivery fails, inspect server logs without printing the SMTP password. An SMTP acceptance alone does not prove inbox delivery; configure the provider's DKIM records as well.

Do **not** run an open SMTP relay on this VPS. Direct delivery from `194.169.163.240` currently lacks reverse DNS (PTR), and the domain's SPF authorizes RU-CENTER mail servers. A self-hosted mail server would additionally need PTR, SPF/DKIM/DMARC, TLS, reputation monitoring, and abuse protection.

## Temporary site gate

Set `BASIC_AUTH_HASH` in `/opt/domobmen/.env.production` to a bcrypt hash generated with
`caddy hash-password` (the command reads the plaintext password from stdin). The site
requires HTTP Basic Auth for pages and static assets. `/api/*`, realtime endpoints,
and `files.domchange.ru` remain outside this gate so JWT API requests, WebSockets,
and signed S3 uploads continue to work. This is not a substitute for application
authentication or firewall rules.

## 9. Verify the application

```bash
curl --fail https://domchange.ru/api/v1/health
docker compose --env-file .env.production -f compose.production.yaml ps
```

Browser checks:

- `https://domchange.ru`;
- registration and login;
- `https://files.domchange.ru/health`;
- avatar and property photo upload;
- exchange chat and realtime notifications;
- admin moderation and points adjustment.

Open Mailpit without publishing it to the internet:

```bash
ssh -i ~/.ssh/domobmen_deploy -L 8025:127.0.0.1:8025 deploy@194.169.163.240
```

Then visit `http://localhost:8025` locally.

Open the RustFS console similarly:

```bash
ssh -i ~/.ssh/domobmen_deploy -L 9001:127.0.0.1:9001 deploy@194.169.163.240
```

Then visit `http://localhost:9001/rustfs/console/index.html` locally.

## 10. Operations

View logs:

```bash
cd /opt/domobmen
docker compose --env-file .env.production -f compose.production.yaml logs -f --tail=200
```

Restart one service:

```bash
docker compose --env-file .env.production -f compose.production.yaml restart server
```

Manual redeploy of the current image tag:

```bash
bash deploy/deploy.sh latest
```

Back up PostgreSQL daily and copy backups off the VPS. RustFS data also needs an off-server backup. Docker volumes on the same VPS are not a backup.
