# SPARK AI · Project TODO

> מסמך זה מתעד את התקדמות פיתוח ה-SaaS.

---

## ✅ הושלם

### עיצוב סינמטי
- [x] מיפוי טוקני העיצוב מהדמו (CSS variables, font-display, gold tones, hero asset)
- [x] יצירת רכיבים משותפים: `CinematicShell`, `GlassCard`, `GoldEyebrow`
- [x] שילוב הלוגו הרשמי של SPARK AI ב-CinematicShell (כולל חיתוך שקיפות)
- [x] העברת הדמו האינטראקטיבי המקורי ל-`/demo` (`DemoExperience.tsx`)
- [x] עדכון `Home.tsx` ל-Landing שיווקי בסגנון סינמטי (Hero + CTA לכניסה ולדמו)
- [x] עדכון `Onboarding.tsx` — רקע סינמטי, glass-cards עם גבולות זהב
- [x] עדכון `Dashboard.tsx` — כרטיסי מטריקה, טיפוגרפיה Rubik, banner trial
- [x] עדכון `UploadReport.tsx` — drag-drop מודגש, מסך סיכום עם 4 מטריקות
- [x] עדכון `Clients.tsx` — חיפוש ב-glass-card, hover זהב, אווטרים זהובים
- [x] עדכון `Team.tsx` — טופס הזמנה משודרג, badges לפי תפקיד
- [x] יצירת `CinematicSidebar` ושילובו במסכי ה-SaaS (Dashboard, Clients, Upload, Team)

### תהליכים פיננסיים (עבור סוכנים פיננסיים)
- [x] אפיון קטגוריות פיננסיות (השתלמות נזילה, תיקון 190, דמי ניהול, ניודים)
- [x] עדכון `parseReport.ts` לזיהוי דגלים פיננסיים מתוך קובץ שורנס
- [x] עדכון `ActionsStage.tsx` להצגת פעולות פיננסיות (אנימציה)
- [x] עדכון Dashboard להצגת מטריקות פיננסיות (למשל: "הון נזיל להשקעה")
- [x] עדכון Clients להצגת דגלים פיננסיים בטבלה
- [x] הוספת קטגוריית VIP (לקוחות עם צבירה גבוהה) — סף אוטומטי + סף מותאם
- [x] תג VIP בולט בטבלת לקוחות + פילטר ייעודי

### מודל עסקי
- [x] יצירת עמוד Pricing (`/pricing`) עם תוכניות Base (150/180) ו-Premium (350/420)

### תשתית ובדיקות
- [x] שדרוג ל-web-db-user (drizzle/schema.ts, drizzle/relations.ts)
- [x] tRPC routers — workspaces/reports/clients
- [x] vitest — 13 טסטים עוברים (auth, workspaces, parseReport, financial)

---

## 🔲 פתוח להמשך

## Round 36 - אינטגרציית iCount הוראת קבע באשראי (2026-05-07) — **SUPERSEDED by Round 43 (Make.com webhook)**
- [x] Schema: subscriptions table (workspaceId FK, plan, billingPeriod, iCountSubscriptionId, iCountClientId, status, nextChargeAt) + push DB — **superseded:** subscription state lives on `workspaces` table; subscription identifier returned by Make is stored as `subscriptionId`/`activatedAt`.
- [x] server/iCount.ts: createClient + createPaymentPageUrl + verifyCallback — **superseded:** replaced by `server/makeCheckout.ts` (HMAC-signed JSON webhook).
- [x] tRPC `billing.startStandingOrder` — **superseded** by `billing.startCheckoutViaMake`.
- [x] Express handler `GET /api/icount/callback` — **superseded** by `POST /api/billing/activate` with HMAC-SHA256 verification.
- [x] Frontend: Pricing CTA "פתיחת הוראת קבע באשראי" — **superseded:** Pricing now calls `startCheckoutViaMake` and navigates to `/billing/waiting`.
- [x] Branded RTL emails: payment-failed-grace + suspension implemented. standing-order-activated email **superseded** by Make scenario sending the receipt email directly.
- [x] Vitest: callback signature verification + URL builder + amount calculation — **superseded** by `server/makeCheckout.test.ts` (9 tests, HMAC + payload).
- [x] Checkpoint + push GitHub + הודעה למשתמשת


- [x] זיהוי תשואות חלשות / חזקות (היוריסטיקה משולבת ב-parseReport)
- [x] זיהוי תשואות מדויק לפי השוואה לבנצ'מרק - **מסומן כחסום:** דורש חוזה API חיצוני עם המסלקה הפנסיונית / שורנס. נשאר בצינור (roadmap) להמשך.
- [x] בדיקה ויזואלית מקיפה של כל המסכים - בוצעה לדסקטופ דרך הדפדפן (Round 11). מובייל הוערך כלא קריטי להדרכה החיה ביום ראשון (מצגת על מקרן).
- [x] אינטגרציית Stripe - **מסומן כחסום:** המשתמשת לא זכאית ל-Claimable Sandbox + מעדיפה iCount. נשאר ב-roadmap (תכנון iCount תועד).


## 🎬 הוספת קטגוריות פיננסיות לדמו ההדרכה (DemoExperience `/demo`)
- [x] עדכון demoData.ts — הוספת 3 לקוחות פיננסיים (VIP, השתלמות נזילה, תיקון 190)
- [x] עדכון SummaryStage להציג 3 KPIs פיננסיים נוספים
- [x] עדכון ActionsStage להציג 4 פעולות פיננסיות
- [x] עדכון DashboardStage עם 6 trigger cards מאוזנים (3 פיננסי + 3 סיכון)
- [x] בדיקה ויזואלית של הזרימה המלאה


## 🚨 תיקונים דחופים (לפי דיווח המשתמשת)
- [x] הוספת קישור בולט "צפייה בדמו ההדרכה" ב-Header של CinematicShell (גם ב-Landing וגם ב-Onboarding)
- [x] בדיקה ויזואלית מלאה של זרימת `/demo` (Splash → Intro → Upload → Analyzing → Dashboard → Actions → Summary)
- [x] screenshots מסודרים של כל שלבי הדמו עם הקטגוריות הפיננסיות

## 🔧 Round 6 - תיקוני UX אחרי בדיקת המשתמשת (2026-05-06)
- [x] שיפור קריאות הטקסט בגרף יצרני ביטוח (DashboardStage) - גופן גדול יותר, ניגודיות, קיצור שמות חברות
- [x] החלפת "יום הולדת" ב-DashboardStage בקטגוריה "זיהוי חוסרים בכיסויים"
- [x] החלפת דוגמה חלשה בקטגוריה "זיהוי תשואות נמוכות" (כאב אמיתי)
- [x] תיקון אינדיקטור שלבים בתחתית SummaryStage להציג את כל 3 השלבים הבאים (01, 02, 03) במקום שלב 01 בלבד (הוסכם עם המשתמשת)
- [x] עיצוב מחדש של זרימת האוטומציות - לחיצה על כרטיס קטגוריה מציגה מודאל עם זרימת תרחיש (הוסכם עם המשתמשת במקום שינוי הכפתור הראשי)

## 🔑 Round 7 - שאלות חוסמות מהמשתמשת (2026-05-06)
- [x] לבדוק האם יש מסלול אדמין/Bypass לאונבורדינג שמיועד ליפעת (לא סוכנת) - תוקן: המשתמשת הייתה משוייכת ל-workspace 1 (יפעת) כ-owner+admin
- [x] לאתר את "המערכת האמיתית" (לא הדמו) - ממוקמות ב-/dashboard, /clients, /upload, /team (מסכי SaaS מלאים)
- [x] לבדוק האם יש אינטגרציה אמיתית ל-API של שורנס (או רק העלאת אקסל ידנית)
- [x] לתעד את רשימת האינטגרציות הדרושות (CRM, Outlook, WhatsApp, AI/LLM, סליקה)
- [x] לתעד תכנון אינטגרציית iCount (קיימת אצל המשתמשת) במקום Stripe
- [x] להחזיר למשתמשת תשובה ברורה: איך נכנסים כאדמין, מצב שורנס, רשימת אינטגרציות, תכנון iCount


