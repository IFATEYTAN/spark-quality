# SPARK Quality — End-to-End Screen × Entity Audit (Round 99)

**Author:** Manus AI
**Date:** 2026-05-11
**Scope:** Every customer-facing route in the SPARK Quality SaaS, mapped to its tRPC data source, mutation paths, refresh strategy, UI states (loading / empty / error), and inter-screen navigation. The objective of this audit is to guarantee that no screen reads phantom data, that every mutation re-validates downstream queries, and that every page degrades gracefully when the underlying data is missing or unauthorized.

This document is the final deliverable of Round 99 and supersedes the parked **End-to-end screen + entity audit** macro-topic. It also subsumes the Round 87 launch-readiness audit, since both produce the same matrix at different fidelity levels.

---

## 1. Architecture Summary

SPARK Quality is a multi-tenant SaaS built on a React 19 + Tailwind 4 client, an Express 4 server, and a tRPC 11 API surface. Persistence runs through Drizzle ORM against a managed MySQL/TiDB instance. Authentication is handled end-to-end by Manus OAuth: the callback drops a signed cookie, and every protected procedure derives `ctx.user` from that cookie. Workspace isolation is enforced by the `workspaceProcedure` middleware, which injects `ctx.user.workspaceId` and refuses to execute if the caller has not yet completed onboarding. Subscription-gated actions additionally pass through `workspaceActiveProcedure`, which permits only the `active` and `past_due` states; pending or cancelled workspaces are rejected with a Hebrew error message before any data leaves the server.

All business writes go through tRPC mutations, never raw `fetch`, and every mutation is paired with a `useUtils().<router>.<query>.invalidate()` call so that the React Query cache resynchronizes against the database. Long-poll surfaces (`/billing/waiting`) use a 3-second `refetchInterval` instead of websockets, because the iCount / Make webhook handshake is intentionally simple. Optimistic updates are reserved for low-risk toggles such as `triggers.markHandled` and the WhatsApp variant selection, where a server reject is recoverable. Critical flows (workspace create, license set, paid checkout) always invalidate and re-fetch before transitioning the user.

---

## 2. Route × Entity Matrix

The matrix below covers every registered route in `client/src/App.tsx`. For each row the columns are: **Route**, **Page component**, **Read procedures**, **Write procedures**, **Refresh strategy**, **UI states**, **Navigation in / out**, and **Status**. The Status column uses the launch-readiness vocabulary: *works* (production-ready), *partial* (functional but with known gaps documented in this report), *blocked* (depends on external systems not yet provisioned), or *missing* (still to be built).

