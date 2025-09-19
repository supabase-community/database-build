FROM node:22-alpine

RUN corepack enable

WORKDIR /app

COPY --link package.json ./
COPY --link src/ ./src/

RUN pnpm install --frozen-lockfile || pnpm install

EXPOSE 443
EXPOSE 5432

CMD ["node", "--experimental-strip-types", "src/index.ts"]