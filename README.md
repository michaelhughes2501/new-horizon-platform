# New Horizon

**Community platform for returning citizens** — built with dignity.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in your Supabase URL and anon key

# 3. Set up database
# Supabase Dashboard → SQL Editor → paste supabase/migrations/001_complete_schema.sql → Run

# 4. Start
npm run dev
```

Demo login: `demo@newhorizon.com` / `demo123`

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Mobile**: React Native + Expo (see `/mobile`)
- **Push Notifications**: Expo Push + VAPID (web)

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI assistant context — full architecture guide |
| `supabase/migrations/001_complete_schema.sql` | Complete database schema |
| `src/lib/api/index.ts` | All database API wrappers |
| `src/lib/security/index.ts` | Security utilities |
| `src/styles/tokens.ts` | Design system tokens |

## Security

- Passwords hashed with bcrypt (via Supabase Auth)
- Row Level Security on every table
- Rate limiting (client + server-side)
- Input sanitization against XSS and injection
- Immutable audit logs for all admin and security events

See `docs/SECURITY.md` for full details.

## Structure

See `CLAUDE.md` for the full directory structure and conventions.

## License

Private — all rights reserved.
