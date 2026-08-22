# 07 — Refactor Plan

## Ground rules

- `npm run build`, `npm run type-check`, `npm run lint`, `npm test` must all pass.
- Never edit `supabase/migrations/001_complete_schema.sql` in the same PR as anything else.
- `sessionStorage` for JWT stays.
- Feature-folder convention (`src/components/features/<name>/`) stays.
- The single-file `src/lib/security/index.ts` stays (per CLAUDE.md).

## Phase A — Hygiene

### A1. (Done) Delete `pysa.yml`, `apisec-scan.yml`
Done in this pass.

### A2. (Done) Delete `package-lock (1).json`, `package.json.bak`, `package.json.plugin-v6`
Done in this pass.

### A3. (Done) Fix `.gitignore` Windows separator
Done in this pass.

### A4. Update CLAUDE.md `## CI / static analysis` section
- Effort: 5 min. Remove the `pysa.yml` reference; note the `apisec-scan.yml` removal.

### A5. Fix README's "React 18" to "React 19"
- Effort: 2 min.

### A6. Reconcile CLAUDE.md single-file vs `sanitise.ts` split
- Effort: 10 min. Pick one truth and update.

### A7. Untrack `agent-reports/*.json`
- Effort: 10 min.

## Phase B — Consistency

### B1. Move harvested components into feature folders
- Effort: 45 min. `AdminDashboard`, `MatchRecommendations`, `ResourceFinder`, `NotificationCenter` → `src/components/features/<name>/`.
- Update `App.tsx` import paths.

### B2. Verify `src/lib/api/` exists and has wrappers per CLAUDE.md
- Effort: variable. If it doesn't exist, create with skeleton `AuthService`, `ProfileService`, `JobService`, `MessageService`.

### B3. Move CSP from runtime JS to `vercel.json`
- Effort: 30 min.

### B4. Reconcile `@types/node ^26.1.1`
- Effort: 10 min. Align with CI Node version.

## Phase C — Test bar

### C1. Add `@testing-library/react` + `@testing-library/jest-dom` + `msw`
- Effort: 30 min.

### C2. Write tests for `src/lib/security/*` — critical per CLAUDE.md
- Effort: 3 hrs. All sanitise, rate-limit, password-strength functions.

### C3. Write tests for `src/lib/api/*` — mock Supabase via msw
- Effort: 4 hrs.

### C4. Add `pg_tap` schema tests — critical per CLAUDE.md (optional → required)
- Effort: 6 hrs. RLS enforcement, immutable audit table protection, trigger behaviour.

## Phase D — Observability + deploy

### D1. Wire Sentry (client + Supabase Edge Function)
- Effort: 1 hr.

### D2. Add `vercel.json` with CSP + rewrites + regions
- Effort: 45 min.

### D3. Add UptimeRobot probe on `/` and `/api/health` (via edge function)
- Effort: 20 min.

### D4. Document Supabase backup + restore in `docs/RUNBOOK.md`
- Effort: 1 hr.

## Phase E — Deferred

### E1. Reconcile `VITE_INTERNAL_SECRET` naming
- Effort: 30 min. Owner call.

### E2. Verify `feature flags` are also enforced server-side
- Effort: variable.

### E3. Extract meta-agents to a submodule (if reused)
- Effort: 4 hrs (only if the other repos with the same agents merge with this one).

## Effort estimate

| Phase | Steps | Effort |
|-------|-------|--------|
| A | 7 | ~45 min |
| B | 4 | ~2 hrs |
| C | 4 | ~13 hrs |
| D | 4 | ~3 hrs |
| E | 3 | variable |
| **Total** | **22 PRs** | **~19 hrs + variable** |

## Explicit non-goals

- **Split `001_complete_schema.sql`** into per-version migrations. CLAUDE.md's single-file model is intentional.
- **Move JWT from `sessionStorage` to `localStorage`.** Deliberately not the default.
- **Split `src/lib/security/index.ts`.** CLAUDE.md prohibits.
- **Migrate away from Supabase.** Per `STACK_NOTE.md` in the sibling `NewHorizonV2` (same policy family), each app has its stack policy — this one *is* the Supabase-native one.
