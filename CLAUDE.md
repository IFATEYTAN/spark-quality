# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SPARK Quality** (by SPARK AI — Yifat Eitan & Anat Greenberg) is a Hebrew-language, RTL multi-tenant SaaS for Israeli insurance agencies. Agents upload Excel reports (primarily Shorens "products in management" / pension-clearinghouse exports), the app parses and classifies clients into financial categories, surfaces opportunities on a dashboard, and queues AI-drafted outreach.

The product is a 2026 MVP / live-demo project — not a generic template. `docs/PRODUCT_SPEC.md` is the canonical spec, `docs/PRESENTATION_GUIDE.md` is the live-demo script, and `todo.md` / `ideas.md` log historical decisions and design rationale ("Editorial Fintech": deep navy + warm gold, Hebrew serif + Heebo).

### Product surface (routes → purpose)

Wired in `client/src/App.tsx`. All copy is Hebrew/RTL.

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing (`Home.tsx`) — cinematic hero, CTAs to login and to `/demo` |
| `/demo` | Full guided demo flow (`DemoExperience.tsx` orchestrating Splash → Intro → Upload → Analyzing → Dashboard → Actions → Summary stages). Append `?clean=true` to hide the shell for live presentation on a projector |
| `/onboarding` | Workspace setup: name → invite teammates → set VIP threshold (default 1,000,000 ₪) |
| `/upload` | Drag-and-drop Excel upload; client-side parser + persistence via `reports.save` |
| `/dashboard` | Daily snapshot: KPIs (clients, VIPs, liquid funds, Tikun 190 candidates, AUM) + Action Center (6 category cards) + clients table |
| `/clients` | Full client list with search, financial flags, VIP filter |
| `/team` | Admin/owner only — invitations + member roles |
| `/admin` | Super-admin only (`isSuperAdmin`) — cross-workspace dashboard, contact-form inbox, audit log |
| `/pricing` | Plans: Base (150/180 ₪) and Premium (350/420 ₪) |
| `/legal/{terms,privacy,accessibility}` | Static legal pages |

### Roles

- `owner` — created the workspace, full control + billing
- `admin` — agency manager, sees all workspace clients + manages team
- `agent` — sees only their own clients (rows where `ownerUserId = ctx.user.id`)
- `isSuperAdmin` (boolean, orthogonal) — SPARK AI staff, cross-workspace access via `adminRouter`. Auto-granted to `OWNER_OPEN_ID` and to hard-coded emails in `db.upsertUser` (currently `anathemell@gmail.com`)

### Six business categories (the core product logic)

Classification lives in `client/src/lib/parseReport.ts` (`classify()`); the dashboard's Action Center surfaces each as a card. Severity ranking (used when a client matches multiple): `vip > tikun_190 > liquid_fund > high_fees > risk_ending > coverage_gaps > regular`. **VIP is sticky** — once true, never demoted during merge.

| `flagStatus` | Trigger | Suggested action |
| --- | --- | --- |
| `vip` | `accumulation ≥ workspace.vipThreshold` (default 1M ₪) | Wealth-management meeting, premium products |
| `tikun_190` | `age ≥ 60` AND `accumulation ≥ 300K` AND product isn't pension | Tax-exempt withdrawal simulation (תיקון 190) |
| `liquid_fund` | Product name contains "השתלמות" AND ≥ 6 years active | Pitch IRA / savings policy |
| `high_fees` | `accumulation ≥ 500K` active without discount, OR low-yield heuristic (`accumulation < yearsActive × 12K`) | Retention call, lower management fees |
| `risk_ending` | Status mentions "ריסק" or "מסתיים" | Urgent renewal outreach |
| `coverage_gaps` | No pension/savings product on file | Cross-sell pension |

VIP threshold is workspace-scoped; `workspaces.updateVipThreshold` re-runs `db.reclassifyClientVipStatus` to flip `clients.isVip` for all rows in that workspace.

### AI Composer

A modal that drafts personalized email/WhatsApp messages per client based on `flagStatus`. Currently template-based on the client; the LLM hook (`server/_core/llm.ts`) is wired and ready to take over. When changing the template logic, keep the per-category CTA aligned with the table above.

### Known gaps / blocked work

Treat these as out-of-scope unless the user explicitly unblocks them — they are documented as blocked, not forgotten:

1. **Live Shorens / pension-clearinghouse API** — blocked on commercial contract. Workaround is the manual Excel upload. Don't fabricate a stub API.
2. **Accurate yield benchmarking** — blocked downstream of (1). Current low-yield detection is the heuristic in `classify()`; do not claim it's market-comparison data.
3. **Billing (iCount)** — pending; user prefers iCount over Stripe. Pricing page is presentational only — there is no checkout flow.
4. **External automations (Webhooks for Make/Zapier, CRM sync)** — roadmap only.

