# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app
COPY . .
RUN mkdir -p apps/web/public
ENV NODE_OPTIONS=--max-old-space-size=4096 LEDGERBYTE_NEXT_BUILD_CPUS=1 LEDGERBYTE_CONTAINER_BUILD=true NEXT_TELEMETRY_DISABLED=1
# Only the public routing prefix is compiled into the browser. No database,
# SMTP, Stripe, storage, JWT, or migration secret is supplied to this build.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=4
RUN pnpm --workspace-concurrency=1 --filter @ledgerbyte/web... build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=640
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone/ ./
COPY --from=build --chown=node:node /app/apps/web/.next/static/ ./apps/web/.next/static/
COPY --from=build --chown=node:node /app/apps/web/public/ ./apps/web/public/
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
