# CLAUDE.md — New Horizon Project Context

> This file is read by Claude (and other AI assistants) to understand the
> full context, architecture, conventions, and rules of this project.
> Keep it updated as the project evolves.

---

## Project Overview

**New Horizon** is a full-stack community platform for returning citizens
(people leaving incarceration). It provides:

- Social connection / dating between community members
- Felony-friendly job board with one-click applications
- Reentry resource directory (parole, mental health, housing, education)
- Sentence calculator using state-specific good-time laws
- Community blog with comments and likes
- Real-time messaging between connected users
- Push notifications (iOS, Android, Web)
- Admin dashboard for content moderation
- End-to-end security (rate limiting, RLS, input sanitization, audit logs)

---

## Tech Stack

| Layer        | Technology                         |
|-------------|-------------------------------------|
| Frontend     | React 18, TypeScript, Vite         |
| Routing      | React Router v6                    |
| Backend/DB   | Supabase (PostgreSQL + Auth)       |
| Realtime     | Supabase Realtime (WebSockets)     |
| Storage      | Supabase Storage                   |
| Edge Fns     | Supabase Edge Functions (Deno)     |
| Push Notifs  | Expo Push Notifications + VAPID    |
| Mobile       | React Native + Expo                |
| Validation   | Zod                                |
| Charts       | Recharts                           |
| Styling      | CSS-in-JS (inline styles + tokens) |
| Deployment   | Vercel (web) + EAS (mobile)        |

---

## Directory Structure

```
new-horizon/
│
├── CLAUDE.md                      ← You are here — AI context file
├── README.md                      ← Human-readable setup guide
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example                   ← Copy to .env.local and fill in values
│
├── src/
│   ├── main.tsx                   ← React entry point
│   ├── App.tsx                    ← Root component + router
│   │
│   ├── components/
│   │   ├── ui/                    ← Shared primitive components
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── SecurityBadge.tsx
│   │   │   └── index.ts           ← Barrel export
│   │   │
│   │   ├── auth/
│   │   │   ├── AuthPage.tsx       ← Login + Register
│   │   │   ├── PasswordStrength.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── AppLayout.tsx
│   │   │
│   │   └── features/
│   │       ├── dashboard/         ← Dashboard page + widgets
│   │       ├── connect/           ← Member discovery + like/connect
│   │       ├── messages/          ← Real-time chat
│   │       ├── jobs/              ← Job board + apply modal + saved jobs
│   │       ├── resources/         ← Parole, mental health, housing, edu
│   │       ├── blog/              ← Posts, comments, likes
│   │       ├── calculator/        ← Sentence calculator
│   │       └── profile/           ← Edit profile, privacy, account
│   │
│   ├── hooks/
│   │   ├── useAuth.ts             ← Auth state + session
│   │   ├── useProfile.ts          ← Current user profile operations
│   │   ├── useConnections.ts      ← Connection CRUD
│   │   ├── useMessages.ts         ← Real-time messaging
│   │   ├── useNotifications.ts    ← Notification state
│   │   ├── useJobs.ts             ← Job board queries
│   │   └── useBlog.ts             ← Blog post queries
│   │
│   ├── lib/
│   │   ├── security/
│   │   │   ├── index.ts           ← Security module (hash, sanitise, rate-limit)
│   │   │   ├── sanitise.ts        ← Input sanitisation + XSS prevention
│   │   │   ├── rateLimit.ts       ← Client-side sliding-window rate limiter
│   │   │   └── audit.ts           ← Audit event logging
│   │   │
│   │   ├── database/
│   │   │   └── supabase.ts        ← Supabase client + typed query helpers
│   │   │
│   │   └── api/
│   │       ├── auth.ts            ← Auth API wrapper
│   │       ├── profiles.ts        ← Profile API wrapper
│   │       ├── jobs.ts            ← Jobs API wrapper
│   │       ├── blog.ts            ← Blog API wrapper
│   │       └── notifications.ts   ← Notifications API wrapper
│   │
│   ├── types/
│   │   ├── database.ts            ← Auto-generated Supabase types (do not edit)
│   │   ├── app.ts                 ← Application-level types
│   │   └── index.ts               ← Barrel export
│   │
│   ├── context/
│   │   ├── AuthContext.tsx        ← Auth state provider
│   │   └── ToastContext.tsx       ← Global toast notifications
│   │
│   └── styles/
│       ├── tokens.ts              ← Design tokens (colors, spacing, fonts)
│       └── global.css             ← Global reset + base styles
│
├── supabase/
│   ├── migrations/
│   │   └── 001_complete_schema.sql  ← SINGLE SOURCE OF TRUTH for DB
│   │
│   └── functions/
│       ├── send-push-notification/
│       │   └── index.ts           ← Expo push via Edge Function
│       ├── moderate-content/
│       │   └── index.ts           ← Content moderation endpoint
│       └── match-algorithm/
│           └── index.ts           ← Member matching logic
│
├── public/
│   ├── manifest.json              ← PWA manifest
│   ├── sw-notifications.js        ← Web push service worker
│   └── icons/                     ← App icons
│
├── docs/
│   ├── SECURITY.md                ← Security architecture docs
│   ├── API.md                     ← API reference
│   └── DEPLOYMENT.md              ← Deploy guide
│
└── scripts/
    ├── generate-types.sh          ← Regenerate Supabase TypeScript types
    └── seed-dev.ts                ← Seed development database
```