## Commands

Package manager is **pnpm** (10.x, declared in `package.json#packageManager` — do not use npm/yarn).

```bash
pnpm dev               # start dev server (tsx watch on server/_core/index.ts; Vite middleware mounts the client)
pnpm build             # vite build (client → dist/public) + esbuild bundle of server (→ dist)
pnpm start             # run production build (NODE_ENV=production node dist/index.js)
pnpm check             # tsc --noEmit
pnpm format            # prettier --write .
pnpm test              # vitest run (Node env, server/**/*.test.ts)
pnpm db:push           # drizzle-kit generate && drizzle-kit migrate (requires DATABASE_URL)
```

Run a single test file: `pnpm vitest run server/financial.test.ts`
Run a single test by name: `pnpm vitest run -t "מזהה לקוח VIP"`

There is no lint script. TypeScript strict mode + Prettier are the only static checks.

## Architecture

### Single-process Express + Vite

`server/_core/index.ts` is the only entrypoint. It boots Express, mounts:
- `/api/trpc` — tRPC HTTP middleware (`appRouter` from `server/routers.ts`)
- `/api/oauth/callback` — Manus OAuth code exchange (`server/_core/oauth.ts`)
- `/manus-storage/*` — proxies to Forge presigned GET URLs via 307 redirect (`server/_core/storageProxy.ts`)
- In dev: Vite middleware (HMR for the React client). In prod: static files from `dist/public`.

The server picks the next free port starting at `PORT` (default 3000) — don't assume it's listening on the requested port.

`server/index.ts` is a separate, simpler static-only entrypoint not used by `pnpm dev` or the build script; treat `server/_core/index.ts` as the source of truth.

### tRPC procedure ladder

Defined in `server/_core/trpc.ts` and extended in `server/routers.ts`:

```
publicProcedure          → no auth
protectedProcedure       → ctx.user required (UNAUTHED_ERR_MSG)
workspaceProcedure       → also requires ctx.user.workspaceId (onboarding complete)
workspaceAdminProcedure  → workspaceRole ∈ {admin, owner}
superAdminProcedure      → ctx.user.isSuperAdmin (cross-workspace SPARK staff only)
adminProcedure           → ctx.user.role === 'admin' (legacy, used by systemRouter)
```

Auth flow: `createContext` calls `sdk.authenticateRequest`, which verifies the JWT in the `app_session_id` cookie, looks up the user by `openId` in MySQL, and auto-syncs from the Manus OAuth server if missing. The error message `UNAUTHED_ERR_MSG` from `@shared/const` is matched verbatim on the client (`client/src/main.tsx`) to trigger a redirect to login — keep that string in sync if changed.

The client imports `AppRouter` as a type (`client/src/lib/trpc.ts` → `server/routers.ts`) for end-to-end type safety. **Editing routes changes the client's types**; run `pnpm check` after touching `server/routers.ts` or `server/adminRouter.ts`.

### Multi-tenant data isolation (CRITICAL)

Read the comment block at the top of `drizzle/schema.ts` before changing any query. The rule, enforced in `server/db.ts`:

- Every business query MUST filter by `workspaceId`.
- Agents (`workspaceRole === "agent"`) see only rows where `ownerUserId === ctx.user.id`. Admins/owners see everything in their workspace.

The pattern in `db.ts` uses a conditional `and()` based on `workspaceRole` — copy it for new tenant-scoped queries. Super-admin operations (`adminRouter`) bypass workspace scoping and **must write an audit-log entry** via `db.writeAudit` (see existing handlers).

### LLM and external services

- `server/_core/llm.ts` — `invokeLLM` posts to a Forge-proxied OpenAI-compatible endpoint (model is hard-coded to `gemini-2.5-flash`, with `thinking.budget_tokens=128`). Requires `BUILT_IN_FORGE_API_KEY`/`BUILT_IN_FORGE_API_URL`.
- `server/storage.ts` and `server/_core/storageProxy.ts` — file storage goes through Forge presigned URLs (S3 behind the scenes). The client should reference uploaded files by the `/manus-storage/{key}` path, not by raw S3 URLs.
- `server/email.ts` — Resend wrapper, `from: noreply@spark-ai.co.il`. Best-effort; never throws. Contact-form submissions go to `anathemell@gmail.com` (hard-coded in `routers.ts`).
- `server/_core/notification.ts` — `notifyOwner` posts to the Manus WebDev notification service.

