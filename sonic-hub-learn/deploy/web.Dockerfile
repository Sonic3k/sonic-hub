# The Ôn Bài web: a static Vite build served by Caddy (any path falls back to index.html).
# Built from sonic-hub-learn/: docker build -f deploy/web.Dockerfile --build-arg VITE_API_URL=https://… .
# Railway (service sonic-hub-learn-web): root directory /sonic-hub-learn, RAILWAY_DOCKERFILE_PATH=deploy/web.Dockerfile,
# variable VITE_API_URL = the learn API's public address.
FROM node:26-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY api/package.json api/
COPY web/package.json web/
RUN npm ci --workspace @learn/shared --workspace @learn/web --include-workspace-root --no-audit --no-fund
COPY shared shared
COPY web web
# the API's public address, baked into the bundle
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL is not set: the web would not find its API" >&2; exit 1)
RUN npm run build -w @learn/shared && npm run build -w @learn/web

FROM caddy:2.11-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/web/dist /srv
