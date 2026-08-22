# 05 — Production-Readiness Review

## Checklist

| # | Requirement | State |
|---|-------------|-------|
| 1 | Reproducible install | `package-lock.json` (real one) present. Debris deleted this pass. |
| 2 | Env config documented + enforced | `.env.example` OK. `VITE_INTERNAL_SECRET` needs clarification (see [04-security-review.md#c2](./04-security-review.md)). |
| 3 | Dependencies audited | Dependabot present. |
| 4 | Minimum test bar | `vitest` in devDeps + `npm test` script. Actual test files not audited here. |
| 5 | CI enforcing tests | `ci.yml` present + build-production + dep-check. |
| 6 | Observability | Nothing frontend-side. Supabase provides DB logs. |
| 7 | Rate limiting | **Real** — server-side `fn_check_rate_limit`. |
| 8 | Security headers | CSP via runtime JS (see 04). Not verified as Vercel deploy config. |
| 9 | Backup / restore | Supabase managed. Should be documented. |
| 10 | Migrations | Single-file schema — deliberate; run via `supabase db push`. |
| 11 | Admin surface | Separate deploy target per CLAUDE.md. |
| 12 | Runbook | Not present in-repo; may be in the `docs.newhorizon.app` external site. |

## Deploy story

### What exists

- **Vercel** as the web target (per CLAUDE.md).
- **`Dockerfile`** present (not audited here) — likely for an alternative deploy path.
- **Supabase** as the backend — provisioned separately; `supabase db push` applies migrations.
- **Supabase Edge Functions** for server-side logic.
- **Admin Panel** deployed separately to `admin.newhorizon.app`.
- **Expo / EAS** for mobile (documented; not in this repo).

The deploy shape is more sophisticated than the sibling apps. What's still missing:

- **A committed `vercel.json`** with the CSP + rewrite rules for React Router 7. Not verified.
- **A CI check that `supabase db push` succeeds** on a staging DB before deploy.
- **A production `.env` provisioning doc** — CLAUDE.md documents the required vars; a "how the deploy actually gets them" note would help.

## Observability

- **Supabase** provides Postgres logs, edge-function logs, auth events.
- **Frontend errors** — not wired to Sentry / equivalent.
- **Web vitals** — not wired to a beacon.
- **Uptime probe** — not wired.

Recommend Sentry front-end + Supabase log alerts + a plain UptimeRobot probe on the Vercel URL.

## Data lifecycle

- **Backup:** Supabase automatic PITR. Provider default; document retention.
- **Restore:** Supabase-side; document the restore drill.
- **Delete-user (GDPR):** CLAUDE.md doesn't explicitly document the flow. Given RLS + immutable audit tables, a hard-delete needs to reconcile with "audit logs are immutable" — likely done by anonymising the FK rather than deleting the audit row. Confirm.
- **PII inventory:** documented (Passwords, Phone, SSN, CC, Criminal record, Location, Messages).

## Reliability

- **Supabase managed** — mostly out of scope.
- **Client-side rate limiting** — sliding window; correct.
- **No graceful degradation** for Supabase outages — the app will error on every action. Consider a small offline mode for read-mostly views (blog, calculator).

## Documentation

- **CLAUDE.md** — comprehensive. Update its `## CI / static analysis` section per B6.
- **`README.md`** — points at CLAUDE.md.
- **`SECURITY.md`** — present.
- **`GATEWAY.md`** — present (gateway plugin exists in `gateway/vite-plugin-gateway.js`).
- **`docs.newhorizon.app`** — external site referenced in CLAUDE.md.
- **Runbook in-repo** — absent.

## Verdict

The most production-shaped app in the sweep from a security angle. What's missing is the surrounding polish: Sentry, uptime probes, a `vercel.json` with headers, and reconciling `VITE_INTERNAL_SECRET`.
