# The learn API (NestJS, Node 26) with the course content it loads into its database.
# Built from sonic-hub-learn/: docker build -f deploy/api.Dockerfile .
# Railway (service sonic-hub-learn-api): root directory /sonic-hub-learn, RAILWAY_DOCKERFILE_PATH=deploy/api.Dockerfile,
# pre-deploy command `node /app/api/dist/cli/content.js sync --media b2` (checks the content, uploads its media to B2,
# loads it into the database; a content error stops the deploy and the running version stays).
FROM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace @learn/shared --workspace @learn/api --include-workspace-root --no-audit --no-fund
COPY shared shared
COPY api api
RUN npm run build -w @learn/shared && npm run build -w @learn/api

FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --omit=dev --workspace @learn/shared --workspace @learn/api --include-workspace-root --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/api/dist api/dist
COPY api/drizzle api/drizzle
COPY content content
WORKDIR /app/api
USER node
EXPOSE 8080
CMD ["node", "dist/main.js"]
