# Production deployment: domobmen.ru

Target infrastructure:

- domain: `domobmen.ru` (NIC.RU);
- files endpoint: `files.domobmen.ru`;
- VPS: `194.169.163.240` (RU VDS, Saint Petersburg);
- resources: 2 CPU, 4 GB RAM, 50 GB SSD RAID;
- repository: `riflemanIm/dom-change`;
- images: GitHub Container Registry.

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
dig +short domobmen.ru
dig +short files.domobmen.ru
```

Both commands must return `194.169.163.240` before the first deployment. Caddy cannot obtain TLS certificates until DNS is correct.

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
10. verify `https://domobmen.ru/api/v1/health`.

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

The initial production configuration uses Mailpit. It captures verification and password-reset emails but does not deliver them to real mailboxes. Production now rejects this configuration with HTTP 503 instead of falsely reporting that an email was sent.

For `domobmen.ru`, prefer an authenticated mailbox at RU-CENTER: the domain's MX and SPF already point to `nicmail.ru`. Obtain the **outgoing SMTP server name**, port, username and password from that mailbox's settings. Do not assume that the incoming MX hostname is the outgoing SMTP server. Set these values in `/opt/domobmen/.env.production` (mode 600):

```dotenv
SMTP_HOST=<outgoing SMTP hostname from mail provider>
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@domobmen.ru
SMTP_PASSWORD=<mailbox password or application password>
SMTP_FROM="DomObmen" <noreply@domobmen.ru>
```

If the provider specifies port 587 instead, use `SMTP_PORT=587` and `SMTP_SECURE=false` (STARTTLS is required by the app). The `SMTP_FROM` address must be permitted for the authenticated mailbox. Never commit or paste the password into a support chat.

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
and `files.domobmen.ru` remain outside this gate so JWT API requests, WebSockets,
and signed S3 uploads continue to work. This is not a substitute for application
authentication or firewall rules.

## 9. Verify the application

```bash
curl --fail https://domobmen.ru/api/v1/health
docker compose --env-file .env.production -f compose.production.yaml ps
```

Browser checks:

- `https://domobmen.ru`;
- registration and login;
- `https://files.domobmen.ru/health`;
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
