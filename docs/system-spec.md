# SPARK Quality — מסמך אפיון מערכת מקיף

**גרסה:** 1.0  
**עדכון אחרון:** 11 במאי 2026  
**Checkpoint עוגן:** `9a7736cf` · `manus-webdev://9a7736cf`  
**Published domain:** `sparkquality-zqvpyevd.manus.space`  
**Repository:** `IFATEYTAN/she.e.o` (private)

---

## 1. תקציר מנהלים

SPARK Quality היא פלטפורמת SaaS מבוססת AI המיועדת לסוכני ביטוח ולסוכנויות ביטוח בישראל. המערכת קולטת את דוחות הניוד והעמלות שמופקים אצל ה-IBI/הראל/מנורה/מגדל וכו', מעבדת אותם באמצעות מנוע ניתוח אוטומטי, ומפיקה רשימת **טריגרים מנוהלים** — הזדמנויות עסקיות מדורגות לפי עדיפות (P0–P4) שכל אחת מהן מקושרת ללקוח קונקרטי בתיק. הסוכן מקבל ממשק עבודה יומיומי שכולל לוח בקרה, רשימת לקוחות מסוננת לפי טריגרים, מחולל הודעות וואטסאפ מבוסס Claude, וייצוא נתונים מלא — והכול תחת תוכנית מנוי יחידה (SPARK Quality) במודל פר-סוכנות.

המסמך מתאר את הארכיטקטורה, הישויות, מסעות המשתמש, האינטגרציות החיצוניות, סטטוס הפיתוח נכון לעדכון האחרון, מה שנותר לטפל בו, ותוכנית הטמעת MVP לסוכנים הראשונים.

---

## 2. ארכיטקטורה כללית

### 2.1 שכבות המערכת

המערכת בנויה כ-**monorepo** יחיד (TypeScript end-to-end) הכולל לקוח React, שרת Express+tRPC, ובסיס נתונים MySQL/TiDB. אין שום שכבת REST בין הלקוח לשרת — כל התקשורת עוברת ב-tRPC על גבי HTTP, עם Superjson כדי לשמר טיפוסים כמו `Date` ו-`Decimal`. החוזה בין צד הלקוח לצד השרת הוא **קובץ ה-procedures ב-`server/routers.ts`**, ולקוח ה-tRPC מהדק את הטיפוסים בקומפילציה כך שאי-אפשר לקרוא ל-procedure בחתימה שגויה.

| שכבה | טכנולוגיה | תפקיד |
|---|---|---|
| Frontend | React 19, Tailwind 4, shadcn/ui, wouter | SPA, RTL, ניווט עם wouter, אנימציות ב-tailwind+CSS |
| API & Auth | Express 4 + tRPC 11 + Manus OAuth | מסלול אחד `/api/trpc/*`, OAuth callback ב-`/api/oauth/callback` |
| AI | Claude (דרך Manus Forge built-in LLM) | ניתוח, יצירת הודעות, Briefing, Q&A |
| File parsing | xlsx, custom parsers | פענוח דוח הראל ושורנס; קליטת אקסל גנרי |
| DB | MySQL/TiDB דרך Drizzle ORM | 13 טבלאות, מיגרציות מ-`drizzle/migrations` |
| Storage | S3 דרך Manus Storage proxy | קבצי דוחות מקור + נכסים סטטיים |
| Email | Resend | מיילים אופרטיביים (חשבונית, הזמנה, קונטקט) |
| Payments | iCount דרך Make.com webhook | סליקה + חשבוניות אוטומטיות |
| Notifications | Manus owner-notification API | התרעות לבעלת המוצר על אירועים מערכתיים |
| Hosting | Manus Space | sparkquality-zqvpyevd.manus.space |

### 2.2 תרשים זרימה (High-Level)

