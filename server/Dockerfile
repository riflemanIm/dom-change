FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY server server
RUN npm run prisma:generate --workspace server \
  && npm run build --workspace server

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app/server
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma

USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
