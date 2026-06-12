# Multi-stage Dockerfile for new-horizon-platform
# Stage 1: Dependencies (caching layer)
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN npm ci --frozen-lockfile || npm install

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production runtime (minimal)
FROM node:20-alpine AS runtime
WORKDIR /app

# Install lightweight HTTP server for SPA
RUN npm install -g serve@latest

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 && \
    chown -R appuser:nodejs /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5173', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 5173

# Start SPA server
CMD ["serve", "-s", "dist", "-l", "5173"]