```
                ┌──────────────────────────────────────────────────┐
                │                  Browser (RTL)                   │
                │  Home → Onboarding → Dashboard → Clients → ...   │
                └──────────────────────────────────────────────────┘
                                       │
                                  tRPC (Superjson, /api/trpc)
                                       │
                ┌──────────────────────────────────────────────────┐
                │   Express server                                  │
                │   ┌──────────────┐  ┌──────────────┐              │
                │   │ Auth router  │  │ Workspace    │              │
                │   │  (Manus OAuth)│  │ procedures   │              │
                │   └──────────────┘  └──────────────┘              │
                │   ┌──────────────┐  ┌──────────────┐              │
                │   │ Reports/AI   │  │ Triggers     │              │
                │   └──────────────┘  └──────────────┘              │
                │   ┌──────────────┐  ┌──────────────┐              │
                │   │ Billing      │  │ Exports      │              │
                │   └──────────────┘  └──────────────┘              │
                │   ┌──────────────┐                                │
                │   │ iCount routes│  ← /api/icount/notify           │
                │   └──────────────┘                                │
                └──────────────────────────────────────────────────┘
                       │              │                  │
                ┌──────▼──────┐ ┌─────▼────────┐  ┌──────▼─────┐
                │ MySQL/TiDB  │ │ Manus LLM    │  │ Make.com   │
                │ (Drizzle)   │ │ (Claude)     │  │ webhook    │
                └─────────────┘ └──────────────┘  └─────┬──────┘
                                                       │
                                              ┌────────▼────────┐
                                              │   iCount API     │
                                              │ Hosted Checkout  │
                                              │ + Invoicing      │
                                              └─────────────────┘
```

### 2.3 בקרת גישה רב-שכבתית

הגישה לכל endpoint עוברת דרך שרשרת מידלוורים, מהקל לכבד:

1. **`publicProcedure`** — endpoint שיכול להיקרא ללא session (למשל `auth.me`, `contact.send`).
2. **`protectedProcedure`** — דורש משתמש מחובר; שגיאת 10001 חוזרת אם אין session.
3. **`workspaceProcedure`** — דורש משתמש מחובר השייך ל-`workspaceId` כלשהו; שולף `ctx.user.workspaceId` ומבטיח שכל שאילתת DB תסונן לפיו (Round 96).
4. **`workspaceAdminProcedure`** — דורש שתפקיד המשתמש בסביבת העבודה הוא `admin` (יוצר הסוכנות).
5. **`workspaceActiveProcedure`** — דורש מנוי `active` או `past_due` כדי לאפשר פעולות שמורות (ייצוא נתונים).
6. **`adminProcedure`** — דורש שהמשתמש הוא ה-OWNER של ה-deployment עצמו (לצורכי admin panel).

הפרדה זו מבטיחה ש-**אין שום procedure שנוגע בנתוני workspace ללא סינון לפי `workspaceId`** — נכון לעדכון האחרון, מבחן ה-RLS המאמת זאת מצליח 7/7.

---

## 3. ישויות הליבה (Entity Inventory)

המערכת מתחזקת 13 טבלאות בבסיס הנתונים, מתועדות ב-`drizzle/schema.ts`. הטבלה הבאה מציגה את הישויות העיקריות, מפתחות הקישור ביניהן, ואת הסטטוס בעמודה הימנית.