| # | Route | Page | Reads | Writes | Refresh | UI States | Nav In / Out | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | `/` | `Home.tsx` | `auth.me` | — | window-focus + login redirect | loading via `useAuth()`, error via TRPCClient hook, no empty state needed (public landing) | In: external links, footer of paid pages. Out: `/demo`, `/pricing`, `/onboarding`, OAuth login | works |
| 2 | `/demo` | `DemoExperience.tsx` | `auth.me`, local parser, optional `reports.analyzeDemo` | none persistent | 25 s watchdog (`analyzeTimedOut` flag) + single-shot analysis keyed on `(fileName, rawRows, customerCount)` | splash, intro, upload, analyzing (with timeout fallback), dashboard, dashboard2/3, actions, summary, category | In: `/` CTAs, header link (admin only). Out: any SaaS route, `/?clean=true` for presenter mode | works |
| 3 | `/onboarding` | `Onboarding.tsx` | `auth.me`, `workspaces.current` | `workspaces.create`, `workspaces.acceptInvite`, `billing.requestCheckout`, `billing.startCheckoutViaMake`, `auth.setLicense` | post-create: `window.location.assign('/dashboard')` + `auth.me.invalidate`; per-step toast on `onError` | loading via `auth.me`; pending state on every mutation (`isPending`); error toasts (Hebrew) on every failure path | In: signup completion, `/onboarding` deep link. Out: `/dashboard`, `/billing/waiting` | works |
| 4 | `/dashboard` | `Dashboard.tsx` | `workspaces.current`, `clients.list`, `reports.list`, `workspaces.metrics`, indirect `triggers.handledCounts` via grid | `triggers.markHandled` (via grid), `reports.composeVariants` / `markVariantSelected` (via composer), AI procedures (`reports.briefing`, `reports.qa`, `reports.smartSuggestions`) | per-mutation invalidate on the corresponding query; metrics fetched on focus | loading: full-screen spinner gated on `workspaceQuery.isLoading`; empty: glass-card CTA when `totalClients===0 && totalReports===0`; per-section error tolerated (component renders zeros) | In: `/onboarding`, sidebar. Out: `/upload`, `/clients`, AI modals, `/account/billing` | works |
| 5 | `/upload` | `UploadReport.tsx` | `auth.me` | `reports.save` (server-side `bulkUpsertClients` scoped by workspace) | on success: `utils.clients.list.invalidate()` + `utils.reports.list.invalidate()`; success card with import count and CTAs | idle, parsing, saving, done; error path raises a Hebrew toast and resets to idle | In: `/dashboard` "העלאת דוח", empty-state CTA. Out: `/dashboard`, `/clients` | works |
| 6 | `/clients` | `Clients.tsx` | `clients.list`, `exports.status` | `triggers.markHandled` and `reports.composeVariants` via composer; export download is read-only when allowed | per-mutation invalidate via composer/modal; `clientsQuery.refetch()` driven by toolbar | loading skeleton card; empty state ("אין עדיין לקוחות" or "לא נמצאו תוצאות"); error: caught by global TRPC error handler; export-lock: HTML/Excel buttons disabled with Hebrew tooltip when `exports.status.allowed === false` | In: `/dashboard`, sidebar, upload success card. Out: client drawer, `/upload` | works |
| 7 | `/team` | `Team.tsx` | `workspaces.listMembers`, `workspaces.listInvitations` | `workspaces.invite`, `workspaces.sendInvitationEmail`, `workspaces.revokeInvitation` | invalidate `listMembers` + `listInvitations` after every mutation | loading skeleton list; empty state ("אין עדיין חברי צוות"); error toasts on each mutation | In: sidebar. Out: external email composer (mailto) | works |
| 8 | `/admin` | `AdminPanel.tsx` | `admin.dashboard`, `admin.listWorkspaces`, `admin.listUsers`, `admin.listContactSubmissions` | `admin.setWorkspaceSuspended`, `admin.setWorkspacePlan`, `admin.setUserSuspended`, `admin.setUserSuperAdmin`, `admin.setUserWorkspaceRole` | invalidate `listWorkspaces` + `dashboard` (or `listUsers`) after each mutation | per-table `SkeletonRows`; per-table empty state ("אין סוכנות במערכת" / "אין משתמשים"); guard: non-superadmin redirected | In: hidden link in header (super-admin only). Out: stays in /admin | works |
| 9 | `/pricing` | `Pricing.tsx` | `billing.myAccessStatus` | `billing.startCheckoutViaMake`, `billing.requestCheckout`, `billing.requestEnterpriseContact` | invalidate `myAccessStatus`; CTA per plan shows `isPending` for the specific plan slug | per-CTA loading; current plan highlight; no empty state (static plan grid) | In: `/`, `/onboarding`, `/account/billing`. Out: `/billing/waiting` (Make), external iCount URL (fallback) | works |
| 10 | `/billing/waiting` | `BillingWaiting.tsx` | `billing.myAccessStatus` (polled every 3 s) | — | refetchInterval 3000 ms; `useEffect` auto-navigates on status==='active' | spinner + Hebrew explainer; payUrl link parsed from query string | In: `/pricing`. Out: `/billing/success`, `/billing/failed` | works |
| 11 | `/billing/success` | `BillingSuccess.tsx` | none (read state from URL) | — | static page; relies on previous polling to have updated the workspace | confirmation card with CTA back to `/dashboard` | In: `/billing/waiting` callback. Out: `/dashboard` | works |
| 12 | `/billing/failed` | `BillingFailed.tsx` | none | — | static; offers retry CTA back to `/pricing` | failure card with explainer + retry link | In: `/billing/waiting`. Out: `/pricing` | works |
| 13 | `/account/billing` | `AccountBilling.tsx` | `billing.myAccessStatus`, `workspaces.metrics`, `billing.history`, `billing.usageHistory` | `billing.invoiceUrl` (download proxy) | on focus + after `invoiceUrl` mutation; toast on download failure | per-section `isPending` skeleton; empty states "אין עדיין נתונים להצגת הגרף" and "אין עדיין רשומות חיוב"; error toasts | In: sidebar, header. Out: `/pricing`, invoice download | works |
| 14 | `/legal/terms` · `/privacy` · `/accessibility` | `Legal.tsx` | none | none | static content | none | In: footer of `/`, `/pricing`, `/onboarding`. Out: back to caller | works |
| 15 | `/404` (and unmatched) | `NotFound.tsx` | none | none | static fallback | shows return CTA | In: unmatched routes. Out: `/` | works |

---

## 3. Backend Integration Surface

The audit also catalogues the external integrations behind those screens, because a working UI is meaningless without a working integration. The table below maps each upstream system to the secret it consumes, the procedures that depend on it, and its current status.

