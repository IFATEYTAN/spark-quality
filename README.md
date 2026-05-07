<div dir="rtl">

# SPARK Quality

**SPARK Quality** היא פלטפורמת SaaS עברית-RTL לסוכנויות ביטוח ופיננסים בישראל, שפותחה על ידי **SPARK AI** (יפעת איתן ואנת גרינברג).

הסוכנים מעלים דוחות אקסל (בעיקר "מוצרים בניהול" של שורנס / קובצי מסלקה פנסיונית), המערכת מנתחת ומסווגת את הלקוחות לפי קטגוריות פיננסיות, מציגה הזדמנויות עסקיות בדשבורד יומי, ומכינה פניות מותאמות אישית בעזרת AI.

> פרויקט MVP / הדגמה חיה לשנת 2026 — לא תבנית גנרית. ה-spec הקנוני נמצא ב־`docs/PRODUCT_SPEC.md` והתסריט להדגמה ב־`docs/PRESENTATION_GUIDE.md`.

---

## עיקרי התכונות

- **העלאת דוחות** — drag-and-drop של קבצי אקסל, פירסור עם SheetJS בצד הלקוח (`client/src/lib/parseReport.ts`).
- **סיווג חכם ל־6 קטגוריות עסקיות** — VIP, תיקון 190, קרן השתלמות נזילה, דמי ניהול גבוהים, ריסק/מסתיים, פערי כיסוי.
- **דשבורד יומי** — KPIs (לקוחות, VIPs, נכסים נזילים, מועמדי תיקון 190, AUM), Action Center עם 6 כרטיסי קטגוריה, וטבלת לקוחות מסוננת.
- **מסע הדגמה (`/demo`)** — Splash → Intro → Upload → Analyzing → Dashboard → Actions → Summary. הוסיפו `?clean=true` להסתרת ה-shell בהדגמה על מקרן.
- **AI Composer** — חלונית שמנסחת מסרים אישיים ב-WhatsApp/Email לכל לקוח לפי `flagStatus`.
- **Multi-tenant** — הפרדת נתונים לפי `workspaceId`, סוכן רואה רק לקוחות שלו, מנהל/בעלים רואים את כל הסוכנות.
- **תפקידי משתמש** — `owner`, `admin`, `agent`, ובנוסף `isSuperAdmin` לצוות SPARK AI (גישה רוחבית עם audit log).
- **תמחור** — Base (150/180 ₪), Premium (350/420 ₪). חיוב iCount בהכנה.

---

## ה-6 קטגוריות (לוגיקת המוצר)

| `flagStatus` | טריגר | פעולה מוצעת |
| --- | --- | --- |
| `vip` | צבירה ≥ סף ה-VIP של ה-workspace (ברירת מחדל ₪1M) | פגישת ניהול הון, מוצרי פרמיום |
| `tikun_190` | גיל ≥ 60, צבירה ≥ ₪300K, המוצר אינו פנסיה | סימולציית משיכה פטורה ממס |
| `liquid_fund` | "השתלמות" וותק ≥ 6 שנים | המרה ל-IRA / פוליסת חיסכון |
| `high_fees` | צבירה ≥ ₪500K ללא הנחה, או היוריסטיקת תשואה נמוכה | שיחת שימור, הורדת דמי ניהול |
| `risk_ending` | סטטוס מכיל "ריסק" או "מסתיים" | פניית חידוש דחופה |
| `coverage_gaps` | אין מוצר פנסיוני/חיסכון בתיק | cross-sell פנסיה |

דירוג חומרה (כשיש התאמה למספר קטגוריות): `vip > tikun_190 > liquid_fund > high_fees > risk_ending > coverage_gaps > regular`. **VIP דביק** — ברגע שהוגדר, לא יורד גם ב-merges.

---

## עיצוב — "Editorial Fintech"

נייבי עמוק + זהב חמים, סריף עברי + Heebo. הפלטה המלאה ב־`client/src/index.css`. כל הטקסטים בעברית, RTL בלבד.

---

</div>

## Tech stack