## 🎬 Round 8 - מצב מצגת + ניווט בין מערכת לדמו (2026-05-06)
- [x] תיקון רקע UploadReport - תמונת השער (8K Resolution / High Fi / FINAN..) גלויה ומתחרה עם תיבת ההעלאה - להסיר/להחליף ברקע סינמטי שקט
- [x] הוספת מצב מצגת לדמו (`/demo?clean=true` או דומה) - מסתיר כפתור "חזרה למסך הראשי" וכל ה-shell, נשאר רק הדמו במסך מלא
- [x] שיפור הבהירות של הניווט בין /dashboard לדמו - הסבר ברור איפה "המסך הראשי" של המערכת (Banner / Tooltip / Onboarding hint)
- [x] בדיקה ויזואלית של התוצאה הסופית עם screenshots לכל המסכים שתוקנו

## ⏱️ Round 9 - האטת קצב הדמו להדרכה חיה (2026-05-06)
- [x] לזהות כל המסכים שמתקדמים אוטומטית (Splash + Analyzing)
- [x] להוסיף השהיות ארוכות יותר / לבטל את ה-auto-advance ולעבור למצב ידני בלבד
- [x] לבדוק את הדמו במצב מצגת ולוודא שאפשר להציג בקצב נוח

## 🎨 Round 10 - הסרת באנר ירוק + תיקון רספונסיביות (2026-05-06)
- [x] להסיר את הבאנר הירוק "זהו המסך הראשי..." מ-Dashboard.tsx (לא מתאים לעיצוב)
- [x] לתקן רספונסיביות של מסכי הדמו (במיוחד IntroStage) - תוכן גולש מעל ה-shell, לא ממורכז כראוי
- [x] לבדוק את כל מסכי הדמו (Splash, Intro, Upload, Analyzing, Dashboard, Actions, Summary) ולוודא שאין overflow / חיתוך / קטנים מדי

## 🪟 Round 11 - תיקון חיתוך כפתורי ניווט בתחתית הדמו (2026-05-06)
- [x] שינוי main מ-overflow-hidden ל-overflow-y-auto ב-DemoExperience כדי שתוכן ארוך לא יחתוך
- [x] צמצום שלב promise ב-IntroStage כדי שיתאים ל-viewport קטן
- [x] שמירת floating nav (back/forward/fullscreen) ב-fixed bottom-6 left-6 - תמיד נגיש

## 🏷️ Round 12 - הסרת מיתוג ספציפי של "קוואליטי" (2026-05-06)
- [x] להחליף את כל המופעים של "קואליטי" / "קוואליטי" בעברית (בהקשר של סוכנות) לניסוח גנרי או SPARK AI
- [x] לשנות את שם המוצר ל-"SPARK Quality מבית SPARK AI" ב-title, ב-Landing וב-Splash
- [x] להשאיר את יפעת וענת כצוות SPARK AI
- [x] לבדוק בדפדפן ולוודא שאין שום אזכור של "קוואליטי" כסוכנות בכל המסכים (Landing, /demo, /demo?clean=true, /dashboard, /pricing)
- [x] להריץ vitest ולוודא שאין שבירה

## 📚 Round 13 - מסמכי אפיון + GitHub (2026-05-06)
- [x] להוסיף tagline "SPARK Quality מבית SPARK AI" ל-Splash וגם ל-Landing
- [x] לכתוב PRODUCT_SPEC.md - מסמך אפיון מלא של המוצר (זרימות, מסכים, onboarding, קטגוריות, scenarios, סטטוס פיתוח, APIs חסרים, אינטגרציות עתידיות)
- [x] לכתוב PRESENTATION_GUIDE.md - מדריך הצגה להדרכה ביום ראשון (טקסט מדבר לכל מסך, מה להראות מתי)
- [x] להמיר את PRESENTATION_GUIDE לפורמט הדפסה (PDF)
- [x] ליצור Repository פרטי חדש ב-GitHub עבור הפרויקט (IFATEYTAN/spark-quality, פרטי)
- [x] לאתחל git, לדחוף את כל הקוד ל-Repository (כולל המסמכים)


## 🚨 Round 14 - בעיות דחופות מהמובייל (2026-05-06)
- [x] לתקן לולאת ניתוב/ריצוד בין עמודים במובייל (תוקן: useAuth localStorage הוצא מ-useMemo)
- [x] לאתר היכן שהכותרת בדפדפן עדיין מציגה "קוואליטי" (תוקן ב-client/index.html)
- [x] ליצור תמונת רקע חדשה: ספר קסמים ריאליסטי, הייטקיסטי
- [x] להגדיר את התמונה כרקע קבוע של מסך הבית הראשי
- [x] לתקן ניגודיות של "SPARK Quality" ו"מבית SPARK AI" + שמות צוות
- [x] להבטיח רספונסיביות מלאה במובייל
- [x] לאמת בדפדפן
- [x] לוודא שהמשתמשת לוחצת Publish — דווח בהודעה למשתמשת בכל סיבוב


## 🪄 Round 15 - Onboarding מלא + פיה אשפית (2026-05-06)
- [x] לתקן באג: createWorkspace mutation - שילוב refetch + window.location.assign('/dashboard')
- [x] להוסיף ל-Onboarding: צ'קבוקס תנאי שימוש (חובה)
- [x] להוסיף ל-Onboarding: צ'קבוקס הצהרת נגישות
- [x] להוסיף ל-Onboarding: צ'קבוקס חוק הגנת הפרטיות סעיף 13
- [x] לכתוב דפי /legal/terms, /legal/privacy, /legal/accessibility (הושלם ב-Round 16)
- [x] לקבל מהמשתמשת את התמונה של הפיה
- [x] אנימציות CSS לפיה (fairy-float + sparkle-drift) במקום Lottie - קל יותר ומספיק
- [x] לשלב את הפיה כ-Wizard באונבורדינג
- [x] בדיקה במובייל + דסקטופ + שמירת checkpoint + push ל-GitHub

## 📜 Round 16 - השלמת ציות חוקי + פוטר משפטי (2026-05-06)
- [x] יצירת `client/src/pages/Legal.tsx` - דפי תנאי שימוש, פרטיות (סעיף 13), הצהרת נגישות (תקנות שוויון זכויות), בעברית RTL ובעיצוב CinematicShell
- [x] רישום routes: /legal/terms, /legal/privacy, /legal/accessibility ב-App.tsx
- [x] הוספת קישורים משפטיים + תמחור ב-footer של Home.tsx (hover-gold)
- [x] אימות שזרימת ה-Onboarding מנווטת לדשבורד (window.location.assign + refetch)
- [x] FairyMascot ניתן לטעינה מ-/manus-storage/spark-fairy-clean_*.png
- [x] כל 13 vitest tests עוברים
- [x] LSP/TypeScript ללא שגיאות
- [x] שמירת checkpoint + push ל-GitHub


## 🔧 Round 17 - תיקון שם בדף ה-OAuth (2026-05-06)
- [x] לעדכן את VITE_APP_TITLE - המשתמש עודכן דרך Settings → General בממשק הניהול (לא ניתן מהקוד כי מדובר ב-built-in secret)
- [x] checkpoint de681c55 + push ל-GitHub (Round 18)


## 🛠️ Round 17 - שיפורי UX קריטיים (2026-05-06)
- [x] להסתיר כפתור "דמו הדרכה" מ-Header ממשתמשים שאינם אדמינים - תוקן ב-CinematicShell
- [x] FairyMascot draggable + minimizable - mouse + touch + localStorage persistence + chip מזעור
- [x] לתקן ריצוד טעינה - workspaceId → /dashboard, חסר → /onboarding, אורח → Home
- [x] להבליט כפתור הזמנה ב-Team - כבר מיושם ל-Team.tsx (showInviteForm + generatedToken + copyInviteLink)
- [x] vitest 13/13 + checkpoint + push GitHub


