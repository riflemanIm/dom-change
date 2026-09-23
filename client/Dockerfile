FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY client client
ARG NEXT_PUBLIC_API_URL=https://domobmen.ru/api/v1
ARG NEXT_PUBLIC_REALTIME_URL=https://domobmen.ru/realtime
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_REALTIME_URL=$NEXT_PUBLIC_REALTIME_URL
RUN npm run build --workspace client

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/client/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/client/.next/static ./client/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/client/public ./client/public

USER nextjs
EXPOSE 3000
CMD ["node", "client/server.js"]
