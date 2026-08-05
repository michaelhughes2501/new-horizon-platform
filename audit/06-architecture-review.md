# 06 — Architecture Review

## Current shape

```
Browser
   │
   ▼
Vercel (Vite build → dist/)
   │
   ▼
React 19 + React Router 7 SPA
   ├── AuthProvider (Supabase JWT in sessionStorage)
   ├── ToastProvider
   ├── Security module (@lib/security)
   ├── Feature pages under src/components/features/<name>/
   │   ├── dashboard, connect, messages, jobs, resources,
   │   │   calculator, blog, profile, auth
   │   └── admin
   ├── Harvested pages under src/components/*.tsx
   │   ├── AdminDashboard, MatchRecommendations,
   │   │   ResourceFinder, NotificationCenter
   │   └── AIChatbot
   └── UI primitives under src/components/ui/
   │
   ▼ (Supabase JS SDK)
Supabase
   ├── PostgreSQL (schema in supabase/migrations/001_complete_schema.sql)
   │   ├── RLS on every table
   │   ├── Triggers (mutual like, blog slug, admin lockout, ...)
   │   ├── Functions (fn_check_rate_limit, fn_moderate_content, fn_scrub_pii,
   │   │   fn_change_user_role, ...)
   │   └── Immutable audit tables (security_events, admin_audit_log)
   ├── Auth
   ├── Realtime (WebSockets)
   ├── Storage
   └── Edge Functions (Deno)
```

## What's structurally correct

- **Provider tree at the root** — `AuthProvider` + `ToastProvider` in `App.tsx`, before the router. Correct order.
- **Lazy imports** for every page — code splits are automatic.
- **`AuthContext` exports `useAuth` from itself** — per CLAUDE.md, do NOT create a separate `useAuth.ts`.
- **`src/lib/security/index.ts`** is intentionally a single file. Per CLAUDE.md, do NOT split it.
- **Path aliases** (`@lib`, `@components`, `@context`, `@types`, `@styles`) enforce clean imports.
- **`src/lib/api/` pattern** (per CLAUDE.md) — components call wrappers, not Supabase directly. This is the biggest architectural win.
- **`{ data, error }` envelope** — every async wrapper returns it. Components check `error` and toast.

## Where the structure strains

### W1 — Two component-location conventions in the same App.tsx

`App.tsx` lazy-imports feature pages from `@components/features/<name>/*` **and** four "harvested" components (`AdminDashboard`, `MatchRecommendations`, `ResourceFinder`, `NotificationCenter`) from the top level of `@components/`. That's inconsistent. Per CLAUDE.md's feature-folder convention, the four should move to `src/components/features/<name>/`.

### W2 — `src/lib/api/` mentioned in CLAUDE.md but not visible in the listing

CLAUDE.md prohibits calling Supabase directly from components; every call must go through a wrapper in `src/lib/api/*`. The current tree listing shows `src/lib/security/` but no `src/lib/api/`. Either the file listing is incomplete (path aliases point to it, so it must exist) or the convention exists as a policy but hasn't been implemented. Verify by reading `src/lib/api/`.

### W3 — CLAUDE.md notes `src/lib/security/index.ts` (single file), but the "always sanitise" example refers to `src/lib/security/sanitise.ts`

Same doc-inconsistency as B5 above. Either the single-file model or the split model is true; both being documented is a bug.

### W4 — `src/App.tsx` says "Apply Content Security Policy on load"

Runtime CSP application is weaker than a Vercel header. Move it.

## Recommended target

- Move the four harvested components into feature folders.
- Confirm/create `src/lib/api/` per CLAUDE.md.
- Reconcile CLAUDE.md's single-file-vs-split section.
- Move CSP to `vercel.json`.

Nothing here is architectural — all are consistency fixes.

## The SQL migration

`supabase/migrations/001_complete_schema.sql` is the load-bearing structural decision. Keeping it as a single ~1,400-line file that gets edited in place (rather than splitting into per-version files) is a deliberate CLAUDE.md decision. It's defensible — the file *is* the source of truth, and a Supabase-project owner only cares about the "current" schema, not the history.

The one thing missing at this scale: a **schema-verification test** via `pg_tap`. CLAUDE.md mentions it as optional; at the scale of 1,400 LOC of policies and triggers, it should be required.

## Meta-tooling

Same meta-agents (`buildagent/`, `depagent/`, `pragent/`, `scanner/`) as remix-the-yard / NewHorizonV2. Same shape, same follow-ups (untrack outputs, extract into a shared repo if reused).

## Verdict

Structurally the strongest app in the sweep. The lifts:

1. Consolidate the component-location convention.
2. Reconcile CLAUDE.md's internal inconsistency about `src/lib/security/`.
3. Move CSP to `vercel.json`.
4. Add `pg_tap` schema tests.

None is a rewrite.