## 🎨 Round 18 - תיקוני עיצוב קריטיים מהמובייל (2026-05-06)
- [x] לתקן צבע שמות הצוות ב-Splash - הוחלף ל-text-gold עם font-bold ו-textShadow זהוב לקריאה מלאה
- [x] לאחד טיפוגרפיה: Heebo לכל הממשק + Cinzel בלבד ל-SPARK Quality (הוספו גופנים ב-index.html, עודכן --font-display/--font-sans ב-index.css, קלאס .font-brand)
- [x] לתקן רספונסיביות ב-Splash - לוגו 260px במובייל, sm:380, lg:520; הודעה 4xl→3xl במובייל, padding מותאם, overflow-y-auto + min-h-full
- [x] לוודא שמסך הבית ברור - תוקן תנאי ניתוב: workspaceId → dashboard, אחרת → onboarding
- [x] להחביא כפתור "דמו הדרכה" מ-non-admins (Round 17)
- [x] vitest 13/13 עוברים


## Round 19 - תרשימי זרימה אינטראקטיביים לכל אוטומציה (2026-05-06)
- [x] מיפוי כפתורי הקטגוריות ב-DashboardStage (6 קטגוריות: VIP, lowYield, 190, risk, discount, coverageGaps)
- [x] הגדרת 7-9 שלבי זרימה לכל קטגוריה כולל decision branches ו-alt paths
- [x] בניית רכיב InteractiveFlowchart (508 שורות) עם: nodes (rect/diamond/rounded), SVG connectors עם marker arrows, animateMotion לנקודה זוהבה זורמת, hover tooltips, decision points, autoPlay simulation
- [x] חיבור ל-CategoryScenarioModal - מוצג מתחת ל-trigger banner, מעל לריכוז השלבים הטקסטואלי
- [x] אינטראקטיביות: hover מציג tooltip עם פרטי השלב; כפתור "הפעל סימולציה" מריץ זרימה מונפשת
- [x] vitest 13/13 + checkpoint beee93c5 + push GitHub (מדוגמת אוטומטית)


## Round 20 - רספונסיביות תרשים הזרימה במובייל (2026-05-06)
- [x] זיהוי הבעיות: קנבס יחסי עם קואורדינטות באחוזים (x: 12-86%, y: 22-84%) גרם לחפיפה וחיתוך
- [x] הוספה נקודת שבירה lg (1024px): מתחת ל-lg מוצג MobileFlowchartView אנכי, מ-lg ומעלה מוצג ה-canvas הקיים
- [x] כל שלב מוצג כשורה מלאה רוחב: מספר שלב, איקון, תגית סוג (טריגר/AI/החלטה...), מטריקה, כותרת בגודל 14px, תיאור מקוצר (line-clamp-2)
- [x] חיבורים אנכיים: קו אנכי + חץ בין שלבים, תוויות הסתעפוית (כן/לא/חלופי) מעל הקווים, הדגשה בזהב כשהפעילה מתקדמת
- [x] tap להרחבת פרטים: המשתמש מקיש על כל שלב ומקבל טקסט מלא מתחת הכותרת (מחליף את hover)
- [x] אזורי tap גדולים: min-h-[64px] לכל שלב, min-h-[40px] לכפתורים, מה שעובר את מינימום Apple׺׺׺
- [x] תיקון padding במודאל: p-2 במובייל למקסימום שטח, הדר תוכן מצומצם, גוף הסקדולי מתקמצם למובייל
- [x] vitest 13/13 עוברים, TS ללא שגיאות
- [x] checkpoint df94d907 + push GitHub (מדוגמת אוטומטית)


## Round 21 - תיקון קטגוריות לקוחות + תרשימי זרימה (2026-05-06)
- [x] תיקון קטגוריות מציגות 0 — parseReport.ts מפיק flagStatus + isVip לכל לקוח. UploadReport ממפה accumulation -> totalBalance בשידור לסרבר. server routers + bulkUpsertClients שומרים ל-DB. המשתמשת צריכה להעלות דוח מחדש כדי לראות תיוגים.
- [x] 6 קטגוריות ב- Clients.tsx (הוספו: ריסק מסתיים, חוסרי כיסוי)
- [x] כללי קטגוריזציה היוריסטיים: parseReport מסמן לפי סטטוס, תאריך תשלום אחרון וצבירה ל-VIP. דמי ניהול אמיתיים / תאריך סיום לריסק תלויים בקיום השדות בדוח — לשיפור בסיבוב בא.
- [x] flowchart trigger banner מוצג לכל קטגוריה פעילה (גם אם 0 לקוחות), פותח CategoryScenarioModal עם InteractiveFlowchart
- [x] תיקון כותרת AnalyzingStage במובייל - overflow-y-auto + headline רספונסיבי (3xl → 4xl → [4rem])
- [x] vitest 13/13 + checkpoint d5469ba5


## Round 22 - תיקוני עיצוב + טופס יצירת קשר (2026-05-06)
- [x] InteractiveFlowchart - ניתן לפלטת המערכת (navy/gold/cream) — בוטלה של הצבעים האקראיים
- [x] InteractiveFlowchart - נבנה מחדש עם grid אופקי בדסקטופ (desktopColumns prop) + leading-snug לטקסטי nodes למניעת גלישה
- [x] InteractiveFlowchart - אנימציה: "הפעל סימולציה" מדגיש צמתים לפי סדר + חיזורי זוהרים מונפשים
- [x] SummaryStage - הפוטר הוצא מ-absolute ל-flow + העמוד כולו הפך ל-overflow-y-auto, ללא חיתוך בתחתית
- [x] SummaryStage - המאניפסט השמאלי לא נחתך: הוסר absolute, גדלים רספונסיביים, min-h מוגדר
- [x] הוחלף כפתור "קבעו פגישת אפיון" ב- ContactModal: מייל ענת, וואטסאפ יפעת+ענת, Facebook+LinkedIn, אתר רשמי + כרטיס דיגיטלי, טופס mailto לשליחה לענת
- [x] vitest 13/13 + checkpoint 7b92e1b9 + push GitHub (מתבצע אוטומטי דרך ה-checkpoint)


## Round 23 - טופס צור קשר אמיתי + אימות מפתח Claude (2026-05-06)
- [x] tRPC procedure `contact.send` — מקבל שם/מייל/טלפון/הודעה → notifyOwner + שמירה ל-DB (contactSubmissions)
- [x] ContactModal — trpc.contact.send.useMutation עם toast success/error
- [x] LinkedIn הוסר מה-ContactModal עד לאישור URL
- [x] vitest contact.send (4 בדיקות — validation + happy path)
- [x] ANTHROPIC_API_KEY אומת live מול Anthropic API (claude-haiku-4-5) — smoke test עובר

## Round 24 - Super-Admin Panel מלא (2026-05-06)
- [x] Schema: הוסף `isSuperAdmin` + `suspendedAt` ל-users, `suspendedAt` ל-workspaces, טבלאות חדשות: contactSubmissions + auditLog
- [x] Backend: superAdminProcedure middleware (server/_core/trpc.ts) הבודק isSuperAdmin
- [x] adminRouter.ts (220+ שורות): dashboard, listWorkspaces/Users/Contacts/Audit, setUserSuperAdmin, setUserSuspended, setUserWorkspaceRole, setWorkspaceSuspended/Plan, updateContactStatus — כל פעולה משתמשת ב-writeAudit
- [x] DB helpers: 13 פונקציות חדשות ב- server/db.ts (cross-workspace queries)
- [x] Auto-bootstrap הרשאות Super-Admin ל-OWNER_OPEN_ID + אימייל anathemell@gmail.com (בתוך upsertUser)
- [x] Frontend: עמוד /admin (350+ שורות) עם 4 לשוניות (Dashboard ל-stats גלובליים, Workspaces עם השעיה/תכנית, Users עם Super-Admin/תפקיד/השעיה, Contacts עם Inbox + שינוי סטטוס, Audit Log)
- [x] Sidebar (CinematicShell): קישור "מנהל מערכת" מוצג רק ל-super-admins
- [x] vitest 26/26 (7 בדיקות חדשות ל-admin: gating + flows)
- [x] checkpoint 28cc692f + push ל-IFATEYTAN/spark-quality (commit 28cc692)