| טבלה | תפקיד | מפתחות חיצוניים | רשומות כיום |
|---|---|---|---|
| `workspaces` | סוכנות ביטוח כלקוח של המערכת. כוללת שם, מספר חברה, סטטוס מנוי, מחזור חיוב | — | 5 |
| `users` | משתמש ספציפי בתוך workspace; שדה `role` קובע admin/agent | `workspaceId → workspaces.id` | 6 |
| `invitations` | הזמנת חבר צוות חדש לסוכנות | `workspaceId`, `invitedByUserId` | — |
| `clients` | לקוח קצה של הסוכן — מזוהה ב-ת.ז | `workspaceId` | 1,460 |
| `policies` | פוליסה בודדת של לקוח (יחס 1:N עם clients) | `workspaceId`, `clientId` | 0 (מודל מוכן, אכלוס מתוכנן) |
| `reports` | דוח (אקסל) שעלה למערכת, כולל metadata + מפתח S3 | `workspaceId`, `uploadedByUserId` | 11 |
| `actionItems` | פעולה ש-AI הציע לסוכן (TODOs יומיים) | `workspaceId`, `clientId` | — |
| `triggerHandled` | סימון של טריגר מסוים כ"טופל" עבור לקוח מסוים. UNIQUE על (workspace, client, triggerKey) | `workspaceId`, `clientId`, `handledByUserId` | 0 |
| `messageGenerations` | פלט של מחולל ה-AI להודעת וואטסאפ; שומר 3 הווריאציות + הבחירה | `workspaceId`, `clientId`, `createdByUserId` | 0 |
| `paymentAttempts` | רישום של ניסיון תשלום מול iCount/Make (מצב, סכום, ref) | `workspaceId`, `userId` | 5 |
| `contactSubmissions` | פנייה דרך טופס "צרו קשר" באתר | — (visitor data only) | 162 |
| `auditLog` | יומן ביקורת לפעולות רגישות (שדרוג, הזמנה, מחיקה) | `workspaceId`, `actorUserId` | — |
| `__drizzle_migrations` | מטא של Drizzle ORM | — | — |

### 3.1 דיאגרמת קשרים פשוטה

```
workspaces ──┬─< users
             ├─< invitations
             ├─< clients ──< policies
             │      │
             │      ├─< triggerHandled
             │      └─< messageGenerations
             ├─< reports
             ├─< actionItems
             ├─< paymentAttempts
             └─< auditLog
```

הקשר `workspace → client → policy/triggerHandled/messageGeneration` הוא העיקרון המארגן: כל ההיגיון העסקי "תלוי-לקוח" מקושר ל-clientId, וכל הלקוחות שייכים בדיוק ל-workspace אחד. אין שיתוף לקוחות בין סוכנויות — זו הבסיס לבידוד הרב-דיירים.

---

## 4. צד-לקוח (Frontend)

### 4.1 רישום מסכים ומסלולים

המערכת חושפת 14 מסלולים ציבוריים/פרטיים מ-`client/src/App.tsx`:

| מסלול | רכיב | סטטוס | מטרה |
|---|---|---|---|
| `/` | `Home` | live | דף נחיתה ציבורי, hero, יתרונות, pricing יחיד עם toggle |
| `/demo` | `DemoExperience` | live | מסע דמו אינטראקטיבי עם 7 שלבים (אורח/אדמין) |
| `/onboarding` | `Onboarding` | live | רישום ראשוני: פרטי סוכנות → פרטי חיוב → מעבר ל-Make checkout |
| `/dashboard` | `Dashboard` | live | לוח KPI ראשי + InteractiveTriggersGrid |
| `/team` | `Team` | live | חברי הצוות, הזמנת חבר חדש, ניהול הרשאות |
| `/upload` | `UploadReport` | live | העלאת קובץ דוח, פירוק, יצירת clients/reports |
| `/clients` | `Clients` | live | טבלת לקוחות מסוננת לפי triggerKey/חיפוש |
| `/admin` | `AdminPanel` | live | פאנל admin (לבעלים בלבד) — מבט-על על כל ה-workspaces |
| `/pricing` | `Pricing` | live | תוכנית יחידה + toggle חודשי/שנתי |
| `/billing/waiting` | `BillingWaiting` | live | מסך post-redirect מ-Make בעת המתנה לאישור |
| `/billing/success` | `BillingSuccess` | live | אישור תשלום + חזרה ללוח |
| `/billing/failed` | `BillingFailed` | live | מסך כישלון תשלום עם retry |
| `/account/billing` | `AccountBilling` | live | היסטוריית חיוב, חשבוניות, ניהול מנוי |
| `/legal/*` | `Legal` | live | תנאי שימוש, פרטיות, נגישות |

### 4.2 קומפוננטות משותפות בולטות

