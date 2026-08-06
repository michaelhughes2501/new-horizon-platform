# 04 — Security Review

## Strengths (per CLAUDE.md, verified by file layout)

- **`sessionStorage` for JWTs** — not `localStorage`. Session ends when the tab closes; XSS-based exfil still possible but the window is narrower.
- **`bcrypt` via `pgcrypto`** — password hashing enforced at the DB layer.
- **Account lockout via DB trigger** (`trg_auto_lock`) — 5 failed logins → 15-min lock. Enforced server-side, unbypassable from the client.
- **Rate limiting** — `fn_check_rate_limit` in the SQL schema, plus client-side sliding window. Server-side is the source of truth.
- **RLS on every table** — CLAUDE.md is explicit and prohibits disabling.
- **Immutable audit tables** — `security_events` and `admin_audit_log` refuse `UPDATE` and `DELETE`.
- **Privilege escalation blocked at the DB** — `trg_prevent_escalation` refuses direct `role` writes; must go through `fn_change_user_role()` which requires `super_admin`.
- **Input sanitisation via `Security.sanitise()`** — HTML tags, `javascript:` URIs, null bytes stripped before DB insert.
- **PII scrubbing** — `fn_scrub_pii()` strips SSN / credit-card patterns from messages before insert.
- **Phone numbers hashed** — never plaintext.
- **Content moderation** — messages and comments checked against blocked-word list + threat patterns before insertion.
- **Auth session provider** — `AuthContext.tsx` exports `useAuth` from a single place. CLAUDE.md prohibits recreating.
- **Path aliases + strict TS** — makes it structurally hard to accidentally import a wrong module.

## Concerns

### C1 — CLAUDE.md `## CI / static analysis` refers to `pysa.yml` after this PR deletes it
See B6 above. Follow-up doc PR.

### C2 — `INTERNAL_SECRET` for edge-function calls
CLAUDE.md documents `VITE_INTERNAL_SECRET` for authenticating edge-function calls. `VITE_` prefix means this variable is inlined into the client bundle. Anyone who inspects the bundle sees the secret. It cannot serve as a real authenticator between the client and the edge function — an attacker crafts requests with the same header value and passes.

This may be intentional (a "shared identifier" not a real secret) — or a naming bug. **Owner action:** if `INTERNAL_SECRET` is meant to be a real secret between edge functions, drop the `VITE_` prefix and read it from the edge-function environment only (no client-side reference). If it's meant to be a public "app identifier", rename to `VITE_APP_ID` and make it explicit.

### C3 — `.env.local` gitignored — good
Confirmed.

### C4 — CSP applied on load (`src/App.tsx` comment "Apply Content Security Policy on load")
Applying CSP at runtime from JS is weaker than `<meta http-equiv="Content-Security-Policy">` in `index.html`, which is weaker still than a real HTTP CSP header. Ideally, the CSP goes on the Vercel deploy config (`vercel.json`) so it's enforced by the browser before any JS runs. Not verified here.

### C5 — Supabase anon-key exposure
Standard: the anon key ships to the client. Fine. RLS is the enforcement point.

### C6 — Static analysis coverage
- `codeql.yml` — good.
- `codacy.yml` — good.
- `defender-for-devops.yml` — good.
- `pysa.yml` — deleted this pass.
- `security-scan.yml` (custom scanner) — good.
- `apisec-scan.yml` — deleted this pass.
- `dependency-check.yml` — good.
- `build-production.yml` + `pr-agent.yml` — the meta-agent CI wiring.
- `ci.yml` — verify + build.

Coverage is broad.

### C7 — Feature flags in CLAUDE.md
`ENABLE_MATCHING`, `ENABLE_PUSH_NOTIFS`, etc. Where are these read? If they live in client code, a determined user can flip them via devtools. Server-side enforcement (RLS + edge-function checks) must be independent of the client-side flag.

### C8 — Admin panel deployment
CLAUDE.md notes: "Admin Panel: Deploy separately to `admin.newhorizon.app`". Good — separate origin avoids the admin panel's CSP being polluted by the main app. Confirm this is actually done at deploy time.

## Dependency-level

- Dependabot present.
- Zod 4 pins tight; useful for boundary validation.
- No open advisories known against the pinned versions.

## Summary of concrete security actions

1. **Update CLAUDE.md** `## CI / static analysis` to reflect the deleted `pysa.yml`.
2. **Clarify `VITE_INTERNAL_SECRET` intent** — either drop the `VITE_` prefix, or rename to `VITE_APP_ID` if it's not really a secret.
3. **Move CSP from runtime JS** to Vercel deploy config.
4. **Confirm admin panel deploys to a separate origin** in production.
5. **Verify feature flags are also enforced server-side.**