- **Frontend:** React 19, Vite 7, Tailwind 4, shadcn/ui (new-york), wouter, TanStack Query, framer-motion, recharts, SheetJS.
- **Backend:** Node + Express + tRPC v11, Drizzle ORM (MySQL/TiDB), Zod, superjson.
- **Auth:** Manus OAuth + JWT cookie (`app_session_id`).
- **LLM:** Forge-proxied OpenAI-compatible endpoint (`gemini-2.5-flash`).
- **Storage:** Forge presigned URLs (S3 behind the scenes).
- **Email:** Resend (`noreply@spark-ai.co.il`).

## Quick start

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, OAuth, Forge keys
pnpm db:push           # generate + run migrations
pnpm dev               # http://localhost:3000 (auto-falls-through to next free port)
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (Express + Vite middleware, HMR) |
| `pnpm build` | Build client (`dist/public`) + bundle server (`dist`) |
| `pnpm start` | Run production build |
| `pnpm check` | `tsc --noEmit` (strict) |
| `pnpm test` | Vitest (server-side, Node env) |
| `pnpm format` | Prettier |
| `pnpm db:push` | `drizzle-kit generate && drizzle-kit migrate` |

Run a single test: `pnpm vitest run server/financial.test.ts`

> Package manager is **pnpm 10.x** (declared in `package.json#packageManager`). Don't use npm or yarn.

## Project layout

```
client/        React app (Vite). Pages, components, lib/parseReport.ts (Excel parsing).
server/        Express + tRPC. routers.ts, db.ts, billing.ts, email.ts, _core/ (scaffold).
shared/        Cross-cutting types and constants (re-exports drizzle/schema types).
drizzle/       schema.ts + generated SQL migrations. Don't hand-edit SQL.
docs/          PRODUCT_SPEC.md, PRESENTATION_GUIDE.md (canonical product + demo script).
patches/       pnpm patches (currently wouter@3.7.1).
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing |
| `/demo` | Full guided demo flow (`?clean=true` for projector mode) |
| `/onboarding` | Workspace setup + VIP threshold |
| `/upload` | Excel upload + parse |
| `/dashboard` | KPIs + Action Center + clients table |
| `/clients` | Full client list w/ filters |
| `/team` | Admin/owner — invitations + roles |
| `/admin` | Super-admin only — cross-workspace + audit log |
| `/pricing` | Plans (Base / Premium) |
| `/legal/{terms,privacy,accessibility}` | Static legal pages |

## Environment variables

See `server/_core/env.ts`. Required for full functionality:

- `DATABASE_URL` — MySQL/TiDB connection
- `JWT_SECRET` — HS256 session signing
- `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL` — Manus OAuth
- `OWNER_OPEN_ID` — auto-grants admin + super-admin
- `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` — LLM, storage, notification proxy
- `RESEND_API_KEY` — outbound email (optional, swallowed on failure)
- `ICOUNT_API_KEY`, `ICOUNT_COMPANY_ID` — billing (optional; falls back to manual flow)
- `PORT` — preferred port (server fallthrough to next free port)

The DB connection is **lazy** — without `DATABASE_URL` the server still boots; reads fall back to empty results so local tooling and tests can run dry.

## Testing

Vitest runs server-side tests in Node env. The Excel parsing tests fabricate input files via SheetJS:

- `server/parseReport.test.ts` — column matching + sheet selection
- `server/financial.test.ts` — classification + VIP stickiness

## Branch policy

Develop on the branch specified in the active session. Don't push to `main` or other branches without explicit permission.

## Known gaps (out of scope until unblocked)

1. **Live Shorens / pension-clearinghouse API** — blocked on commercial contract; manual Excel upload is the workaround.
2. **Accurate yield benchmarking** — blocked downstream of (1); current heuristic isn't market data.
3. **iCount billing** — pricing page is presentational; checkout flow not yet wired.
4. **External automations (Make/Zapier, CRM sync)** — roadmap only.

## License

MIT — see `package.json`. © SPARK AI.

<div dir="rtl">

---

**שאלות, תקלות או רעיונות:** anathemell@gmail.com

</div>