- **`DashboardLayout`** (`client/src/components/DashboardLayout.tsx`) — Layout עם סייד-בר קבוע, שימוש בכל המסכים הפנימיים.
- **`InteractiveTriggersGrid`** + **`InteractiveTriggerCard`** — תצוגת הטריגרים בלוח הראשי: ספירה, progress bar, וכפתורי "צפה ברשימה" / "שלח וואטסאפ" / "טופל".
- **`TriggerClientsModal`** — slide-over שמציג את כל הלקוחות המקושרים לטריגר נבחר, כל שורה עם פעולות.
- **`WhatsAppComposerModalV2`** — מחולל ההודעות; שלושה טאבים, copy + open in WhatsApp, היסטוריה ללקוח.
- **`AIChatBox`** — מנוע ה-Smart Q&A על תיק הלקוחות.

### 4.3 ניהול state

ה-stack ב-`@tanstack/react-query` מנהל את כל הקאש של ה-tRPC. דפוס ה-invalidation שבו אנחנו משתמשים בעיקר:

```ts
const utils = trpc.useUtils();
const mutation = trpc.triggers.markHandled.useMutation({
  onSuccess: () => {
    utils.workspaces.metrics.invalidate();
    utils.triggers.handledCounts.invalidate();
  },
});
```

לפעולות UI מהירות (toggle, סימון כטופל) משתמשים ב-optimistic updates דרך `onMutate`/`onError`.

---

## 5. צד-שרת (Backend)

### 5.1 ה-`appRouter`

`server/routers.ts` בנוי משמונה תת-routers, כל אחד מאוגד תחת `appRouter`:

| Router | מספר procedures | אחריות |
|---|---|---|
| `contact` | 1 | שמירת פניות מ-"צרו קשר" + מייל לבעלים |
| `auth` | 3 | `me`, `logout`, `setLicense` |
| `workspaces` | ~12 | יצירה, חברי צוות, הזמנות, פרטי חיוב, metrics |
| `clients` | 4 | רשימה, get, create, update |
| `reports` | ~9 | רשימה, שמירה, ניתוח AI, briefing, Q&A, מחולל הודעות |
| `triggers` | ~6 | listClients, markHandled, unmarkHandled, handledCounts |
| `exports` | 2 | status (האם הייצוא נעול), clientsCsv |
| `_system` (admin) | 1 | `notifyOwner` |

מספר ה-procedures הכולל הוא בערך 50; הם מתחלקים לשני סוגים: שאילתות (queries — קריאה בלבד) ופעולות (mutations — כותבות).

### 5.2 פיענוח דוחות

ה-engine ב-`server/parseReport.ts` (ו-`parseSurenseReport.ts` ספציפית לפורמט שורנס) פותח קבצי xlsx באמצעות הספרייה `xlsx`, מזהה את ה-tab הרלוונטי, מנקה רשומות, ומפיק שני אובייקטים: רשימת לקוחות מנורמלת (ת.ז → מטא־נתונים) ו-payload של פוליסות. הקובץ נשמר ב-S3 (Manus Storage proxy) עם המפתח `report-<workspaceId>-<reportId>.xlsx`, וה-row של `reports` שומר רק את ה-key+url.

### 5.3 בידוד דיירים (Multi-Tenant Isolation)

החוק היסודי: **כל procedure שלא מבצע operation גלובלי חייב לעבור ב-`workspaceProcedure`**, שזורק `FORBIDDEN` אם `ctx.user.workspaceId` חסר, ומציב את המזהה כפרמטר לכל db query downstream. הוכחת ה-RLS נמצאת ב-`server/workspaceIsolation.test.ts` — 7 מבחנים שיוצרים שתי סביבות עבודה עם נתונים מזויפים ומאמתים שאף תוצאה של workspace A לא דולפת ל-workspace B.

---

## 6. שימוש בכלי AI חיצוניים

### 6.1 Claude (Manus built-in LLM)

המערכת משתמשת ב-`invokeLLM` (`server/_core/llm.ts`) — wrapper על המודל הפנימי של Manus (Claude family). הקריאות הפעילות ב-`server/routers.ts`:

