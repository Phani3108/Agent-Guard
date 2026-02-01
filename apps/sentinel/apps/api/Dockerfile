FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN corepack enable
COPY ../../package.json ../../pnpm-workspace.yaml ../../turbo.json ../../tsconfig.base.json ./
COPY ../../packages ./packages
COPY ./package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile || true

FROM base AS build
RUN corepack enable
COPY --from=deps /app /app
COPY . ./
RUN pnpm -C ../../packages/shared build && pnpm build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json ./package.json
CMD ["node", "dist/src/main.js"]

