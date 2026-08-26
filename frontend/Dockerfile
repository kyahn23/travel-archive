# Multi-stage build for Next.js frontend
# Stage 1: Build
FROM node:20-alpine AS builder

ARG API_ORIGIN=http://travel-archive-backend:8080
ARG APP_VERSION=local
ENV API_ORIGIN=$API_ORIGIN

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run with minimal runtime
FROM node:20-alpine

ARG APP_VERSION=local
LABEL org.opencontainers.image.revision=$APP_VERSION

WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Copy standalone output (requires output: 'standalone' in next.config)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