| שורה ב-routers.ts | פעולה | מטרה |
|---|---|---|
| 633 | `reports.analyze` | ניתוח דוח חדש שעלה; זיהוי טריגרים, סיווג P0–P4 |
| 682 | `reports.compose` | יצירת הודעת וואטסאפ בסיסית (legacy single-variant) |
| 699 | `reports.briefing` | תדריך פגישה עם לקוח (סיכום AI) |
| 722 | `reports.clientSummary` | סיכום-תיק לפגישה — multi-line summary |
| 738 | `reports.qa` | Smart Q&A על הדוח כולו |
| 754 | `reports.smartSuggestions` | המלצות יומיות (rich actionItems) |
| 818 | `reports.composeVariants` | מחולל ה-3-וריאציות החדש (Round 92) |

הפרמטרים מועברים כ-`messages: [{role:'system'|'user', content}]`. עבור פלט JSON-structured (למשל 3 הוריאציות), אנו משתמשים ב-`response_format: { type:'json_schema', strict:true }` שמכריח את המודל להחזיר אובייקט שעובר ולידציה ב-zod. אם המודל מחזיר תוכן שאינו תואם, המידע נשמר ב-`auditLog` והמשתמש מקבל הודעה הולמת.

### 6.2 שיקולי פרטיות בקריאות LLM

הקריאות יוצאות עם BUILT_IN_FORGE_API_KEY שמסופק על-ידי Manus, על גבי endpoint פנימי. אנחנו **לא** שולחים ל-LLM את ה-PII הרגיש (ת.ז, כתובת מלאה) — רק שדות נצרכים לניתוח (סוג מוצר, סכום, תאריך, סטטוס). כל לוג של פנייה ל-LLM נשמר ב-`auditLog` עם hash של ה-prompt וה-tokens שנצרכו, מבלי לשמור את ה-PII עצמו.

### 6.3 Voice / Image / Storage helpers

בנוסף ל-Claude, המערכת כוללת `transcribeAudio`, `generateImage`, ו-`storagePut`/`storageGet` המסופקים על-ידי Manus. נכון לעדכון האחרון, רק storage נמצא בשימוש ב-production (לאחסון דוחות xlsx). transcribeAudio ו-generateImage מוכנים לשימוש אך לא מחווטים לזרימה כיום.

---

## 7. אינטגרציות חיצוניות

### 7.1 Make.com → iCount (סליקה וחשבוניות) — LIVE

נכון לעדכון האחרון, זו זרימת התשלום היחידה שמופעלת. הזרימה:

1. ב-`/onboarding` הסוכן מסיים למלא פרטי חיוב.
2. ה-frontend קורא ל-`billing.startCheckoutViaMake` ב-tRPC.
3. ה-server שולח POST ל-`MAKE_PAYMENT_WEBHOOK_URL` עם payload חתום ב-HMAC (`MAKE_BILLING_SHARED_SECRET`).
4. Make scenario פותח דף סליקה ב-iCount Hosted Checkout עם פרטי הסוכנות.
5. בעת תשלום מוצלח, iCount מנפיק חשבונית אוטומטית ושולח אותה במייל.
6. iCount שולח notification ל-`/api/icount/notify` ב-server שלנו (HMAC verified).
7. ה-server מעדכן `paymentAttempts.status='completed'` ומשנה את `workspaces.subscriptionStatus='active'`.

### 7.2 Resend (Email)

מיילים אופרטיביים: הזמנת חבר צוות, התראת ביטול מנוי, אישור התקבל "צרו קשר". משתמשים ב-`RESEND_API_KEY` ב-`server/email.ts` עם templates HTML ב-`server/emailTemplates.ts`.

### 7.3 Manus OAuth

הכניסה למערכת מבוצעת דרך Manus OAuth: המשתמש לוחץ "כניסה" → `getLoginUrl()` בונה URL עם origin + returnPath → המשתמש חוזר ל-`/api/oauth/callback` → cookie מותקן → `auth.me` מחזיר את המשתמש.

### 7.4 Manus Owner Notification

ה-helper `notifyOwner({title,content})` שולח התראה ל-dashboard של Manus עבור בעלת המוצר. בשימוש בעת: הצטרפות workspace חדש, תשלום שעבר/נכשל, פנייה מטופס צרו קשר, שדרוג quota מעבר לסף.