### Excel report parsing

`client/src/lib/parseReport.ts` parses Hebrew Shorens reports **on the client** using SheetJS, then sends summary + extracted client rows to `reports.save` for persistence. The classification logic (VIP, Tikun 190, liquid fund, etc.) lives in `classify()` and uses fuzzy Hebrew column-name matching (`COL_HINTS`). Sheet selection is heuristic: insurance vs. savings sheets are merged differently to avoid double-counting AUM. Tests live in `server/parseReport.test.ts` and `server/financial.test.ts` and use SheetJS to fabricate input files.

### Frontend

- React 19 + Vite 7 + Tailwind 4 + shadcn/ui ("new-york" style, neutral base, components under `client/src/components/ui`).
- Routing is **wouter** (not React Router). `<Switch>`/`<Route>` in `client/src/App.tsx`.
- State: TanStack Query via `@trpc/react-query`. `superjson` is the transformer on both ends.
- The dashboard / demo flow (Splash → Intro → Upload → Analyzing → Dashboard → Actions → Summary) lives under `client/src/pages/DemoExperience.tsx` and the `*Stage.tsx` components. `?clean=true` hides the chrome for full-screen presentations.
- Theme: light by default; the `ThemeProvider` accepts a `switchable` prop to enable toggling. Color palette lives in `client/src/index.css` (deep navy + warm gold "Editorial Fintech" — see `ideas.md`).
- All UI copy is **Hebrew (RTL)**. Don't translate strings or change directionality without checking with the user.

### Path aliases (vite.config.ts, tsconfig.json, vitest.config.ts)

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`

Server code imports Drizzle types from `../../drizzle/schema` directly (not via an alias).

### Vite dev plugins

`vite.config.ts` registers a custom `vitePluginManusDebugCollector` that writes browser console / network / replay logs to `.manus-logs/*.log` (1 MB cap, trimmed to 60%). It's dev-only and gitignored. `vite-plugin-manus-runtime` and `@builder.io/vite-plugin-jsx-loc` are also active in dev.

### Database

MySQL (TiDB-compatible) via `drizzle-orm/mysql2`. Connection is **lazy** — `getDb()` returns `null` if `DATABASE_URL` is unset, and most read helpers fall back to empty results so local tooling (and tests) can run without a DB. New mutation helpers should follow the same pattern (`if (!db) throw new Error(...)` for writes, return safe defaults for reads).

Schema is in `drizzle/schema.ts`. Migrations are SQL files in `drizzle/*.sql` generated by `drizzle-kit`. Don't hand-edit the SQL; modify the schema and run `pnpm db:push`.

## Conventions

- **`_core/` folders are scaffold code** shared with the Manus WebDev template (auth SDK, tRPC setup, Vite glue, hooks, system router). Prefer extending app-level code (`server/routers.ts`, `server/db.ts`, `client/src/components/`) over editing `_core/`.
- **Type re-exports**: `shared/types.ts` re-exports `drizzle/schema` types and the shared `errors`. Import domain types from `@shared` (or directly from `drizzle/schema` server-side), not by reaching into `_core`.
- **Hebrew error messages** are user-visible — the codebase mixes English (logs, internal errors) with Hebrew (user-facing TRPCError messages). Match the surrounding style.
- **Patches**: `wouter@3.7.1` is patched (see `patches/`). pnpm applies it automatically on install.
- **Branch policy** (per repo instructions): follow the branch specified in the active session; never push to other branches without explicit permission.

## Environment variables

Required for full functionality (see `server/_core/env.ts`):

- `DATABASE_URL` — MySQL connection string (also required by `drizzle.config.ts`)
- `JWT_SECRET` — HS256 signing key for the session cookie
- `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` — Manus OAuth
- `OWNER_OPEN_ID` — auto-grants `role=admin` + `isSuperAdmin=true` on user upsert
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` — LLM, storage, notification proxy
- `RESEND_API_KEY` — outbound email (optional; failures are swallowed)
- `ICOUNT_API_KEY`, `ICOUNT_COMPANY_ID` — iCount billing (optional). When unset, `billing.requestCheckout` (`server/billing.ts`) falls back to a manual flow: it notifies SPARK staff via Manus + emails Anat with the upgrade request. When set, the same endpoint is the place to wire the real hosted-checkout call (TODO marked inline). Pricing source-of-truth is the `PLAN_PRICES` table in `server/billing.ts` — keep `client/src/pages/Pricing.tsx` and the Onboarding billing step in sync with it.
- `PORT` — preferred port (server falls through to the next free one)
