FROM node:24-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:24-slim AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY .npmrc pnpm-workspace.yaml package.json pnpm-lock.yaml ./

ENV NODE_ENV=production \
    PORT=3000 \
    HUSKY=0

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/drizzle /app/drizzle
COPY --from=builder /app/public /app/public

RUN groupadd -g 1001 nodejs \
    && useradd -u 1001 -g nodejs -s /bin/sh -m nuxtjs

RUN chown -R nuxtjs:nodejs /app

USER nuxtjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", ".output/server/index.mjs"]