### 7.5 סיכום משתני סביבה

| משתנה | תפקיד | מקור |
|---|---|---|
| `JWT_SECRET` | חתימת cookies של session | Manus |
| `DATABASE_URL` | חיבור MySQL/TiDB | Manus |
| `BUILT_IN_FORGE_API_URL`/`KEY` | LLM, Storage, Notifications | Manus |
| `ICOUNT_API_TOKEN` / `_USER` / `_COMPANY_ID` | iCount Hosted Checkout | המשתמש |
| `MAKE_PAYMENT_WEBHOOK_URL` | כתובת ה-scenario ב-Make | המשתמש |
| `MAKE_BILLING_SHARED_SECRET` | חתימת HMAC לוובהוקים | המשתמש |
| `RESEND_API_KEY` | שליחת מיילים | המשתמש |
| `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL` | Manus OAuth | Manus |
| `OWNER_OPEN_ID`, `OWNER_NAME` | בעלת המוצר | Manus |
| `ANTHROPIC_API_KEY` | קיים אך עוקף את ה-Manus Forge בקריאות ישירות (במקרים נדירים) | המשתמש (לא חובה) |

---

## 8. מסעות משתמש מרכזיים

### 8.1 רישום סוכנות חדשה

1. **כניסה ל-`/`**: מבקר רואה את דף הנחיתה, ה-pricing card (תוכנית יחידה).
2. **לחיצה על "הצטרפו ל-SPARK Quality"**: המבקר מועבר ל-`/onboarding` כאשר ה-cycle (monthly/yearly) נשמר ב-query string.
3. **ב-`/onboarding`**: ממלא פרטי סוכנות (שם, ע"מ, מספר חברה), פרטי איש קשר, מסכים על תנאי השימוש.
4. **כפתור "מעבר לתשלום"**: השרת יוצר `workspace` עם סטטוס `pending`, יוצר `paymentAttempt`, ושולח את ה-payload ל-Make.
5. **דף הסליקה (iCount Hosted)**: הסוכן מזין פרטי כרטיס, לוחץ "שלם".
6. **חזרה ל-`/billing/success`**: ה-server מקבל את ה-notification מ-iCount → מעדכן את ה-workspace ל-`active` → המשתמש רואה רשימת checklists של "מה לעשות עכשיו".
7. **מעבר ל-`/upload`**: ההזמנה לעלות את הדוח הראשון.

### 8.2 שגרה יומית של הסוכן

1. **כניסה ל-`/dashboard`**: רואה את ה-priority-bar (חמש מספרי-המפתח של התיק) ואת ה-InteractiveTriggersGrid.
2. **לחיצה על טריגר** (למשל "ייפוי כוח חסר · P0"): נפתח slide-over עם רשימת הלקוחות המסומנים.
3. **בחירת לקוח** → לחיצה על "שלח וואטסאפ" → נפתח `WhatsAppComposerModalV2` עם 3 וריאציות שיצרה Claude.
4. **בחירת וריאציה → "פתח בוואטסאפ"** → wa.me deep-link פותח ה-WhatsApp Web/Desktop של הסוכן.
5. **חזרה ל-Composer** → "סמן כטופל" → רשומת `triggerHandled` נכנסת לבסיס הנתונים, ה-progress bar בדשבורד מתעדכן אוטומטית (cache invalidation).

### 8.3 העלאת דוח חדש

1. **`/upload`**: גרירה / בחירת קובץ xlsx (עד 25MB).
2. **`reports.save`**: השרת מעלה את הקובץ ל-S3, יוצר `report` row.
3. **`reports.analyze`**: בקשת ניתוח ל-LLM → קביעת clients חדשים/קיימים, יצירת actionItems.
4. **הצגת סיכום**: "150 לקוחות נמצאו, 12 P0 חדשים, 23 P1 חדשים..." + כפתור "המשך ללוח".

### 8.4 ניהול צוות

1. **`/team`**: רואה את חברי הצוות הקיימים + טופס הזמנה.
2. **הזמנה**: ה-admin מזין מייל, ה-server יוצר `invitation` עם token, שולח מייל דרך Resend עם URL invitation.
3. **קבלת הזמנה**: המוזמן לוחץ → OAuth → `invitations.accept` → row חדש ב-`users` עם `workspaceId` משוייך.

---

## 9. מודל התמחור

נכון לעדכון האחרון, המערכת מציעה תוכנית **אחת** ציבורית + פניה ל-Enterprise:

| תוכנית | מחיר חודשי | מחיר שנתי (לחודש) | סך שנתי | חיסכון | יכולות |
|---|---|---|---|---|---|
| **SPARK Quality** | ₪349 | ₪297 | ₪3,567 | 15% | ∞ לקוחות, 16 טריגרים (P0–P4), AI מלא, צוות ∞, ייצוא מלא |
| **Enterprise** | ליצירת קשר | ליצירת קשר | ליצירת קשר | — | כל מה שב-SPARK Quality + הטמעה, SLA, חיבור ל-CRM |

החלטה זו הוטמעה ב-Round 97: ה-`shared/planFeatures.ts` שומר על 4 slug-ים ב-enum (`basic`, `pro`, `premium`, `enterprise`) משום ש-DB rows ישנים מתייחסים אליהם, אך **כל ה-features פתוחים ברמת `basic`** ו-`pricing.ts` ב-frontend מציג רק את התוכנית האחת. עוד התווסף `workspaceActiveProcedure` שחוסם ייצוא נתונים אם המנוי לא `active`/`past_due` — כדי למנוע מסוכן להוריד את כל ה-CSV ואז לבטל את המנוי באותו ערב.

ה-A/B testing על ה-headline מבוצע דרך `shared/copy.ts`: שלוש וריאציות (`default`, `roi-focused`, `outcome-focused`) זמינות לבחירה דרך החלפת קבוע יחיד. לקוח מהדף הראשי וגם `/pricing` קוראים את אותו ה-copy.

---

## 10. סטטוס נוכחי

### 10.1 מה עובד ב-production (live)

- ✅ Onboarding מלא, OAuth, יצירת workspace, ניהול צוות והזמנות.
- ✅ העלאת דוח, פירוק, יצירת clients/policies/reports, אחסון ב-S3.
- ✅ ניתוח LLM של דוח, יצירת טריגרים, classification P0–P4.
- ✅ דשבורד אינטראקטיבי, InteractiveTriggersGrid, סימון טריגר כטופל (idempotent).
- ✅ מחולל וואטסאפ מבוסס Claude (3 וריאציות), היסטוריית הודעות פר-לקוח.
- ✅ Smart Q&A, Briefing, סיכום-תיק לפגישה.
- ✅ Pricing יחיד עם toggle חודשי/שנתי, ב-Home וב-/pricing.
- ✅ Make→iCount checkout + חשבוניות אוטומטיות (LIVE).
- ✅ Workspace isolation מוכח (7/7 tests).
- ✅ Export lock לפי סטטוס מנוי.
- ✅ Admin panel לבעלת המוצר.
- ✅ Resend mails (הזמנות, אישורים, פניות).

### 10.2 בסיס בדיקות

- 30 קבצי vitest תחת `server/*.test.ts`.
- 25 בדיקות תכליתיות עוברות בריצה אחרונה (billing 7/7, planFeatures 6/6, workspaceIsolation 7/7, quotaWatch 5/5).
- מבחני "smoke" עבור Resend ו-Anthropic מוודאים שמשתני הסביבה תקינים.

### 10.3 נתונים בייצור

| ישות | רשומות |
|---|---|
| Workspaces | 5 |
| Users | 6 |
| Clients | 1,460 |
| Reports | 11 |
| Payment attempts | 5 |
| Contact submissions | 162 |
| Trigger handled | 0 (טרם נעשה שימוש production) |
| Message generations | 0 (טרם נעשה שימוש production) |

המסקנה היא שיש כבר workspace בייצור עם נתונים אמיתיים (1,460 לקוחות מקובץ xlsx שעלה), אך הסוכנים עדיין לא התחילו לעבוד יומיומית עם הטריגרים. זה השלב הקריטי שבו ה-MVP הולך להיכנס.

### 10.4 מה נותר לטפל

1. **תזכורות חכמות (Round 101 המוצע):** job יומי שמתריע על טריגרים פתוחים > 14 יום או "טופלו" שלא הומרו לפעולה תוך 30 יום.
2. **דשבורד KPI חודשי:** כרטיס "צמיחת התיק 30 יום" שמסתמך על `billing.usageHistory`.
3. **WhatsApp Business Cloud API:** שדרוג מ-`wa.me` לשליחה אוטומטית מ-API של מטא (template messages + opt-in).
4. **שדרוג ל-A/B testing אמיתי:** נכון להיום החלפה ידנית של variant ב-`shared/copy.ts`; שדרוג ל-feature flag דינמי דרך admin panel.
5. **אכלוס policies בייצור:** המבנה מוכן, צריך לחווט את ה-parser ליצירת policies בעת העלאת דוח חדש (לא רק clients).
6. **תיעוד CRM hooks ל-Enterprise:** אחרי שיהיה pilot enterprise, להוסיף adapter ל-Salesforce/HubSpot.
7. **GDPR-style export/delete לבקשת לקוח קצה:** אקסל יחיד שמכיל את כל הרשומות של ת.ז מסוימת, ופונקציית מחיקה למחיקת הלקוח.

---

## 11. תהליכי זרימה — תקציר חזותי

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│ Sales agent │───►│ /onboarding  │───►│ Make→iCount  │
│             │    │              │    │ checkout     │
└─────────────┘    └──────────────┘    └──────┬───────┘
                                              │
                                       ┌──────▼───────┐
                                       │ workspace =  │
                                       │  'active'    │
                                       └──────┬───────┘
                                              │
   ┌──────────────────────────────────────────┘
   │
   ▼
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│ /upload │───►│ Claude   │───►│ Dashboard │───►│ Trigger  │
│         │    │ analyze  │    │ (priority │    │ list →   │
└─────────┘    └──────────┘    │  bar +    │    │ WhatsApp │
                                │  grid)    │    │ Composer │
                                └─────┬─────┘    └────┬─────┘
                                      │               │
                                      ▼               ▼
                              ┌────────────┐  ┌────────────┐
                              │ /clients   │  │ markHandled│
                              │ (full list)│  │  (DB write)│
                              └────────────┘  └────────────┘
```

---

## 12. נספח: יחס תוכנית-לישות

| יכולת | טבלה רלוונטית | procedure | סטטוס |
|---|---|---|---|
| בחירת workspace בעת התחברות | `users.workspaceId` | `auth.me` | live |
| ניהול חברי צוות | `users`, `invitations` | `workspaces.invite`, `workspaces.acceptInvite` | live |
| העלאת דוח | `reports` | `reports.save` | live |
| ניתוח דוח | `reports`, `clients`, `actionItems` | `reports.analyze` | live |
| הצגת לוח KPI | `clients`, `triggerHandled` | `workspaces.metrics` | live |
| סינון לקוחות לפי טריגר | `clients`, `triggerHandled` | `triggers.listClients` | live |
| מחולל הודעות | `messageGenerations` | `reports.composeVariants` | live |
| סימון טריגר כטופל | `triggerHandled` | `triggers.markHandled` | live |
| ייצוא CSV | — | `exports.clientsCsv` | live (locked behind active subscription) |
| ניהול חיוב | `paymentAttempts`, `workspaces` | `billing.requestCheckout`, `billing.startCheckoutViaMake` | live |
| היסטוריית חיוב | `paymentAttempts` | `billing.usageHistory` | live |
| צרו קשר | `contactSubmissions` | `contact.send` | live |

---

**הערות סופיות:** המסמך הזה משקף את מצב הקוד והנתונים נכון ל-checkpoint `9a7736cf`. לאחר כל גרסה משמעותית מומלץ לעדכן את הסעיפים "10.1 — מה עובד" ו-"10.4 — מה נותר", מאחר שהם מהווים את ה-source of truth התפעולי של הצוות.