---

## Database Schema Summary

All tables live in `supabase/migrations/001_complete_schema.sql`.
**Never edit the database outside that file.** Run migrations via `supabase db push`.

### Core Tables

| Table                  | Purpose                                         |
|------------------------|-------------------------------------------------|
| `profiles`             | User accounts (extends `auth.users`)           |
| `connections`          | Follow/connect relationships between users     |
| `profile_likes`        | Profile like events (auto-triggers connections)|
| `conversations`        | Messaging threads between two users            |
| `messages`             | Individual messages in a conversation          |
| `jobs`                 | Job listings                                   |
| `job_applications`     | User job applications                          |
| `saved_jobs`           | User job bookmarks                             |
| `blog_posts`           | Community blog articles                        |
| `blog_comments`        | Comments on blog posts                         |
| `blog_likes`           | Likes on blog posts                            |
| `resources`            | Reentry resource directory                     |
| `notifications`        | In-app notifications                           |
| `push_tokens`          | Device push notification tokens               |
| `reports`              | User-submitted content reports                 |
| `sentence_calculations`| Audit log of calculator uses                  |
| `security_events`      | Immutable security audit log                   |
| `rate_limit_log`       | Server-side rate limiting records              |
| `admin_audit_log`      | Immutable admin action log                     |

### Key Triggers

| Trigger                     | Table           | What it does                              |
|-----------------------------|-----------------|-------------------------------------------|
| `trg_on_auth_user_created`  | `auth.users`    | Auto-creates profile on signup            |
| `trg_profile_complete`      | `profiles`      | Recalculates profile completion %         |
| `trg_auto_lock`             | `profiles`      | Locks account after 5 failed logins       |
| `trg_prevent_escalation`    | `profiles`      | Blocks role changes without super_admin   |
| `trg_mutual_like`           | `profile_likes` | Auto-connects users on mutual like        |
| `trg_message_insert`        | `messages`      | Updates conversation preview + notifies  |
| `trg_job_application_count` | `job_applications` | Increments job.applications_count     |
| `trg_comments_count`        | `blog_comments` | Updates post.comments_count               |
| `trg_likes_count`           | `blog_likes`    | Updates post.likes_count                  |
| `trg_blog_publish`          | `blog_posts`    | Sets published_at on publish              |
| `trg_blog_slug`             | `blog_posts`    | Auto-generates URL slug from title        |

### Rate Limits (via `fn_check_rate_limit`)

| Action          | Limit | Window     |
|-----------------|-------|------------|
| `connect`       | 20    | 1 hour     |
| `like`          | 50    | 1 hour     |
| `message`       | 30    | 1 minute   |
| `job_apply`     | 5     | 24 hours   |
| `comment`       | 10    | 1 hour     |
| `report`        | 10    | 24 hours   |

---

## Security Architecture

### What is protected and how

1. **Passwords** — Hashed with `pgcrypto` (bcrypt-equivalent). Salt is unique per user. Plaintext never stored or logged.
2. **Sessions** — JWT tokens signed with Supabase secret. Stored in `sessionStorage` (not `localStorage`). Expire after 30 days.
3. **Account lockout** — 5 failed login attempts → 15-minute lockout via DB trigger.
4. **Rate limiting** — Both client-side (sliding window) and server-side (`fn_check_rate_limit` in RLS policies).
5. **Input sanitisation** — All user text is stripped of HTML tags, `javascript:` URIs, null bytes, and excess whitespace before reaching the database.
6. **XSS prevention** — Sanitiser in `src/lib/security/sanitise.ts` runs on every user-provided string.
7. **SQL injection** — Parameterised queries via Supabase SDK. Server-side `fn_moderate_content` also regex-scans for injection patterns.
8. **RLS (Row Level Security)** — Enabled on every table. Users can only read/write their own data. Admins have expanded but scoped access.
9. **Privilege escalation** — DB trigger `trg_prevent_escalation` blocks direct role changes. Use `fn_change_user_role()` which requires `super_admin`.
10. **Content moderation** — Messages and comments are checked against a blocked-word list and threat patterns before insertion.
11. **PII scrubbing** — SSNs and credit card patterns are redacted from messages before storage.
12. **Audit logs** — `security_events` (immutable) and `admin_audit_log` (immutable) record all sensitive events. No UPDATE or DELETE allowed.
13. **Phone numbers** — Only hashed values stored in `phone_hash`. Plaintext phone never persists.
14. **Notifications** — Internal edge function calls are authenticated with a server-side `INTERNAL_SECRET`.

