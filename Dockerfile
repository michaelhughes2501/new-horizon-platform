# Multi-stage Dockerfile for new-horizon-platform - Use pre-built dist
FROM node:20-alpine AS runtime
WORKDIR /app

# Install lightweight HTTP server for SPA
RUN npm install -g serve@latest

# Copy pre-built artifacts
COPY dist ./dist

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