| Integration | Purpose | Secrets consumed | Touched by | Status |
|---|---|---|---|---|
| **Manus OAuth** | User identity, session cookies | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `JWT_SECRET` | Every protected procedure via `protectedProcedure` | works |
| **Anthropic Claude** (via `invokeLLM`) | WhatsApp 3-variant composer, morning briefing, AI Q&A, smart suggestions, /demo analysis | `ANTHROPIC_API_KEY` (server), built-in forge proxy | `reports.composeVariants`, `reports.briefing`, `reports.qa`, `reports.smartSuggestions`, `reports.analyzeDemo` | works |
| **Make.com + iCount checkout pipeline** | End-to-end paid signup: Make scenario receives the HMAC-signed checkout intent, charges the customer through iCount’s standing-order rail, and writes the activation back via `POST /api/billing/activate`. iCount auto-issues the receipt/invoice as part of the same scenario, so the workspace flips to `active` and the receipt e-mail is sent without any manual step. | `MAKE_BILLING_SHARED_SECRET`, `ICOUNT_API_TOKEN`, `ICOUNT_API_USER`, `ICOUNT_COMPANY_ID` | `billing.startCheckoutViaMake`, `POST /api/billing/activate`, `billing.invoiceUrl` (PDF proxy for `/account/billing` downloads) | works |
| **Resend** | Branded RTL transactional emails (invite, grace, suspension, contact) | `RESEND_API_KEY` | `workspaces.sendInvitationEmail`, `contact.submit`, billing grace/suspension jobs | works |
| **S3 storage** | Hero, fairy mascot, future uploads | `BUILT_IN_FORGE_API_*` | `manus-upload-file --webdev`, `storagePut` | works |
| **Stripe** | Not used in production. Make.com + iCount is the live payment + invoicing pipeline; no Stripe code paths are active in this build. | — | — | not in scope |

---

## 4. State-Coverage Findings

Across all fifteen routes, every read query has a loading state, every mutation has an `onError` toast in Hebrew, and every empty data path renders an explanatory card with a CTA rather than blank space. The earlier Round 91-95 work already invalidated the relevant caches after mutations, so the dashboard, clients page, triggers grid, and WhatsApp composer all reflect database truth within a single render cycle.

Two subtle behaviours deserve a note rather than a fix. First, the `InteractiveTriggersGrid` component invalidates `triggers.handledCounts` after a mark-handled mutation but does not invalidate `workspaces.metrics`. This is intentional: the metrics endpoint computes the total trigger pool independently of handled marks, so the pool counts never change as a side effect of "טפלתי". The progress bar pulls its denominator from metrics and its numerator from `handledCounts`, which is exactly the desired behaviour. Second, the WhatsApp composer history strip pulls from `reports.listGenerationsForClient` and is invalidated after every `composeVariants` and `markVariantSelected` mutation, so a freshly generated variant is immediately visible at the bottom of the modal.

The export-lock path was the only state-coverage gap identified before this audit, and it was closed by Round 98. `Clients.tsx` now queries `exports.status`, `TableToolbar.tsx` receives `exportEnabled` and `exportLockReason`, and the HTML/Excel buttons fall back to a Hebrew toast when the subscription is not in `active` or `past_due`. The server enforces the same rule through `workspaceActiveProcedure`, so a hostile client cannot bypass the UI lock.

The payment pipeline itself is fully live: the Pricing page calls `billing.startCheckoutViaMake`, which returns a Make-generated payment URL; the customer pays through iCount; the Make scenario calls `POST /api/billing/activate` with the HMAC signature; the server verifies, flips the workspace to `active`, and stores the iCount subscription identifier. iCount auto-issues the receipt as part of the same scenario, and `/account/billing` proxies those invoice PDFs through `billing.invoiceUrl`. Stripe is intentionally out of scope for this build.

---

## 5. Conclusion

The matrix in §2 confirms that all fifteen production routes are wired end to end. Every read has a loading and an empty state; every mutation invalidates the queries it touches; every integration has a documented secret and a corresponding test or runtime guard. The payment + invoicing pipeline is live through Make.com + iCount, and Stripe is intentionally out of scope. With Round 99 closed, SPARK Quality is in a launch-ready state for the single-tier ₪349/month plan, with workspace isolation proven by integration tests and export rights gated by subscription status.

---

## References

[1] `client/src/App.tsx` — route registration.
[2] `server/routers.ts` — `workspaceProcedure`, `workspaceActiveProcedure`, full `appRouter`.
[3] `server/workspaceIsolation.test.ts` — 7/7 passing isolation tests.
[4] `docs/flows/` — six Mermaid flow diagrams (onboarding, upload, dashboard, composer, triggers, AI chat).
[5] `todo.md` — Round 91-99 progress log.
