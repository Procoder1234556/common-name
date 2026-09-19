# Common Name — production container (optional; Render Blueprint uses native Node)

FROM node:22.14-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
ENV HUSKY=0
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
# Bake fixture index into image — never download OGD / never scrape MCA in build
RUN pnpm db:fixture && pnpm build

FROM node:22.14-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HUSKY=0
ENV CONFIRM_OGD_DOWNLOAD=no
ENV COMPANIES_DB_DRIVER=sqljs
ENV COMPANIES_DB_PATH=./data/companies.sqlite
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
# Render injects PORT; Next binds via env. Host must be 0.0.0.0.
CMD ["pnpm", "start"]
