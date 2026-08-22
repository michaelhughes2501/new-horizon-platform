# Engineering Audit — new-horizon-platform

Branch: `claude/engineering-audit-refactor-j2mphk`
Scope: Phase 1 — reports + safe fixes only. Refactor execution deferred.

## Context

The **Supabase-native** flagship of the New Horizon family. React 19 + TypeScript + Vite 8 + React Router 7 + Zod 4 + Recharts 3, backed by Supabase (Postgres + Auth + Realtime + Storage) with **~1,400 lines of SQL** in `supabase/migrations/001_complete_schema.sql` — the single source of truth for the DB, including RLS on every table, immutable audit-log tables, triggers, and a `fn_check_rate_limit` helper.

CLAUDE.md is unusually rich (it drove the sibling audits — see e.g. NewHorizon_Android). Security architecture is written down: `sessionStorage` (not `localStorage`) for JWTs, per-user salt on bcrypt, immutable `security_events`/`admin_audit_log`, PII scrubbing, account lockout after 5 failed logins via DB trigger.

## Reports

| # | File | Focus |
|---|------|-------|
| 1 | [01-deep-engineering-audit.md](./01-deep-engineering-audit.md) | Snapshot |
| 2 | [02-bug-hunt.md](./02-bug-hunt.md) | Concrete defects |
| 3 | [03-dependency-audit.md](./03-dependency-audit.md) | Deps + version anomalies |
| 4 | [04-security-review.md](./04-security-review.md) | RLS, sanitisation, JWT storage |
| 5 | [05-production-readiness.md](./05-production-readiness.md) | Deploy, observability, backup |
| 6 | [06-architecture-review.md](./06-architecture-review.md) | src layout, feature folders |
| 7 | [07-refactor-plan.md](./07-refactor-plan.md) | Ordered PRs |
| 8 | [08-fixed-project-structure.md](./08-fixed-project-structure.md) | Target tree |

## Safe fixes applied in this pass

- **`.gitignore`** — replaced `.github\instructions\codacy.instructions.md` (Windows path separator) with a POSIX path.
- **`.github/workflows/pysa.yml`** — deleted. `CLAUDE.md` explicitly documents this as a template that "doesn't match a TypeScript project; either configure it for an actual Python target or remove it." The only Python in this repo is CI meta-tooling (`buildagent/`, `depagent/`, `pragent/`, `scanner/`) with no user-input attack surface — Pysa has nothing to taint-track. Removing it matches the stated policy.
- **`.github/workflows/apisec-scan.yml`** — deleted. Unmodified upstream template with `apisec-project: "VAmPI"` (APIsec's demo API) and unconfigured `secrets.apisec_username` / `apisec_password`. Fails on every push.
- **`package-lock (1).json`** — deleted. Debris from a browser download / merge conflict (the ` (1)` suffix is what browsers/OSes add for a duplicate). The real lockfile is `package-lock.json`; the duplicate was 66 KB smaller (partial), so it would have caused silent install drift if a tool ever preferred it.
- **`package.json.bak`** — deleted. Backup file from a manual edit; superseded by the tracked `package.json`.
- **`package.json.plugin-v6`** — deleted. Named backup from a plugin migration; obsolete.

Nothing under `src/`, `supabase/`, `buildagent/`, `depagent/`, `pragent/`, or `scanner/` was modified. CLAUDE.md's `## CI / static analysis` section still references `pysa.yml`; the audit reports flag it for an owner-side update in a follow-up PR (not applied inline to keep the diff scope-tight).
