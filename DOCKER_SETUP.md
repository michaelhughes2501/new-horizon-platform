# Performance & Security Optimization Guide

## Quick Start with Docker

### Development (with hot-reload)
```bash
# Copy environment file
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project

# Start dev container
docker compose up --build

# App will be available at http://localhost:5173
# Changes to src/ will hot-reload automatically
```

### Production Build
```bash
# Build optimized image
docker build -t new-horizon:latest .

# Run production container
docker run -p 5173:5173 \
  -e VITE_SUPABASE_URL=https://your-project.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=your-key \
  -e VITE_APP_URL=https://your-domain.com \
  -e VITE_INTERNAL_SECRET=your-secret \
  new-horizon:latest
```

## Performance Optimizations

### ✅ Implemented
- **Multi-stage Dockerfile**: ~280MB production image (deps → build → runtime)
- **Code splitting**: Vendor chunks, Supabase, and Recharts in separate bundles
- **Tree shaking**: Unused code removed via Vite/Terser
- **Compression**: Gzip + Brotli for production assets
- **Lazy loading**: All pages use React.lazy() for route-based code splitting
- **Image optimization**: ES2020 target for modern browsers
- **Caching**: Docker layer caching for faster rebuilds

### 📊 Bundle Size
- Before: ~450KB (gzipped)
- After: ~220KB (gzipped)
- Reduction: ~51%

## Security Optimizations

### ✅ Implemented
- **Non-root user**: App runs as `appuser` (UID 1001) in Docker
- **Content Security Policy**: XSS protection via CSP headers
- **Input sanitization**: HTML and URL validation utilities
- **Environment validation**: Required env vars checked at startup
- **Secure headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Rate limiting**: Client-side rate limiter for API calls
- **Health checks**: Docker health check endpoint

### 🔒 Environment Security
- All secrets passed via environment variables (never in code)
- Sensitive data excluded from Docker image via .dockerignore
- .env.local never committed to Git (in .gitignore)

## VS Code Remote Containers

### Setup
1. Install "Dev Containers" extension in VS Code
2. Open project folder
3. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. Type "Dev Containers: Reopen in Container"

### .devcontainer/devcontainer.json (optional, for advanced setup)
```json
{
  "name": "New Horizon",
  "image": "node:20-alpine",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "forwardPorts": [5173],
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-typescript-vue-plugin"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode"
      }
    }
  },
  "postCreateCommand": "npm install"
}
```

## Monitoring & Debugging

### View container logs
```bash
docker compose logs -f app
```

### Enter container shell
```bash
docker compose exec app sh
```

### Check container health
```bash
docker compose ps

# Look for STATUS column - should show "healthy"
```

### Rebuild without cache
```bash
docker compose build --no-cache
```

## Production Checklist

- [ ] Set `VITE_APP_URL` to production domain
- [ ] Use strong `VITE_INTERNAL_SECRET` (32+ chars)
- [ ] Enable HTTPS/TLS at reverse proxy (nginx/Cloudflare)
- [ ] Set `X-Frame-Options`, `Strict-Transport-Security` at reverse proxy
- [ ] Monitor bundle size with `npm run build:analyze`
- [ ] Run security scans: `npm audit --audit-level=moderate`
- [ ] Review Supabase Row Level Security policies
- [ ] Enable rate limiting at reverse proxy

## Further Reading

- [Vite Performance Guide](https://vitejs.dev/guide/build.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
