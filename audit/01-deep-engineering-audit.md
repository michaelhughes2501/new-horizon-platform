# 01 — Deep Engineering Audit

## Snapshot

| Dimension | State |
|-----------|-------|
| Frontend | React 19.2 + TS 6 + Vite 8 + React Router 7 |
| Validation | Zod 4 |
| Backend/DB | Supabase (Postgres + Auth + Realtime + Storage) |
| Schema source | `supabase/migrations/001_complete_schema.sql` (~1,400 LOC — SSOT) |
| Charts | Recharts 3 |
| ESLint | Flat config (`eslint.config.js`), `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint` |
| Tests | **`vitest`** in devDeps + `npm test` script — real test infrastructure |
| Docs | `CLAUDE.md` (unusually deep), `README.md`, `SECURITY.md`, `GATEWAY.md` |
| Deploy | Dockerfile present, Vercel target per CLAUDE.md |
| Meta-tooling | Same Python agents as other portfolio repos + Vite gateway plugin (`gateway/vite-plugin-gateway.js`) |

## What works well

- **CLAUDE.md is production-grade documentation.** Every convention — API wrappers, error envelope, sanitisation-before-DB, session storage — is written down and enforced by convention.
- **Security is baked into the schema, not the app code.** `supabase/migrations/001_complete_schema.sql` is the enforcement point:
  - RLS on every table.
  - `trg_prevent_escalation` blocks direct role changes.
  - `trg_auto_lock` locks accounts after 5 failed logins.
  - `security_events` and `admin_audit_log` are **immutable** (no UPDATE/DELETE).
  - Phone numbers stored as `phone_hash` only; PII scrubbing via `fn_scrub_pii`.
- **JWT in `sessionStorage`, not `localStorage`** — a security choice most React+Supabase apps get wrong.
- **`vitest` wired.** First frontend in the sweep with real tests.
- **Real ESLint flat config** with hooks + react-refresh + typescript-eslint. `lint` script actually lints.
- **Zod for input validation** — used at the boundary, per convention.
- **Feature-folder convention** — `src/components/features/<name>/` per CLAUDE.md.
- **`src/lib/security/index.ts`** — single-file security module (sanitise, rate limit, password strength, audit helpers). CLAUDE.md explicitly says "don't split it".
- **Path aliases** (`@lib`, `@components`, `@context`, `@types`, `@styles`) — consistent, enforced by tsconfig + vite.config.

## Concrete gaps

### G1 — Debris `package*` files
Three tracked files that should not exist:
- **`package-lock (1).json`** (space in name — browser-download artefact).
- **`package.json.bak`** (manual backup).
- **`package.json.plugin-v6`** (named backup from a plugin migration).

All three were tracked in git. **Deleted in this pass.** The one with actual bytes at risk was `package-lock (1).json` — a smaller, partial lockfile that would cause silent install drift if any tool preferred it (e.g. `find | sort | head` order).

### G2 — `pysa.yml` template
CLAUDE.md itself calls this out: "template — misconfigured for this TS project; update or delete next time it's touched." **Deleted in this pass.**

### G3 — `apisec-scan.yml` template
Same "template with placeholder secrets targeting a demo API" pattern seen in `remix-the-yard` and `NewHorizonV2`. **Deleted in this pass.**

### G4 — `.gitignore` Windows separator
Same `.github\instructions\codacy.instructions.md` no-op. **Fixed in this pass.**

### G5 — `agent-reports/*.json` committed
Same smell as the sibling repos. `agent-reports/{build-agent,dependency-agent,security-scanner}.json` are outputs. Consider gitignoring.

### G6 — Two lockfiles is one too many
After deleting `package-lock (1).json` in this pass, only `package-lock.json` remains. Verify `npm install` still resolves the same tree.

### G7 — `README.md` says React 18, `package.json` says React 19.2
CLAUDE.md is accurate; README is stale on this one line.

### G8 — TS 6 + Vite 8 + Router 7 — cutting-edge
Same as remix-the-yard. Verify build.

### G9 — CLAUDE.md references `pysa.yml`
CLAUDE.md's `## CI / static analysis` section names `pysa.yml`. This PR deletes the file but leaves the reference. A follow-up doc PR should update that section. **Not fixed inline** to keep the diff scope-tight and avoid the reviewer wondering "did CLAUDE.md get half-edited".

### G10 — `agent-reports/*.json` should self-generate on CI, not be committed
Same as siblings. Deferred.

## Verdict

The most security-mature app in the sweep. What's missing is the boring surrounding hygiene: three CI templates gone (done), three debris files gone (done), CLAUDE.md line update (deferred), README version bump (deferred). No structural work needed.
