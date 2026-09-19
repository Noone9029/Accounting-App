# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS toolchain
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM toolchain AS build
COPY . .
# The build runs one workspace/compiler process at a time. Builders must also
# apply the documented external CPU and memory ceiling to this operation.
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=4
RUN pnpm --filter @ledgerbyte/api db:generate
RUN pnpm --workspace-concurrency=1 --filter @ledgerbyte/api... build
RUN pnpm --filter @ledgerbyte/api deploy --legacy --prod /runtime/api
RUN node infra/docker/copy-prisma-client.cjs /app/apps/api/package.json /runtime/api/package.json

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production API_PORT=4000 NODE_OPTIONS=--max-old-space-size=640
WORKDIR /app
COPY --from=build --chown=node:node /runtime/api/ ./
USER node
EXPOSE 4000
# The worker uses this same image with a different command. Neither command
# runs a migration, seed, or provider setup at startup.
CMD ["node", "dist/apps/api/src/main.js"]
