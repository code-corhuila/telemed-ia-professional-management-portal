# Stage 1: build
FROM node:22-alpine AS build
WORKDIR /app

# Increase npm timeouts and retries to tolerate slower networks.
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist/professional/browser/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --spider -q http://127.0.0.1:80/remoteEntry.json || exit 1

CMD ["nginx", "-g", "daemon off;"]