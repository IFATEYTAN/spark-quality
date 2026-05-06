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
- [ ] לוודא שהמשתמשת לוחצת Publish כדי לראות את השינויים


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
- [ ] InteractiveFlowchart - לעבור לפלטת המערכת (navy/gold/cream) במקום הצבעים האקראיים
- [ ] InteractiveFlowchart - לתקן את הפריסה והגלישה של טקסטים, להבטיח אחידות
- [ ] InteractiveFlowchart - אנימציה אינטראקטיבית של הזרימה לכל שלב
- [ ] SummaryStage - לתקן את הפוטר התחתון הנחתך + לאפשר גלילה
- [ ] SummaryStage - לתקן את הקלף השמאלי "אתם לא צריכים עוד זמן..." (טקסט נחתך)
- [ ] להחליף כפתור "קבעו פגישת אפיון" בטופס יצירת קשר עם:
  - מייל ענת: anathemell@gmail.com
  - וואטסאפ יפעת: 0545633661
  - וואטסאפ ענת: 054-739-5570
  - Facebook: https://www.facebook.com/people/Spark-Ai/61572580830662/
  - LinkedIn (לבדוק עם המשתמשת)
  - אתר: https://get-marketing.co.il/spark-ai/
  - כרטיס ביקור דיגיטלי: https://spark-ai-sprinkle-ai-and-automat-30332645.base44.app/Main
- [ ] vitest + checkpoint + push GitHub
