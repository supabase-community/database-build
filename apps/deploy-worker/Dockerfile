FROM node:22-alpine AS base

# Enable corepack and prepare pnpm
RUN corepack enable

FROM base AS builder

WORKDIR /app

COPY . .

# Generate a partial monorepo with a pruned lockfile for a target workspace using turbo via pnpm dlx
RUN pnpm dlx turbo prune @database.build/deploy-worker --docker

FROM base AS installer
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
RUN pnpm install --frozen-lockfile || pnpm install

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm dlx turbo run build --filter=@database.build/deploy-worker

FROM base AS runner

RUN apk add --no-cache postgresql16-client

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

COPY --from=installer --chown=nodejs:nodejs /app /app

WORKDIR /app/apps/deploy-worker

EXPOSE 443
EXPOSE 5432

CMD ["node", "--experimental-strip-types", "src/index.ts"]