### What NOT to do

- ❌ Never store plaintext passwords, phone numbers, or SSNs in any column
- ❌ Never bypass RLS by using the service role key on the client
- ❌ Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code or `.env` committed to git
- ❌ Never disable RLS on any table without explicit approval
- ❌ Never use `DELETE` or `UPDATE` on `security_events` or `admin_audit_log`
- ❌ Never change user `role` directly via SQL — use `fn_change_user_role()`
- ❌ Never trust client-side rate limiting alone — always validate server-side

---

## Design System

### Color Tokens (`src/styles/tokens.ts`)

```ts
gold:     "#B8975A"   // Primary brand — buttons, accents, active states
goldL:    "#D4B07A"   // Gold light — gradient end
cream:    "#F5F0E8"   // Warm background variant
ivory:    "#FAF8F4"   // Page background
charcoal: "#1C1C1E"   // Primary text, dark UI
slate:    "#4A4A52"   // Secondary text
mist:     "#E8E4DC"   // Borders, dividers
success:  "#3D7A5F"   // Green — connected, applied, saved
rose:     "#8B4A5A"   // Red/pink — danger, likes, warnings
info:     "#2C6FAC"   // Blue — informational badges
warn:     "#7A6530"   // Amber — warnings, state notes
```

### Typography

- **Display / Headings**: `Cormorant Garamond` (serif, weights 300/400/600)
- **Body / UI**: `DM Sans` (sans-serif, weights 300/400/500)

### Component Conventions

- All shared primitives live in `src/components/ui/`
- Export everything via `src/components/ui/index.ts`
- Feature components are co-located in `src/components/features/<name>/`
- No external CSS frameworks — all styles are inline with design tokens
- Hover effects use `onMouseEnter`/`onMouseLeave` inline for portability

---

## Key Conventions

### TypeScript

- Always type API responses using types from `src/types/database.ts`
- Prefer explicit return types on all async functions
- Use `zod` schemas for runtime validation of user input
- Never use `any` — use `unknown` if truly unknowable

### API Calls

All Supabase calls go through the wrapper functions in `src/lib/api/`.
Never call `supabase` directly from a component. Example:

```ts
// ✅ Good
import { applyToJob } from '@lib/api/jobs'
const result = await applyToJob(userId, jobId, form)

// ❌ Bad
const { data } = await supabase.from('job_applications').insert(...)
```

### Error Handling

All API wrappers return `{ data, error }` — never throw. Components check the
`error` field and show a toast. Example:

```ts
const { data, error } = await applyToJob(userId, jobId, form)
if (error) { toast(error, 'error'); return; }
```

### Realtime

Use the `useMessages` and `useNotifications` hooks — they manage Supabase
Realtime channel subscriptions and cleanup automatically.

### Security — Always Sanitise Before DB

```ts
// Every user input:
const cleanBio = Security.sanitise(form.bio)
const result = await updateProfile(userId, { bio: cleanBio })
```

---

## Environment Variables

| Variable                  | Required | Description                              |
|---------------------------|----------|------------------------------------------|
| `VITE_SUPABASE_URL`       | ✅       | Your Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY`  | ✅       | Supabase anon (public) key              |
| `VITE_APP_URL`            | ✅       | Production app URL                      |
| `VITE_VAPID_PUBLIC_KEY`   | ⬜       | For web push notifications              |
| `VITE_INTERNAL_SECRET`    | ✅       | For authenticating Edge Function calls  |

Never commit `.env.local`. It is in `.gitignore`.

---

## Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in your Supabase URL and keys

# 3. Set up the database
# Go to Supabase → SQL Editor → paste supabase/migrations/001_complete_schema.sql → Run

# 4. Start dev server
npm run dev

# 5. Generate TypeScript types from your schema (when schema changes)
npm run generate:types

# 6. Deploy Supabase Edge Functions
npm run functions:deploy
```

---

## Pages & Routes

