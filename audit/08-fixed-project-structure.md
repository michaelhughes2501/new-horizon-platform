# 08 — Fixed Project Structure

Target layout — mostly matches CLAUDE.md's declared structure, with the consistency fixes from [07-refactor-plan.md](./07-refactor-plan.md).

```
new-horizon-platform/
│
├── README.md                       ← updated: React 19 (A5)
├── CLAUDE.md                       ← updated: CI section + security section reconciliation (A4, A6)
├── SECURITY.md                     ← existing
├── GATEWAY.md                      ← existing
├── CHANGELOG.md                    ← added
├── LICENSE                         ← added
│
├── .gitignore                      ← POSIX paths (fixed this pass); + agent-reports/*.json (A7)
├── .env.example                    ← existing
├── .editorconfig                   ← added
├── .prettierrc                     ← optional
│
├── package.json                    ← unchanged
├── package-lock.json               ← the ONE lockfile (debris deleted this pass)
├── tsconfig.json                   ← strict + path aliases (existing)
├── vite.config.ts                  ← + gateway vite-plugin
├── vercel.json                     ← added: CSP + rewrites + regions (D2)
├── vitest.config.ts                ← added when tests need config
│
├── Dockerfile                      ← existing
├── index.html                      ← existing
├── eslint.config.js                ← existing (flat config)
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                     ← CSP moved out (B3); feature-folder imports only (B1)
│   ├── vite-env.d.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx         ← useAuth exported from here (per CLAUDE.md)
│   │   └── ToastContext.tsx
│   │
│   ├── lib/
│   │   ├── security/
│   │   │   └── index.ts            ← single file per CLAUDE.md
│   │   └── api/                    ← per-domain Supabase wrappers (B2)
│   │       ├── auth.ts
│   │       ├── profiles.ts
│   │       ├── connections.ts
│   │       ├── messages.ts
│   │       ├── jobs.ts
│   │       ├── resources.ts
│   │       ├── blog.ts
│   │       ├── notifications.ts
│   │       ├── admin.ts
│   │       └── shared.ts           ← { data, error } helpers
│   │
│   ├── components/
│   │   ├── ui/                     ← primitives per CLAUDE.md; index.ts re-exports
│   │   ├── layout/
│   │   │   └── AppLayout.tsx
│   │   ├── auth/AuthPage.tsx
│   │   ├── pages/{AdminPage, NotFoundPage}.tsx
│   │   └── features/               ← every feature lives here (B1)
│   │       ├── dashboard/{DashboardPage,components}.tsx
│   │       ├── connect/{ConnectPage,components}.tsx
│   │       ├── messages/{MessagesPage,components}.tsx
│   │       ├── jobs/{JobsPage,components}.tsx
│   │       ├── resources/{ResourcesPage, ResourceFinder}.tsx
│   │       ├── calculator/CalculatorPage.tsx
│   │       ├── blog/{BlogPage,components}.tsx
│   │       ├── profile/ProfilePage.tsx
│   │       ├── admin/{AdminPage, AdminDashboard}.tsx
│   │       ├── matching/MatchRecommendations.tsx
│   │       ├── notifications/NotificationCenter.tsx
│   │       └── chatbot/AIChatbot.tsx
│   │
│   ├── styles/
│   │   ├── tokens.ts               ← existing
│   │   └── global.css              ← existing
│   │
│   ├── types/
│   │   ├── app.ts                  ← existing
│   │   └── database.ts             ← `supabase gen types typescript`
│   │
│   └── test/                       ← added (Phase C)
│       ├── setup.ts
│       └── mocks/supabase.ts       ← msw handlers
│
├── supabase/
│   └── migrations/
│       └── 001_complete_schema.sql ← SSOT (unchanged)
│
├── gateway/
│   └── vite-plugin-gateway.js      ← existing
│
├── agent-reports/                  ← gitignored (A7)
│   └── .gitkeep
│
├── docs/
│   ├── DEPLOYMENT.md               ← already referenced in CLAUDE.md — must exist
│   ├── RUNBOOK.md                  ← added (D4)
│   └── ARCHITECTURE.md             ← optional
│
├── buildagent/ depagent/ pragent/ scanner/  ← existing
├── buildagent.yml depagent.yml pragent.yml  ← existing
├── playground/                     ← existing
│
└── .github/
    ├── workflows/
    │   ├── ci.yml                  ← existing
    │   ├── codeql.yml              ← existing
    │   ├── codacy.yml              ← existing
    │   ├── defender-for-devops.yml ← existing
    │   ├── dependency-check.yml    ← existing
    │   ├── security-scan.yml       ← existing
    │   ├── pr-agent.yml            ← existing
    │   └── build-production.yml    ← existing
    ├── dependabot.yml              ← existing
    └── instructions/
        └── codacy.instructions.md  ← existing (gitignored)
```

## Explicit call-outs

- **`pysa.yml`** and **`apisec-scan.yml`** — deleted this pass.
- **`package-lock (1).json`, `package.json.bak`, `package.json.plugin-v6`** — deleted this pass.
- **`src/components/AdminDashboard.tsx` etc.** — move under `src/components/features/<name>/`. Compact `App.tsx`'s import list to one convention.
- **`vercel.json`** — added for headers + rewrites + regions.
- **CLAUDE.md** — updated for the deleted CI files and reconciled security-file reference.
- **`agent-reports/*.json`** — no longer tracked.
- **Everything under `supabase/`** — untouched by any refactor except pg_tap tests (added in a dedicated PR).

## Sibling parity

Different from every other app in the sweep:
- Deliberately Supabase-native (per `STACK_NOTE.md` in NewHorizonV2, which forbids migration to Supabase — the reverse of this repo's stance).
- No Express / Flask / Node server.
- No custom in-app gateway (the `gateway/` folder here is a Vite plugin, not a Flask/Node blueprint).
