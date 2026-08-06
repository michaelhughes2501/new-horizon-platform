# 03 — Dependency Audit

## Runtime deps

| Package | Pin | Notes |
|---------|-----|-------|
| `@supabase/supabase-js` | `^2.45.4` | Current 2.x. |
| `react`, `react-dom`, `react-is` | `^19.2.7` | Current stable. Good. |
| `react-router-dom` | `^7.18.0` | v7 — matches sibling repos in the org. |
| `recharts` | `^3.8.1` | v3 — current. |
| `zod` | `^4.4.3` | v4 — current. |

## Dev deps

| Package | Pin | Notes |
|---------|-----|-------|
| `@eslint/js` | `^10.0.1` | ESLint 10 — very current. |
| `@types/node` | `^26.1.1` | **Anomalous.** Node 26 types. CI runtime version needs to match. |
| `@types/react`, `@types/react-dom` | `^19.2.17`, `^19.2.3` | Fine. |
| `@vitejs/plugin-react` | `^6.0.2` | v6 — matches Vite 8. |
| `eslint` | `^10.7.0` | v10. |
| `eslint-plugin-react-hooks` | `^7.1.1` | Fine. |
| `eslint-plugin-react-refresh` | `^0.5.3` | Fine. |
| `globals` | `^17.7.0` | Fine. |
| `typescript` | `^6.0.3` | TS 6 — cutting-edge. Verify. |
| `typescript-eslint` | `^8.64.0` | Fine. |
| `vite` | `^8.0.16` | v8. |
| `vitest` | `^4.1.7` | v4. **Real testing infrastructure.** |

## Missing / suspect

- **No `@testing-library/react`** yet — needed once component tests are written.
- **No `msw` (Mock Service Worker)** for Supabase mocking in tests.
- **No `dprint`/`prettier`** — style consistency via ESLint only. Acceptable.
- **No `pnpm` / `bun` lockfile** — `package-lock.json` (npm) only, plus the now-deleted `package-lock (1).json` debris.

## Anomalies

1. **`@types/node ^26.1.1`** — verify against the CI runtime.
2. **`typescript ^6.0.3`** — same cutting-edge flag as `remix-the-yard`.
3. **`eslint ^10.7.0`** — same era; recent.

None of these are blockers if `npm install` resolves. All three merit a "verify the CI still runs" step in the refactor plan.

## Known vulnerabilities (best-effort)

- `@supabase/supabase-js` 2.4x — quiet.
- `react-router-dom` 7 — GA'd cleanly.
- `zod` 4 — quiet on advisories.
- `recharts` 3 — quiet.

Dependabot is present (`.github/dependabot.yml`).

## Recommended actions

1. **Verify install resolves** after this PR's debris cleanup.
2. **Add `@testing-library/react` + `@testing-library/jest-dom`** for real component tests.
3. **Add `msw`** for Supabase test mocking.
4. **Reconcile the `@types/node` version** to match CI runtime.
5. **Consider `pnpm`** — this repo's install fanout would benefit from content-addressable storage, given the meta-agent tree.