| Route           | Component                 | Auth Required |
|----------------|---------------------------|---------------|
| `/`            | `AuthPage`                | No            |
| `/dashboard`   | `features/dashboard`      | Yes           |
| `/connect`     | `features/connect`        | Yes           |
| `/messages`    | `features/messages`       | Yes           |
| `/messages/:id`| `features/messages`       | Yes           |
| `/jobs`        | `features/jobs`           | Yes           |
| `/resources`   | `features/resources`      | No            |
| `/calculator`  | `features/calculator`     | No            |
| `/blog`        | `features/blog`           | No            |
| `/blog/:slug`  | `features/blog`           | No            |
| `/profile`     | `features/profile`        | Yes           |
| `/admin`       | `AdminDashboard`          | Admin only    |

---

## Feature Flags

| Flag                    | Default | Description                             |
|-------------------------|---------|-----------------------------------------|
| `ENABLE_MATCHING`       | `true`  | Auto-connect on mutual like             |
| `ENABLE_PUSH_NOTIFS`    | `true`  | Push notifications via Expo/VAPID       |
| `ENABLE_BLOG_COMMENTS`  | `true`  | Allow comments on blog posts            |
| `ENABLE_REGISTRATION`   | `true`  | Allow new account creation              |
| `MIN_AGE_REQUIREMENT`   | `18`    | Minimum age at registration             |
| `MAX_BIO_LENGTH`        | `500`   | Maximum characters in bio field         |
| `MAX_MESSAGE_LENGTH`    | `2000`  | Maximum characters per message          |
| `JOB_APPLY_DAILY_LIMIT` | `5`     | Max job applications per user per day   |

---

## Admin Access

Admin panel lives at `/admin`. Requires `role = 'admin'` or `role = 'super_admin'`.

To create the first admin, run in Supabase SQL Editor:
```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-admin@email.com';
```

Admin capabilities:
- View platform stats (members, messages, jobs, reports)
- Manage member accounts (ban, suspend, restore, verify)
- Review and resolve reports
- Approve/reject blog posts
- Manage job listings
- Send push notifications to all or filtered users
- View immutable audit logs
- Change other user roles (super_admin only)

---

## Sensitive Data Handling

| Data Type       | Storage                   | Notes                              |
|----------------|---------------------------|------------------------------------|
| Password        | `bcrypt` hash + salt      | Never logged, never returned in API|
| Phone number    | SHA-256 hash only         | Plaintext never stored             |
| SSN             | Never stored              | Scrubbed by `fn_scrub_pii()`       |
| Credit cards    | Never stored              | Scrubbed by `fn_scrub_pii()`       |
| Criminal record | `offense_type` enum only  | Never exposed in public API        |
| Location        | State only (2-char code)  | No GPS or precise location         |
| Messages        | Encrypted at rest (Supabase) | PII scrubbed before insert      |

---

## Testing

```bash
npm run test          # Run all unit tests (Vitest)
npm run type-check    # TypeScript type checking
npm run lint          # ESLint
```

Test files live next to their source files as `*.test.ts` or `*.test.tsx`.

Critical test coverage required for:
- `src/lib/security/` — all sanitisation and rate limiting functions
- `src/lib/api/` — all API wrapper functions (mock Supabase)
- `supabase/migrations/` — schema verification via `pg_tap` (optional)

---

## Deployment

See `docs/DEPLOYMENT.md` for full instructions.

Quick summary:
- **Web**: `npm run build` → deploy `dist/` to Vercel
- **Mobile**: `eas build --platform all` → submit via `eas submit`
- **Database**: `supabase db push` — runs pending migrations
- **Edge Functions**: `supabase functions deploy`
- **Admin Panel**: Deploy separately to `admin.newhorizon.app`

---

## Contact & Support

- Security issues: `security@newhorizon.app` (48-hour response SLA)
- General: `support@newhorizon.app`
- Docs: `https://docs.newhorizon.app`

---

## AI Assistant Instructions

When working on this codebase:

1. **Always sanitise user input** using `Security.sanitise()` from `src/lib/security/`
2. **Always use API wrappers** from `src/lib/api/` — never call Supabase directly in components
3. **Check rate limits** before any write operation that could be abused
4. **Never expose** `is_banned`, `ban_reason`, `role`, `phone_hash`, or `password_hash` in client-facing responses
5. **Use Zod** to validate all form inputs before sending to the API
6. **Return `{ data, error }`** from all async functions — never throw
7. **Log security events** via `Security.audit()` for any authentication or permission-related action
8. **Match the design system** — use tokens from `src/styles/tokens.ts`, never hardcode colors
9. **Offense type is private** — it appears in `profiles` but must never be included in public JOIN responses unless explicitly queried by the owner
10. **The SQL file is the source of truth** — if you need schema changes, edit `001_complete_schema.sql` and re-run, never apply ad-hoc SQL to production
