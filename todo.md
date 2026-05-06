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
- [ ] זיהוי תשואות מדויק לפי השוואה לבנצ'מרק (דורש חיבור API למסלקה / שורנס)
- [ ] בדיקה ויזואלית מקיפה של כל המסכים בתצוגות מובייל/דסקטופ עם screenshots מסודרים
- [ ] אינטגרציית Stripe לתשלומים בפועל (לפי תוכניות ה-Pricing)


## 🎬 הוספת קטגוריות פיננסיות לדמו ההדרכה (DemoExperience `/demo`)
- [ ] עדכון demoData.ts — הוספת 3 לקוחות פיננסיים (VIP, השתלמות נזילה, תיקון 190)
- [ ] עדכון SummaryStage להציג 3 KPIs פיננסיים נוספים
- [ ] עדכון ActionsStage להציג 2 פעולות פיננסיות
- [ ] בדיקה ויזואלית של הזרימה המלאה