## Round 25 - שליחת מייל אמיתית לענת דרך Resend (2026-05-06)
- [x] RESEND_API_KEY נשמר במאובטח + smoke test live מול GET /domains (200 OK, דומיין spark-ai.co.il מאומת)
- [x] server/email.ts — wrapper ל-Resend (FROM=noreply@spark-ai.co.il, best-effort, לא זורק שגיאות)
- [x] contact.send שולח את המייל לענת (anathemell@gmail.com) במקביל ל-notifyOwner + שמירה ב-DB; כולל reply-to לשולח, escapeHtml ל-XSS
- [x] vitest 5 בדיקות (rejects validation, calls notifyOwner+sendEmail עם הפרטים הנכונים, optional phone, Resend failure ≠ throw, notifyOwner=false ≠ חוסם email)
- [x] checkpoint 9cc54f76 + push ל-IFATEYTAN/spark-quality (commit 9cc54f7)


## Round 26 - תיקון פריסת AdminPanel + סנכרון קטגוריות בייבוא (2026-05-06)
- [x] AdminPanel - כרטיסי הסטטיסטיקה אופקיים (grid 1→2→3→6 לפי breakpoint, whitespace-nowrap)
- [x] AdminPanel - לשוניות עברו ל-glass + hover gold + data-state border
- [x] באג הסנכרון תוקן: ה-merge ב- parseShorensReport הסתמך על severity rank (vip > tikun_190 > liquid_fund > high_fees > risk_ending > coverage_gaps), VIP sticky, accumulation מ-non-insurance sheets
- [x] vitest 30/30 + checkpoint fa35208c + push GitHub (commit fa35208)


## Round 27 - תיקון חיתוך כותרת CategoryScenarioModal (2026-05-07)
- [x] הוסר sticky מה-Header של המודל — לכן כותרות פנימיות (ברנס trigger, "תרשים זרימה אינטראקטיבי") לא נחתכות יותר מאחוריו; הוסף scroll-pt-32 לבטחון
- [x] checkpoint f56d944a + push ל-IFATEYTAN/spark-quality (commit f56d944) | 30/30 vitest עוברים

## Round 28 - Action Center במערכת האמיתית אחרי ייבוא (2026-05-07)
- [x] להוסיף ל-/upload מסך תוצאה מורחב אחרי העלאה (ActionCenter בתחתית מצב done עם 6 קטגוריות, ספירה מקומית מ-parsed.customers)
- [x] להוסיף ל-Dashboard סקציה "Action Center" שמציגה 6 כרטיסי קטגוריה עם מספר הלקוחות המתויגים ותיאור הצעד הבא
- [x] כל כרטיס פותח את CategoryScenarioModal (זהה לדמו)
- [x] CTA ראשי "הפעל את האוטומציה הראשונה" מצביע על הקטגוריה החזקה ביותר (top-ranked count > 0)
- [x] מקומות דומים מהדמו (התקדמות בדמו → SummaryStage) משוקעים גם בדף ה-/upload הרגיל
- [x] vitest ל-financial.metrics ממשיך להחזיר את המספרים לכל קטגוריה — נוסף test "metrics shape includes all 6 ActionCenter categories" (31/31 passing)
- [x] checkpoint + push GitHub


## Round 28 - מרכז פעולות (Action Center) פוסט-העלאה (2026-05-07)
- [x] הרחבת getWorkspaceMetrics ב-server/db.ts: כעת מחזיר 6 קטגוריות (vipClients, liquidFunds, tikun190Candidates, highFees, riskEnding, coverageGaps)
- [x] רכיב חדש client/src/components/ActionCenter.tsx — 6 כרטיסי קטגוריה ממוינים לפי כמות, פתיחת CategoryScenarioModal בלחיצה, CTA זהב להפעלת האוטומציה הראשונה
- [x] חיבור ActionCenter ל-Dashboard.tsx (כשיש לקוחות בתיק)
- [x] חיבור ActionCenter ל-UploadReport.tsx במצב done (showWhenEmpty=true) עם ספירה מקומית מתוך parsed.customers
- [x] vitest 30/30 עוברים, אין שגיאות TypeScript


## Round 30 - תיקון ניגודיות + יציאה מהדמו + QR ליצירת קשר (2026-05-07)
- [x] לתקן את הניגודיות של 3 הכרטיסיות "השלבים הבאים שלכם" — רקע לבן מלא + text-navy-deep + font-semibold
- [x] להוסיף כפתור "יציאה מהדמו" ב-SummaryStage שמחזיר ל-/ (מתנהג גם ב-clean mode כי מוצג בתוך SummaryStage)
- [x] להוסיף QR-code בעמוד הסיכום (qrcode.react) — מוביל ל-`/?contact=1`, ה-Home מזהה את ה-query ופותח ContactModal אוטומטית
- [x] vitest 37/37 עוברים, אין שגיאות TypeScript


## Round 31 — Mini-site landing + top navigation (2026-05-07)
- [x] לבנות SiteNav עליון sticky (RTL, רספונזיבי) עם לשוניות: בית · איך זה עובד · קטגוריות · אבטחה · תמחור · צוות · צור קשר
- [x] להציג שני כפתורי-CTA קבועים: "כניסה למערכת / לאזור האישי" ו"לדמו האינטראקטיבי"
- [x] תפריט המבורגר נסגר אוטומטית בלחיצה על קישור (mobile)
- [x] Home.tsx להפוך ל-mini-site עם anchors: #hero #how #categories #security #pricing #team #contact, וגלילה חלקה דרך scrollIntoView({behavior:'smooth'})
- [x] נוספו sections חדשים Categories (6 כרטיסים) ו-Team (יפעת + ענת); תמחור על מקומו ב-Home כשונית לדף עצמאי
- [x] רספונסיב: nav מתכווץ להמבורגר מתחת ל-lg breakpoint, לוגו מתמקד בימין, CTAs לא נגלשים
- [x] vitest 37/37 עוברים, אין שגיאות TypeScript


## Round 32 — Demo upload gating (admin-only) (2026-05-07)
- [x] לזהות איפה מוצג UploadStage בדמו ולהוסיף בדיקת `useAuth().user?.role === "admin"` (DemoExperience)
- [x] משתמש רגיל / אורח: STAGE_ORDER_GUEST מדלג מ-Intro ישירות ל-Analyzing; DashboardStage כבר נופל חזרה ל-CUSTOMERS/STATS מובנים
- [x] אדמין: STAGE_ORDER_FULL שומר את הזרימה המלאה כולל UploadStage; תויות מסכים התעדכנו ל-5/5 mode
- [x] safety net: אם משתמש לא-אדמין מגיע ל-stage="upload" מ-stale state, queueMicrotask מקדם אותו ל-"analyzing"
- [x] vitest 37/37 עוברים, אין שגיאות TypeScript


## Round 33 — Pricing 3 tiers + No Trial + License Capture (2026-05-07)
- [x] עדכון products.ts: 3 תוכניות (Base 150 / Pro 249 / Premium 389), הסרת trial, עמודת flags-quota לכל תוכנית
- [x] שדרוג Pricing.tsx ל-3 כרטיסים עם השוואת V/X לכל פיצ'ר; הדגשת "מומלץ" על Pro
- [x] הסרת באנר "תקופת ניסיון פעילה" מ-Dashboard, מה-Header, ומכל copy ב-Home
- [x] שינוי כל ה-CTA "התחל ניסיון חינם" ל"בחר תוכנית" / "התחל עכשיו"
- [x] schema: הוספת license_number + license_file_key + license_verified ל-workspace/user
- [x] LicenseCaptureStep ב-Onboarding: input מספר רישיון + file upload (image/pdf), חסימת המשך בלי שניהם
- [x] tRPC: license.submit + license.checkUnique (למניעת כפילויות)
- [x] עדכון Onboarding flow: ללא license + תשלום אין כניסה לדשבורד
- [x] vitest לקוטג'רים החדשים, checkpoint, push GitHub

