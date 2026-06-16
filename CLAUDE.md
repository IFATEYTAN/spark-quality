# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**SPARK Quality** (by SPARK AI — Yifat Eitan & Anat Greenberg) is a Hebrew-language, RTL multi-tenant SaaS for Israeli insurance agencies. Agents upload Excel reports (primarily Shorens "products in management" / pension-clearinghouse exports), the app parses and classifies clients across a 16-trigger opportunity model, surfaces prioritized actions on a dashboard, and queues AI-drafted outreach.

The product is a 2026 MVP / live-demo project — not a generic template. `docs/PRODUCT_SPEC.md` is the canonical spec, `docs/PRESENTATION_GUIDE.md` is the live-demo script, and `todo.md` / `ideas.md` log historical decisions and design rationale ("Editorial Fintech": deep navy + warm gold, Hebrew serif + Heebo). Other living docs: `docs/roadmap-status.md`, `docs/mvp-rollout.md`, `docs/subscription-plans-spec.md`, `UX_AND_GATING_ROADMAP.md`, and the Make integration notes (`MAKE_INTEGRATION.md`, `MAKE_BILLING_CALLBACK.md`).

### Product surface (routes → purpose)

Wired in `client/src/App.tsx` (wouter `<Switch>`). All copy is Hebrew/RTL.

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing (`Home.tsx`) — cinematic hero, CTAs to login and to `/demo` |
| `/demo` | Full guided demo flow (`DemoExperience.tsx` orchestrating Splash → Intro → Upload → Analyzing → Dashboard → Actions → Summary stages). Renders the full 16-trigger P0–P4 model with **fictional data only** (never real client info — "Approach A", PR #17). Append `?clean=true` to hide the shell for live presentation on a projector |
| `/onboarding` | Workspace setup: name → invite teammates → set VIP threshold (default 1,000,000 ₪) → billing |
| `/upload` | Drag-and-drop Excel upload; client-side parser + persistence via `reports.save` |
| `/dashboard` | Daily snapshot: KPIs + Priority Action Groups (the 16 triggers grouped P0–P4) + clients table |
| `/clients` | Full client list with search, financial flags, VIP filter |
| `/tasks` | Per-client task/reminder workflow (`clientJourney` router — activities + reminders) |
| `/analytics` | Workspace analytics dashboards (`analytics` router) |
| `/team` | Admin/owner only — invitations + member roles |
| `/admin` | Super-admin only (`isSuperAdmin`) — cross-workspace dashboard, contact-form inbox, audit log |
| `/pricing` | Single-tier plan (₪199/mo, 15% off yearly). CTA launches iCount checkout directly |
| `/billing/{waiting,success,failed}` | Checkout return pages (iCount/Make redirect targets) |
| `/legal/{terms,privacy,accessibility}` | Static legal pages |

### Roles

- `owner` — created the workspace, full control + billing
- `admin` — agency manager, sees all workspace clients + manages team
- `agent` — sees only their own clients (rows where `ownerUserId = ctx.user.id`)
- `isSuperAdmin` (boolean, orthogonal) — SPARK AI staff, cross-workspace access via `adminRouter`. Auto-granted to `OWNER_OPEN_ID` and to hard-coded emails in `db.upsertUser` (currently `anathemell@gmail.com`)

### The 16-trigger opportunity model (the core product logic)

The product organizes client opportunities into **16 triggers across five priority bands (P0–P4)**. This superseded the original 6-category model; the legacy 6/7 `flagStatus` buckets still exist as a compatibility layer underneath.

- **Demo / canonical catalog**: `client/src/lib/triggerScenarios.ts` defines all 16 triggers (priority band, Hebrew title, suggested action, demo metrics). This is the source of truth for labels and ordering shown in the dashboard's Priority Action Groups.
- **Real-data counts**: `server/db.ts` → `getWorkspaceMetrics()` computes the 16 trigger counts from the `clients` rows joined with the `policies` table (coverage/risk/concentration/frozen-fund derivations). Some fine-grained triggers are still heuristic placeholders pending richer policy data — the function documents which.
- **Upload-time classification**: `client/src/lib/parseReport.ts` → `classify()` / `classifyAggregate()` assigns each parsed client a legacy `flagStatus` (`vip`, `tikun_190`, `liquid_fund`, `high_fees`, `risk_ending`, `coverage_gaps`, `regular`) used as the coarse bucket. **VIP is sticky** — once true, never demoted during merge. Severity ranking on multi-match: `vip > tikun_190 > liquid_fund > high_fees > risk_ending > coverage_gaps > regular`.

The 16 triggers (metric key in `getWorkspaceMetrics` → band → Hebrew intent):

| Band | Trigger (metric key) | Intent |
| --- | --- | --- |
| **P0** critical/legal | `poaExpired`, `poaExpiring90d` | Power-of-attorney expired / expiring ≤ 90d → digital renewal |
| **P1** urgent | `riskTemporary`, `coverageEnding` | Temporary-risk / coverage ending ≤ 90d → renewal call |
| **P2** high opportunity | `savingsNoInsurance`, `noActivePension`, `age46NoLongTermCare`, `aumFrozen` | Cross-sell insurance / pension / long-term-care; reactivate dormant fund ("קרן ללא הפקדות") |
| **P3** portfolio improvement | `highFees`, `trackMismatch`, `selfEmployedNoDeposit`, `concentrationRisk` | Fee negotiation, age-appropriate track, self-employed deposit, diversification |
| **P4** retention/touch | `birthdayMilestone`, `birthdayThisMonth`, `vipGoldPremium`, `noEmail` | Milestone birthdays, VIP wealth meeting, missing contact info |

`triggerHandled` (table) records `(client, triggerKey)` pairs the agent has actioned, so the dashboard can show handled/remaining state per trigger (see `db.markTriggerHandled` / `countHandledByTrigger` / `listClientsForTrigger`, exposed via the `triggers` router).

VIP threshold is workspace-scoped; `workspaces.updateVipThreshold` re-runs `db.reclassifyClientVipStatus` to flip `clients.isVip` for all rows in that workspace.

### AI Composer

A modal that drafts personalized email/WhatsApp messages per client based on the client's trigger/`flagStatus`. The LLM path is wired through `server/_core/llm.ts` and `server/prompts.ts` (prompt construction) + `server/aiContextEnricher.ts` (assembles client context). Generated drafts are persisted in `messageGenerations`; the `reports`/`clientJourney` routers expose `compose`, `composeVariants`, `briefing`, `clientSummary`, `qa`, `smartSuggestions`, and `generateEmail`. When changing message logic, keep the per-trigger CTA aligned with the catalog in `triggerScenarios.ts`.

### Known gaps / blocked work

Treat these as out-of-scope unless the user explicitly unblocks them — they are documented as blocked, not forgotten:

1. **Live Shorens / pension-clearinghouse API** — blocked on commercial contract. Workaround is the manual Excel upload. Don't fabricate a stub API.
2. **Accurate yield benchmarking** — blocked downstream of (1). Low-yield / high-fee detection is heuristic in `classify()` and `getWorkspaceMetrics`; do not claim it's market-comparison data.
3. **External automations (general Make/Zapier scenarios, CRM sync)** — roadmap only. (NB: Make *is* wired specifically for the billing checkout webhook — see Billing below.)

> Note: **Billing is no longer blocked** — iCount + Make checkout is implemented (see below). Pricing was also simplified to a single tier.

## Commands

Package manager is **pnpm** (10.x, declared in `package.json#packageManager` — do not use npm/yarn).

```bash
pnpm dev               # start dev server (tsx watch on server/_core/index.ts; Vite middleware mounts the client)
pnpm build             # vite build (client → dist/public) + esbuild bundle of server (→ dist)
pnpm start             # run production build (NODE_ENV=production node dist/index.js)
pnpm check             # tsc --noEmit
pnpm format            # prettier --write .
pnpm test              # vitest run (Node env, server/**/*.test.ts)
pnpm test:e2e          # playwright test (e2e/ — public demo + marketing flows)
pnpm test:e2e:install  # playwright install chromium (one-time, before first e2e run)
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
- `/api/icount/callback` — iCount payment callback (GET+POST; `server/_core/iCountRoutes.ts`)
- `/api/billing/activate` — Make billing webhook that activates a subscription (`server/_core/makeRoutes.ts`, shared-secret guarded)
- `/api/scheduled/abandonedCarts`, `/api/scheduled/quotaWatch` — cron-style endpoints (jobs in `server/jobs/`, `server/quotaWatch.ts`)
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
workspaceActiveProcedure → also requires workspace subscriptionStatus ∈ {active, past_due} (gates data export)
workspaceAdminProcedure  → workspaceRole ∈ {admin, owner}
superAdminProcedure      → ctx.user.isSuperAdmin (cross-workspace SPARK staff only)
adminProcedure           → ctx.user.role === 'admin' (legacy, used by systemRouter)
```

Auth flow: `createContext` calls `sdk.authenticateRequest`, which verifies the JWT in the `app_session_id` cookie, looks up the user by `openId` in MySQL, and auto-syncs from the Manus OAuth server if missing. The error message `UNAUTHED_ERR_MSG` from `@shared/const` is matched verbatim on the client (`client/src/main.tsx`) to trigger a redirect to login — keep that string in sync if changed.

Top-level routers in `appRouter`: `system`, `contact`, `auth`, `workspaces`, `clients`, `reports`, `triggers`, `exports`, `clientJourney`, `admin`, `billing`, `templates`, `analytics`, `sequences`.

The client imports `AppRouter` as a type (`client/src/lib/trpc.ts` → `server/routers.ts`) for end-to-end type safety. **Editing routes changes the client's types**; run `pnpm check` after touching `server/routers.ts`, `server/adminRouter.ts`, or `server/billing.ts`.

### Multi-tenant data isolation (CRITICAL)

Read the comment block at the top of `drizzle/schema.ts` before changing any query. The rule, enforced in `server/db.ts`:

- Every business query MUST filter by `workspaceId`.
- Agents (`workspaceRole === "agent"`) see only rows where `ownerUserId === ctx.user.id`. Admins/owners see everything in their workspace.

The pattern in `db.ts` uses a conditional `and()` based on `workspaceRole` — copy it for new tenant-scoped queries. Super-admin operations (`adminRouter`) bypass workspace scoping and **must write an audit-log entry** via `db.writeAudit` (see existing handlers).

### Billing (iCount + Make)

Implemented in `server/billing.ts` (the `billing` router), `server/iCount.ts` (`iCountSdk`), and `server/makeCheckout.ts` (`makeCheckoutSdk`):

- **Pricing is single-tier** (Round 125): ₪199/month, 15% off when paid yearly (~₪169/mo effective, ₪2,028/yr). All plan keys (`basic`/`pro`/`premium`) map to the same price so legacy invoices/iCount stay valid. **`PLAN_PRICES` in `server/billing.ts` is the source of truth** — keep `client/src/pages/Pricing.tsx` and the Onboarding billing step in sync. Periods are `monthly` / `yearly` only — never offer "installments" (explicit product decision).
- **Checkout**: `billing.requestCheckout` / `startCheckoutViaMake` kick off hosted checkout; the user is redirected and returns via `/billing/{success,failed,waiting}`. iCount posts back to `/api/icount/callback`; Make posts to `/api/billing/activate` (validated against `MAKE_BILLING_SHARED_SECRET`). Standing-order flow: `startStandingOrder` / `confirmStandingOrder`.
- **Payment lifecycle**: attempts tracked in `paymentAttempts` (`createPaymentAttempt`, `markPaymentAttemptSucceeded/Failed`). On first successful payment, `promoteCreatorToOwnerIfActive` promotes the workspace creator to `owner`. `markPastDue` / `enforceSuspensions` / `restoreAccess` drive subscription state; `history` / `usageHistory` / `invoiceUrl` feed the billing UI.
- **Access gating**: `server/featureGate.ts` (`normalizeWorkspacePlan`, `assertDowngradeAllowed`) + `workspaceActiveProcedure` enforce plan entitlements. `server/quotaWatch.ts` + `server/jobs/abandonedCarts.ts` are the scheduled nudges.
- Falls back to a manual flow (notify SPARK via Manus + email Anat) when iCount/Make env vars are unset.

### LLM and external services

- `server/_core/llm.ts` — `invokeLLM` posts to a Forge-proxied OpenAI-compatible endpoint. Model is hard-coded to `gemini-2.5-flash` (`max_tokens=32768`, `thinking.budget_tokens=128`). Requires `BUILT_IN_FORGE_API_KEY` / `BUILT_IN_FORGE_API_URL`. `server/anthropic.smoke.test.ts` / `resend.smoke.test.ts` are network-gated smoke tests (skipped without creds).
- `server/storage.ts` and `server/_core/storageProxy.ts` — file storage goes through Forge presigned URLs (S3 behind the scenes). The client should reference uploaded files by the `/manus-storage/{key}` path, not by raw S3 URLs.
- `server/email.ts` — Resend wrapper, `from: noreply@spark-ai.co.il`. Best-effort; never throws. `server/emailTemplates.ts` renders branded HTML. Contact-form submissions go to `anathemell@gmail.com` (hard-coded in `routers.ts`).
- `server/_core/notification.ts` — `notifyOwner` posts to the Manus WebDev notification service.
- `server/_core/voiceTranscription.ts`, `imageGeneration.ts`, `map.ts`, `dataApi.ts` — additional Forge-proxied helpers from the template (use as needed).

### Excel report parsing

`client/src/lib/parseReport.ts` parses Hebrew Shorens reports **on the client** using SheetJS, then sends summary + extracted client rows (and per-policy detail) to `reports.save` for persistence. Policy-level data is stored in the `policies` table so the server-side trigger engine (`getWorkspaceMetrics`) can derive coverage/risk/concentration/frozen-fund triggers. The classification logic lives in `classify()` / `classifyAggregate()` and uses fuzzy Hebrew column-name matching (`COL_HINTS`). Sheet selection is heuristic: insurance vs. savings sheets are merged differently to avoid double-counting AUM; the investment-tracks sheet ("מסלולי השקעה", product type `INVESTMENT_TRACK_PRODUCT_TYPE`) drives the track-mismatch trigger and is excluded from AUM. Tests: `server/parseReport.test.ts`, `parseReport.sheets.test.ts`, `parseShorensReport.test.ts`, `realXlsxRoundtrip.test.ts`, `financial.test.ts`, `triggerScenarios.test.ts`, `triggerEngine.e2e.test.ts` (real-DB end-to-end of the 16-trigger engine).

`server/scripts/backfillClientFlags.ts` re-derives `flagStatus`/flags for existing rows after classifier changes.

### Frontend

- React 19 + Vite 7 + Tailwind 4 + shadcn/ui ("new-york" style, neutral base, components under `client/src/components/ui`).
- Routing is **wouter** (not React Router). `<Switch>`/`<Route>` in `client/src/App.tsx`.
- State: TanStack Query via `@trpc/react-query`. `superjson` is the transformer on both ends.
- The dashboard / demo flow (Splash → Intro → Upload → Analyzing → Dashboard → Actions → Summary) lives under `client/src/pages/DemoExperience.tsx` and the `*Stage.tsx` components. `?clean=true` hides the chrome for full-screen presentations. The demo always renders **fictional** data.
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

Schema is in `drizzle/schema.ts`. Tables: `workspaces`, `users`, `invitations`, `clients`, `policies`, `reports`, `contactSubmissions`, `auditLog`, `paymentAttempts`, `messageGenerations`, `triggerHandled`, `clientFlags`, `clientActivities`, `clientReminders`, `messageTemplates`. Note: birth/policy dates are stored as `DATETIME` (not `DATE`) to support pre-1970 dates. Migrations are SQL files in `drizzle/*.sql` generated by `drizzle-kit`. Don't hand-edit the SQL; modify the schema and run `pnpm db:push`.

## Conventions

- **`_core/` folders are scaffold code** shared with the Manus WebDev template (auth SDK, tRPC setup, Vite glue, hooks, system router, LLM/storage/route helpers). Prefer extending app-level code (`server/routers.ts`, `server/db.ts`, `client/src/components/`) over editing `_core/`. New Express routes the app owns (iCount/Make) live in `_core/iCountRoutes.ts` / `_core/makeRoutes.ts` but are app-specific.
- **Type re-exports**: `shared/types.ts` re-exports `drizzle/schema` types and the shared `errors`. Import domain types from `@shared` (or directly from `drizzle/schema` server-side), not by reaching into `_core`.
- **Hebrew error messages** are user-visible — the codebase mixes English (logs, internal errors) with Hebrew (user-facing TRPCError messages). Match the surrounding style.
- **Israeli-specific validators** (Tax ID / תעודת זהות check digits, etc.) live in `server/ilValidators.ts` (`ilValidators.test.ts`).
- **Patches**: `wouter@3.7.1` is patched (see `patches/`). pnpm applies it automatically on install.
- **Branch policy** (per repo instructions): follow the branch specified in the active session; never push to other branches without explicit permission.

## Environment variables

Required / used for full functionality (see `server/_core/env.ts`):

- `DATABASE_URL` — MySQL connection string (also required by `drizzle.config.ts`)
- `JWT_SECRET` — HS256 signing key for the session cookie
- `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` — Manus OAuth
- `OWNER_OPEN_ID` — auto-grants `role=admin` + `isSuperAdmin=true` on user upsert
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` — LLM, storage, notification proxy
- `RESEND_API_KEY` — outbound email (optional; failures are swallowed)
- `PUBLIC_APP_URL` — public base URL used to build checkout return links (defaults to the Manus space URL)
- `PORT` — preferred port (server falls through to the next free one)
- **iCount billing**: `ICOUNT_API_TOKEN` (or legacy `ICOUNT_API_KEY`), `ICOUNT_API_USER`, `ICOUNT_COMPANY_ID`, `ICOUNT_BASE_URL` (defaults to `https://api.icount.co.il/api/v3.php`)
- **Make billing webhook**: `MAKE_PAYMENT_WEBHOOK_URL`, `MAKE_BILLING_SHARED_SECRET` (or legacy `MAKE_WEBHOOK_SECRET`)

When iCount/Make vars are unset, `billing.requestCheckout` falls back to the manual flow (notify SPARK via Manus + email Anat). Pricing source-of-truth is `PLAN_PRICES` in `server/billing.ts`.
