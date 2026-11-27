# Multi-architecture upstream images; deliberately no platform override.
FROM node:22.18.0-alpine3.22 AS build
WORKDIR /app
# Standard-library archive/submission and hosting checks; build stage only.
RUN apk add --no-cache python3
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
# Includes whole-catalogue, README and signed-history validation. No plugin code runs.
RUN npm test && npm run build

FROM nginx:1.28.0-alpine
COPY hosting/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /srv/site/
USER 101:101
EXPOSE 8080
# Bypass the upstream entrypoint: no runtime config mutation or root setup.
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