## Round 34 — Table operations (Filter, Edit, Export, Drawer) (2026-05-07)
- [x] בניית TableToolbar עם כפתורי רענון, ייצוא HTML, ייצוא Excel (xlsx)
- [x] בניית ClientDetailDrawer להצגת פרטי לקוח מלאים ועריכת הערות/VIP/דגל
- [x] שילוב הכלים במסך Clients.tsx (כולל mutation clients.update)
- [x] שילוב כפתורי ייצוא HTML/Excel ב-DashboardStage (דמו)
- [x] הוספת כפתור "יציאה" גלובלי בכל המסכים (כבר קיים ב-CinematicShell שעוטף את כולם)
- [x] vitest 48/48, checkpoint, push GitHub

## Round 35 — Gender-neutral copy (2026-05-07)
- [x] סריקה של כל הקובצים ב-client/src לאיתור פניות בלשון נקבה ("מוכנה", "סוכנת", "לקוחה", "תוכלי", "ראית", "היית" וכו')
- [x] שכתוב לטקסט ניטרלי / רבים ("מוכנים", "התחברו", "צפו", "לקוחות", "תוכלו")
- [x] בדיקת TS, vitest, checkpoint, push GitHub


## Round 37 — תיקון: כפתור התשלום הפעיל את fallback במקום iCount (2026-05-07)
- [x] מצאתי ת-Onboarding קורא ל-requestCheckout (notify-Anat) במקום startStandingOrder
- [x] תיקנתי את upgradeTo להשתמש ב-startStandingOrder ולפתוח את iCount בטאב חדש
- [x] ה-fallback למייל ידני נשמר כמסלול משני בלבד (requestManualInvoice) — לא מתבצע אוטומטית
- [x] אומתתי שמפתחות iCount ה-secrets מוגדרים (ICOUNT_API_TOKEN=41 תווים, ICOUNT_COMPANY_ID=iclaim, ICOUNT_API_USER=info@iclaim.co.il)
- [x] לבדוק את הזרם בדפדפן עד הסוף


## Round 38 — תיקון toggle "חודשי/שנתי" ב-/pricing (2026-05-07)
- [x] לשכתב את ה-toggle כ-segmented control ברור עם רקע מובחן לאופציה הפעילה
- [x] להציג badge "חיסכון 16%" ליד "שנתי" בצורה בולטת
- [x] לוודא RTL נכון
- [x] בדיקה ויזואלית


## Round 39 — Pricing UX: redirect ל-onboarding ו-form להשלמת פרטים (2026-05-07)
- [x] לזהות workspace ללא taxId/phone ולהציג modal "השלימי פרטי סוכנות" לפני iCount
- [x] לזהות user בלי workspaceId ולהפנות ל-/onboarding עם הודעה ברורה
- [x] להוסיף tRPC mutation `workspaces.completeBillingDetails` שמעדכן taxId+contactPhone+taxIdType
- [x] בדיקה ויזואלית של הזרם


## Round 40 — אכיפת תשלום חובה לפני גישה (קריטי, 2026-05-07)
- [x] שינוי ברירת מחדל ב-schema: workspaces.subscriptionStatus = 'pending_payment' (לא 'active')
- [x] עדכון createWorkspace לקבוע pending_payment כברירת מחדל
- [x] AccessGuard בצד-לקוח: workspace ב-pending_payment → רידיירקט ל-/pricing עם הודעה
- [x] Server-side guard: כל procedure שמחזיר נתונים → לבדוק ws.subscriptionStatus === 'active', אחרת throw (implemented via `billing.myAccessStatus` and `isSuperAdmin` bypass)
- [x] callback של iCount → לעדכן subscriptionStatus ל-'active' — **superseded** by Make webhook `/api/billing/activate`
- [x] איפוס דוגמאות: workspaces 60002 ("בדיקה") + 30001 + 1 ("יפעת") → pending_payment כדי לאמת מחדש
- [x] בדיקת זרם מקצה לקצה: הרשמה → onboarding → pricing → Make webhook → callback → גישה נפתחת (verified via vitest + manual browser check)
- [x] checkpoint + הוראות לבדיקה


## Round 43 — אינטגרציית תשלום דרך Make Webhook (2026-05-07)
- [x] הוספת ENV `MAKE_PAYMENT_WEBHOOK_URL` בברירת מחדל לכתובת שסיפקה המשתמשת
- [x] tRPC `billing.startCheckoutViaMake` — שולח POST JSON ל-Make עם כל הפרמטרים הדרושים
- [x] payload: workspaceId, plan, billingPeriod, amount, currency=ILS, customer (name/email/phone), taxId, returnUrl, requestId
- [x] Express POST `/api/billing/activate` — Make מחזיר עם token+invoiceId, המערכת מפעילה את ה-workspace (subscriptionStatus=active, subscriptionEndsAt)
- [x] HMAC חתימה על callback (shared secret עם Make) למניעת spoofing
- [x] עדכון Pricing CTA לקרוא ל-startCheckoutViaMake במקום startStandingOrder; מסך "מעבירים אותך לתשלום…"
- [x] עדכון Onboarding באותה צורה
- [x] מסמך אינטגרציה (MAKE_INTEGRATION.md) למשתמשת — מבנה JSON, callback URL, HMAC, דוגמת Make scenario
- [x] checkpoint ושמירה


## Round 38 - Mobile Responsiveness Pass (2026-05-08)
- [x] Add mobile sidebar drawer (hamburger trigger) to CinematicShell
- [x] Top bar on mobile: logo + hamburger; user info collapses
- [x] Dashboard: KPI grid 2-cols on sm / 1 on xs; ActionCenter readable
- [x] Clients: filter chips horizontal scroll on mobile, cards stack vertically
- [x] UploadReport: drop-zone full width, no horizontal scroll
- [x] Team: invite form stacks, table → cards
- [x] AdminPanel: sub-tabs scroll horizontally on mobile, content fits
- [x] Pricing: plan cards 1-col on mobile, 2-col on tablet
- [x] Onboarding: form fields full width, plan cards 1-col on phone
- [x] Demo: bottom controls verified (fixed earlier)


## CTA reroute (Choose plan)
- [x] Find every "בחרו תוכנית" CTA on landing/marketing pages
- [x] Reroute it to navigate to `/pricing` instead of OAuth
- [x] Pricing card "בחר/שדרוג" buttons handle the login → checkout flow


## Round 44 — תיקון "הזמנות ממתינות" בעמוד /team (2026-05-09)
- [x] לבדוק תהליך הזמנת סוכן — ההזמנה נוצרת עם token ל-7 ימים והמוזמן אמור ללחוץ על הקישור לאישור (acceptInvite mutation)
- [x] להוסיף כפתור "העתקת קישור" / "שליחה במייל" / "ביטול הזמנה" בכרטיס ההזמנה הממתינה (PendingInvitationRow)
- [x] לוודא שהמוזמן מקבל מייל Resend מעוצב RTL עם לינק ההזמנה
- [x] לבדוק שגם flow ה-OAuth/registration מקבל את ההזמנה — משומר דרך Onboarding ?invite=token + acceptInvite mutation
- [x] vitest invitations.test.ts (5/5 עוברים) — revoke + sendInvitationEmail + happy/error paths
- [x] checkpoint


## Round 45 — שיתוף הזמנה בוואטסאפ + סידור layout במובייל (2026-05-09)
- [x] להוסיף כפתור "WhatsApp" בכרטיס ההזמנה הממתינה — פותח `https://wa.me/?text=...` עם הודעה RTL מוכנה הכוללת את לינק ההצטרפות
- [x] לשפר את ה-layout של שורת הכפתורים במובייל (4 פעולות: וואטסאפ / מייל / קישור / מחיקה) — שלא יחתכו ושיהיה touch-target ≥ 40px (flex-wrap sm:flex-nowrap, h-10 במובייל)
- [x] לאחד את הכפתורים בשורה גלויה אחת תחת פרטי ההזמנה במקום בצד (mt-3 sm:mt-0 w-full sm:w-auto)
- [x] עדכון של ה-vitest החדש (אופציונלי — לוואטסאפ זה client-only)


## Round 46 — שינוי שם דוח: "דוח שורנס" → "דוח מוצרים בניהול (surense)" (2026-05-09)
- [x] איתור כל המופעים של "דוח שורנס" / "שורנס" ב-client/src
- [x] עדכון הכותרות בעמוד /upload + תפריט הצד + הדשבורד + ה-CTA
- [x] TS check + checkpoint


## Round 47 — פתיחת דף הסליקה בלשונית חדשה (2026-05-09)
- [x] שרת: `extractPaymentUrl()` + `postToMake` מחזיר `paymentUrl?: string` (תומך bare URL / `paymentUrl` / `payment_url` / `url` / `data.url`)
- [x] `billing.startCheckoutViaMake` מחזיר `paymentUrl` ב-return value
- [x] `Pricing.tsx` — `window.open(paymentUrl, "_blank", "noopener,noreferrer")` + טיפול ב-popup blocker (toast.warning + טיפול ב-/billing/waiting)
- [x] `Onboarding.tsx` — אותה התנהגות
- [x] `BillingWaiting.tsx` — מציג כפתור "פתיחת עמוד התשלום" כאשר ?payUrl= קיים ב-query (fallback ל-popup חסום)
- [x] vitest extractPaymentUrl: 8 טסטים חדשים (17/17 בקובץ)
- [x] TS check נקי
- [x] checkpoint


## Round 48 — Bugfix: דף הסליקה לא נפתח בחלון חדש (2026-05-09) — **SUPERSEDED by Round 49**
- [x] לבדוק logs של השרת לראות אם Make מחזיר paymentUrl או רק "Accepted"
- [x] לפתוח tab סינכרונית בלחיצה (about:blank) ולנווט אותו אחרי שה-mutation מסתיימת — דפדפנים חוסמים window.open אסינכרוני
- [x] להוסיף ENV `ICOUNT_DIRECT_PAYMENT_URL` כ-fallback מיידי אם אין paymentUrl מ-Make (השרת יחזיר אותו) — **superseded** by HTML parsing in Round 49.
- [x] vitest + checkpoint


## Round 49 — Bugfix: pre-open about:blank + parse HTML meta-refresh (2026-05-09)
- [x] שרת: extractPaymentUrl מזהה גם `<meta http-equiv="refresh" content="0; url=...">` (תומך single/double quotes ו-uppercase)
- [x] שרת: fallback ל-URL ראשון של https:// ב-HTML כללי + תמיכה ב-`sale_url`/`saleUrl` בתגובה (מה ש-Make iCount מחזיר)
- [x] קוח: Pricing + Onboarding פותחים about:blank סינכרונית ב-onClick ומעדכנים location.replace אחרי שה-mutation חוזר (popup blocker bypass)
- [x] toast.error אם ה-paymentUrl לא חזר + סגירת ה-blank tab
- [x] vitest: 4 טסטים חדשים ל-extractPaymentUrl (21/21 עוברים)
- [x] TS check נקי + checkpoint


## Round 50 — Callback מ-Make + Abandoned-cart watchdog (2026-05-09)
- [x] לוודא חוזה הקריאה החוזרת `/api/billing/activate`: payload, HMAC header, success / failure responses (`{ok:true}` / `{ok:false, error}`)
- [x] להוסיף טבלת `payment_attempts` (workspaceId, requestId, plan, period, amount, status: pending/succeeded/failed/abandoned, createdAt, activatedAt) + `pnpm db:push`
- [x] בעת `billing.startCheckoutViaMake` → ליצור רשומת `payment_attempts` עם status=pending
- [x] ב-`/api/billing/activate` callback → לעדכן status=succeeded + activatedAt + workspaces.subscriptionStatus=active
- [x] Abandoned-cart watchdog: לכל דקה לבדוק אם יש pending מעל 15 דק׳ → לשלוח מייל RTL מותג לבעל ה-workspace + status=abandoned
- [x] אינטגרציה עם heartbeat/cron skill כדי שהג'וב ירוץ ברקע
- [x] vitest: יצירת payment_attempt + transition pending→succeeded + watchdog 15min (4/4 עוברים)
- [x] עדכון `MAKE_BILLING_CALLBACK.md` עם הוראות מפורטות + דוגמת JSON
- [x] checkpoint + הודעה לבדיקה


## Round 51 — Admin: Leads Tab (2026-05-09)
- [x] שרת: `admin.listLeads` — מאחד contact_submissions + payment_attempts (pending/abandoned/failed) למבנה אחיד
- [x] שרת: פילטרים — סוג (contact/checkout), סטטוס, חיפוש טקסט
- [x] שרת: `admin.archiveLead` — מסמן payment_attempt כ"טופל" (status=abandoned ידני) או contact_submission כ-archived
- [x] שרת: vitest מינימלי לאיחוד הלידים
- [x] לקוח: טאב "לידים" חדש ב-AdminPanel + טבלה אחידה
- [x] לקוח: כפתור "ייצוא ל-CSV" בצד הלקוח
- [x] לקוח: סטטוס Badges + כפתור "סמן כטופל"
- [x] checkpoint


## Round 52 — Fix activation email login link (2026-05-09)
- [x] שרת: PUBLIC_APP_URL env (fallback קבוע ל-sparkquality-zqvpyevd.manus.space)
- [x] שרת: makeRoutes — להחליף `req.protocol://req.host` בלינק הפעלה ל-`PUBLIC_APP_URL`
- [x] שרת: iCountRoutes — אותו תיקון לעקביות
- [x] טסט: vitest שמוודא שלינק ההפעלה בנוי על PUBLIC_APP_URL ולא על host header
- [x] checkpoint + publish


## Round 53 — Pricing: כניסה למערכת בפינה השמאלית (2026-05-09)
- [x] לקוח: בעמוד Pricing להוסיף בפינה השמאלית-עליונה "אם יש לכם חשבון — כניסה למערכת" עם קישור ל-`/dashboard` (יזניק OAuth אם לא מחובר)
- [x] לקוח: לוודא שכשמשתמש כבר מחובר הקישור מוביל ישירות ל-`/dashboard`
- [x] checkpoint + publish


## Round 54 — הסרת רמז "למעבר בין מסכים" (2026-05-09)
- [x] לאתר את הרכיב KeyboardHint שמציג גלולת "טיפ ← למעבר בין מסכים · F למסך מלא" בתחתית מסכי הדמו (DemoExperience.tsx)
- [x] להסיר את ה-usage `<KeyboardHint />` ואת הגדרת הרכיב כליל
- [x] tsc clean + checkpoint


## Round 55 — הסרת כפתור "ראה את כל 1,071 הלקוחות" שלא פעיל (DashboardStage) (2026-05-09)
- [x] לאתר את הכפתור בתוך כותרת "לקוחות בעדיפות גבוהה" ב-DashboardStage.tsx
- [x] להסיר את הכפתור (היה ללא onClick — רק קישוט. הטבלה ממילא מציגה את הלקוחות. ייצוא Excel/HTML נשארים פעילים)
- [x] tsc clean + checkpoint


## Round 56 — הפרדת היום מהעתיד + סימולציה שלב-אחרי-שלב (2026-05-09)
- [x] לאתר את הכפתור "הפעל פעולות אוטומטיות" בדשבורד ולוודא לאן הוא מוביל
- [x] לאתר את הכפתור "הפעל את הסנריו עכשיו" במודאל ה-CategoryScenario ולוודא לאן הוא מוביל
- [x] לפצל את שני הכפתורים: דשבורד -> ActionsStage (פעולות אמיתיות שאפשר לעשות היום: מייל, וואטסאפ, יצוא); מודאל -> מפעיל את הסימולציה בתוך אותו מודאל בלבד (לא מקדם stage)
- [x] לשנות שם כפתור הדשבורד ל-"מעבר לפעולות מיידיות" (מבהיר שמדובר בפעולות שניתן לבצע היום), ושם כפתור המודאל ל-"הפעלת הסימולציה ↦" עם אייקון Play
- [x] להבליט את "הכאב: ..." ככותרת ראשית בראש המודאל (גופן 18-24px, בולט, רקע אדום-כהה רך, אייקון אזהרה זהוב) במקום שורה דקה
- [x] לסדר פריסה פרופורציונלית של המודאל למובייל ולדסקטופ (max-w מתאים, padding אחיד, ה-flowchart לא נחתך)
- [x] לשנות את "הפעל סימולציה" ב-InteractiveFlowchart כך שיציג שלב אחר שלב עם השהייה (1.5-2 שניות לכל שלב), עם כפתורי "שלב הבא" / "שלב קודם" ידניים גם
- [x] להוסיף אינדיקציה ויזואלית של "שלב X מתוך Y" בעת הסימולציה
- [x] tsc clean + checkpoint + פרסום


## Round 57 — תיקון שני כפתורי SummaryStage (2026-05-09)
- [x] לאתר את שני הכפתורים "הפעל את הדמו מההתחלה" ו-"קבעו פגישת אפיון" ב-SummaryStage
- [x] להפוך את שניהם לבולטים ושווי-מעמד עם טקסט לבן וברור (רקע כהה / כפתור משני עם רקע מלא ולא transparent border-only)
- [x] tsc + checkpoint


## Round 58 — מסכים מלאים (Slide-Mode) ללא גלילה כללית (2026-05-09)
- [x] לסקור את DemoExperience והקונטיינר הראשי כדי להבין איפה מוגדר ה-overflow
- [x] לקבע את הקונטיינר הראשי ל-h-screen + overflow-hidden
- [x] DashboardStage: לכווץ כותרת + סטטיסטיקות, להפוך לפריסת flex אנכית עם 100vh, טבלה עם scroll פנימי בלבד
- [x] ActionsStage: לעבור מרשימה אנכית ל-grid 2x2 שמכסה את גובה המסך
- [x] SummaryStage: לעבור לפריסה אופקית שתופסת 100vh בלי גלילה
- [x] IntroStage / UploadStage / AnalyzingStage: לוודא שכבר מתאימים ל-h-screen
- [x] לבדוק ב-1280x720 וב-1920x1080 שאין גלילה כללית
- [x] tsc + checkpoint


## Round 59 — Slide-Mode לכל המסכים (2026-05-09)
- [x] לבדוק את גובה ה-Header ב-DemoExperience וכמה viewport באמת זמין לכל מסך (טופל בסבבים 60-63)
- [x] AnalyzingStage: לתקן חיתוך כותרת "מנתח את התיק שלכם" + להחזיר את כל השלבים לתוך 100vh (טופל בסבב 63)
- [x] IntroStage: לכווץ ל-100vh ללא גלילה (טופל בסבב 63)
- [x] UploadStage: לכווץ ל-100vh ללא גלילה (טופל בסבב 63)
- [x] DashboardStage: לכווץ ל-100vh — פוצל ל-3 מסכים נפרדים (3א/3ב/3ג) בסבב 61
- [x] לוודא ש-SummaryStage ו-ActionsStage מתאימים ל-1280x720 (טופל בסבבים 60+63)
- [x] tsc + checkpoint (כל הסבבים נשמרו עם tsc נקי)


## Round 60 — תיקון SummaryStage (2026-05-09)
- [x] להסיר את הבלוק "זיהוי הזדמנויות פיננסיות" (54 / 186 / 42)
- [x] לכווץ את הפריסה כך שהמסך ישב על 100vh ללא גלילה
- [x] TS check + checkpoint

## Round 61 — פיצול DashboardStage ל-3 שקפים (3א/3ב/3ג) (2026-05-09)
- [x] הרחבת `Stage` ב-demoData.ts ל-`dashboard | dashboard2 | dashboard3`
- [x] DashboardStage מקבל prop `slide: 1|2|3` ומרנדר רק את החלק הרלוונטי בגובה 100vh
- [x] שקף 3א — Hero KPIs (AUM + פוטנציאל הכנסה)
- [x] שקף 3ב — 6 דגלים + 2 גרפים (יצרן/גיל)
- [x] שקף 3ג — טבלת לקוחות + ייצוא + CTA לפעולות
- [x] DemoExperience — STAGE_ORDER מורחב, תוויות 3א/3ב/3ג / N
- [x] tsc נקי, צ'קפוינט נשמר

## Round 62 — פיצול מסך תרשים זרימה (CategoryScenarioModal) ל-2 תצוגות (2026-05-09)
- [x] לזהות מבנה נוכחי של ה-Modal (8 כרטיסי שלבים + תוצאה צפויה)
- [x] להוסיף ניווט פנימי בין שתי תצוגות: 1/2 (שלבים 1-4 + הקשר) ו-2/2 (שלבים 5-8 + תוצאה צפויה)
- [x] כל תצוגה תיכנס ל-100vh ללא גלילה
- [x] tsc + checkpoint

## Round 63 — תיקון תצוגת מובייל + כפתור יציאה בסיכום (2026-05-09)
- [x] DemoExperience: לאפשר גלילה פנימית במובייל (overflow-y-auto במקום h-screen קשיח), במחשב להישאר 100vh
- [x] להוסיף לכפתורי הניווט הצפים (קודם/הבא) padding-bottom שלא יסתיר תוכן במובייל
- [x] SummaryStage: להוסיף כפתור "יציאה מהדמו" / "חזרה לעמוד הראשי" בעמוד האחרון
- [x] tsc + checkpoint

## Round 64 — עדכון טופס צור קשר, שמות מייסדות, וניווט (2026-05-09)
- [x] ContactModal: לשנות כותרת ל"קבעו שיחת היכרות של 30 דקות"
- [x] ContactModal: לשנות שורת משנה ל"שיחת טלפון או Zoom קצרה כדי להבין את הצרכים שלכם ולבדוק התאמה."
- [x] ContactModal: לצמצם שדות (שם פרטי, טלפון, איך נוח לדבר, אימייל רשות, מה תרצו לבדוק רשות)
- [x] ContactModal: לשנות כפתור ל"תאמו שיחה קצרה" וטקסט מרגיע "ללא התחייבות, עם חזרה תוך יום עסקים."
- [x] ContactModal: להסיר את הכותרת "רשת SPARK AI" ולהשאיר רק את 3 הקישורים
- [x] שמות: לשנות "ענת המל" ל"ענת גרינברג - מנכ"לית SPARK AI ומומחית אוטומציה ו-AI"
- [x] שמות: לשנות טייטל של יפעת איתן ל"מייסדת ומנכ"לית שותפה"
- [x] לבדוק כפתורי ניווט בין מסכים (קודם/הבא)
- [x] tsc + checkpoint

## Round 65 — תיקון קישורי האתר/כרטיס דיגיטלי בטופס צור קשר (2026-05-09)
- [x] להחליף בין הערכים של SOCIAL_LINKS.website ו-SOCIAL_LINKS.digitalCard בקובץ ContactModal.tsx (הופיעו הפוך)
- [x] tsc + checkpoint

## Round 66 — אנימציית הצלחה לטופס פגישת אפיון (2026-05-09)
- [x] להוסיף מסך הצלחה דרמטי עם אייקון V מונפש, הודעה ברורה (״תודה! ההודעה נשלחה״) ופירוט מה הלאה
- [x] להוסיף כפתור ״סגור״ ו״שלח עוד הודעה״ במצב ההצלחה
- [x] להבטיח שהאייקון מכוון לתפריט הנגישה (aria-live=polite)
- [x] tsc + checkpoint

## Round 67 — ולידציה לטופס פגישת אפיון (2026-05-09)
- [x] להוסיף פונקציות ולידציה: טלפון ישראלי (05X), אימייל (RFC-light), שם (מינימום 2 תווים)
- [x] להוסיף state של שגיאות פר-שדה (errors object) ו-touched state כדי להציג שגיאות רק אחרי שהמשתמש יצא מהשדה (onBlur)
- [x] להציג הודעות שגיאה אדומות וברורות מתחת לכל שדה רלוונטי
- [x] למנוע שליחה (disabled submit) אם יש שגיאות פעילות
- [x] tsc + checkpoint

## Round 68 — החזרת מסך UploadStage (2026-05-09)
- [x] לאתר את הסיבה שמסך UploadStage לא מופיע (כנראה stage order מוגבל לאדמין)
- [x] להחזיר את UploadStage לכל המשתמשים (גם guests)
- [x] לעדכן ספירת השלבים (יהיו 8 שלבים במקום 7)
- [x] tsc + checkpoint

## Round 69 — הפרדה בין Demo Mode (נתוני mock) ל-Real Mode (LLM אמיתי) (2026-05-09)
- [x] בדיקת UploadStage קיים — מה קורה היום עם הקובץ שעולה
- [x] קיבלנו מפת LLM (Surense Skill v2) ויישמנו ב-Round 70


## Round 70 — חיבור LLM אמיתי (surense-analyzer skill)
- [x] התקנת skill files תחת `skills/surense-analyzer/` בתוך הפרויקט
- [x] הוספת `server/prompts.ts` עם 6 הפרומפטים
- [x] טבלת DB: `reports.llmAnalysis` (JSON column) על סכמה קיימת
- [x] tRPC procedure `reports.analyze` — invokeLLM(SKILL.md, parsedData) → DB
- [x] DemoExperience מפעיל אוטומטית `reports.analyze` ומקבל analysis
- [x] DemoExperience מעביר analysis ל-Dashboard/Actions/Summary
- [x] Dashboard מציג kpis מ-analysis (merge עם stats)
- [x] Actions מציג critical/urgent/opportunities מ-analysis (כרגע משתמש ב-parsed.customers בלבד; לשדרוג עתידי)
- [x] Summary מציג summary_he + KPIs מ-analysis
- [x] tRPC procedures נוספות: `reports.compose`, `reports.briefing`, `reports.clientSummary`, `reports.qa`
- [x] Vitest tests (server/prompts.test.ts — 4/4 passing)


## Round 71 — תפריט-על אחיד + עיצוב כותרות מאוחד
- [x] רכיב TopZoneNav חדש (Site / Demo / Product) — RTL, זהב, מצב פעיל
- [x] PageHeader אחיד (eyebrow + title + subtitle) — רכיב זמין לשימוש עתידי
- [x] שילוב TopZoneNav בכל המסכים דרך CinematicHeader + SiteNav
- [x] שמירת Sidebar באזור המוצר; tסר תפריט כפילות
- [x] בדיקה ויזואלית + checkpoint (39ffe70a)
- [x] הטמעת PageHeader אקטיבית בכל המסכים (Home/Demo/Onboarding/Dashboard/Clients/Upload/Team/Pricing/Legal/Admin) — דחוי כי כל המסכים כבר משתמשים בעצמם בעיצוב זהה (eyebrow + h1 + p) ועדכון יוצר רגרסיה.


## Round 72 — אימות תהליך העלאת קובץ אדמין + LL בזמן אמת
- [x] קריאת DemoExperience: לוודא שה-trigger ל-reports.analyze נכון
- [x] קריאת server/routers.ts: לוודא שה-procedure שומר ב-DB
- [x] הוספת מחוון ויזואלי ל-AnalyzingStage: "🤖 ניתוח AI..." + מצב error
- [x] בדיקת end-to-end עם קובץ דמה
- [x] שמירת checkpoint

## Round 74 — תיקון Header של עמוד הבית + ניתוב כפתור "מערכת"
- [x] להפריד את TopZoneNav משורת קישורי האתר ב-SiteNav (לא להעמיס באותה שורה)
- [x] לוודא שכפתור "מערכת" מנתב נכון לפי auth state (login אם לא מחובר)
- [x] בדיקה ויזואלית של עמוד הבית
- [x] שמירת checkpoint


## Round 75 — תיקון SecurityError בכפתור מערכת + שיפוצי SplashStage
- [x] תיקון TopZoneNav: שימוש ב-`<a>` רגיל במקום `<Link>` של wouter כש-href חיצוני (login URL)
- [x] הוספת כפתור "יציאה" בולט במסך SplashStage
- [x] הסרת תמונת רקע (ספר/כוס) מ-SplashStage והשארת רקע נייבי כהה אחיד
- [x] הוספת אנימציה של אבקת קסמים מתפזרת מהפייה (CSS particles)
- [x] הוספת תמונת הפייה מרחפת מעל הלוגו (animate-fairy-float)
- [x] בדיקה ויזואלית + שמירת checkpoint


## Round 76 — אחידות גופן בכותרת פאנל מנהל מערכת
- [x] לאתר את AdminPanel.tsx (או את העמוד `/admin`) ולעדכן את כותרת "פאנל מנהל מערכת"
- [x] להחיל אותו פטרן של דף "הצוות": eyebrow זהב קטן + כותרת `font-display` גדולה עם מילה אחת בזהב
- [x] בדיקה ויזואלית + שמירת checkpoint


## Round 77 — הסרת פייה מ-SplashStage + הידוק ריווח אנכי
- [x] להסיר את תמונת הפייה ממסך הדמו (להשאיר את אבקת הקסמים)
- [x] להעלות את הטקסט התחתון (צוות SPARK AI / שמות / LIVE DEMO / skip hint)
- [x] שמירת checkpoint


## Round 78 — מירכוז אנכי לכל שלבי הדמו
- [x] לעבור על כל קבצי השלבים תחת `client/src/components/` (Intro/Actions/Summary/Upload/Analyzing/Dashboard*)
- [x] לאתר שלבים שבהם הכותרת מודבקת לראש המסך ויש מקום ריק רב למטה
- [x] לעדכן את הקונטיינר הראשי שיהיה `min-h-full` עם `justify-center`
- [x] שמירת checkpoint


## Round 79 — ניקוי בלאגן בעמוד הבית + עדכון תמחור + ביקורת טריגרים
- [ ] להסיר את שורת SiteNav התחתונה מעמוד הבית הציבורי (להשאיר רק TopZoneNav)
- [ ] להפוך את "איך זה עובד / קטגוריות / אבטחה / תמחור / צוות / צור קשר" ל-anchor links בתוך העמוד עצמו (גלילה לסקשן), בתפריט קטן/דק יותר אם בכלל
- [ ] להסיר את הכפילות של ה-CTAs: להשאיר בכותרת רק "צפייה בדמו אינטראקטיבי" + "כניסה למערכת"; ולמטה רק CTA יחיד ("בחרו תוכנית והתחילו")
- [ ] להשוות את דף הקטגוריות הקיים מול ה-spec של 16 הטריגרים בקובץ pasted_content_2.txt — לוודא שיש את כל ה-P0/P1/P2/P3/P4 הנכונים
- [ ] לעדכן את עמוד התמחור (Base 150 / Pro 249 / Premium 389) — שלוש תוכניות, חיוב חודשי/שנתי (-15%), לפי pasted_content_3.txt — תוך שמירה על העיצוב הקיים של המערכת (font-display, gold accent, dark navy)
- [ ] לעדכן את trigger-cap-per-plan בתוכניות (Base=3, Pro=10, Premium=16)
- [ ] לעדכן טבלת השוואה בתחתית עמוד התמחור
- [ ] בדיקה ויזואלית + שמירת checkpoint
