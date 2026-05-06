# SPARK AI · Project TODO

> מסמך זה מתעד מה הושלם **בסשן הנוכחי** (אחרי ה-rollback לגרסה 3f9077e5).
> פריטים שהושלמו לפני ה-rollback מופיעים תחת "ארכיון" כי אין להם הוכחת קוד נוכחית.

---

## ✅ הושלם בסשן זה — החלת שפת העיצוב הסינמטית של הדמו על ה-SaaS

- [x] מיפוי טוקני העיצוב מהדמו (CSS variables, font-display, gold tones, hero asset)
- [x] יצירת רכיבים משותפים: `CinematicShell`, `GlassCard`, `GoldEyebrow` ב-`client/src/components/CinematicShell.tsx`
- [x] העברת הדמו האינטראקטיבי המקורי ל-`/demo` (`DemoExperience.tsx`)
- [x] עדכון `Home.tsx` ל-Landing שיווקי בסגנון סינמטי (Hero + CTA לכניסה ולדמו)
- [x] עדכון `Onboarding.tsx` — רקע סינמטי, glass-cards עם גבולות זהב
- [x] עדכון `Dashboard.tsx` — כרטיסי מטריקה, טיפוגרפיה Rubik, banner trial
- [x] עדכון `UploadReport.tsx` — drag-drop מודגש, מסך סיכום עם 4 מטריקות
- [x] עדכון `Clients.tsx` — חיפוש ב-glass-card, hover זהב, אווטרים זהובים
- [x] עדכון `Team.tsx` — טופס הזמנה משודרג, badges לפי תפקיד
- [x] vitest — 4 טסטים עוברים (`auth.logout`, `workspaces` ×3)
- [x] checkpoint נשמר (`98fa9bc2`)

---

## 🔲 פתוח — שיפורים אפשריים להמשך

- [ ] DashboardLayout עם sidebar מלא למסכי SaaS (במקום navigation מבוזר)
- [ ] Pricing page (טבלת תוכניות תמחור)
- [ ] שילוב הלוגו הרשמי של SPARK AI ב-CinematicShell (כרגע מוצגת מילת SPARK AI בלבד)
- [ ] בדיקה ויזואלית מקיפה של כל 6 המסכים בתצוגות מובייל/דסקטופ עם screenshots מסודרים

---

## 📦 ארכיון — הושלם בסשנים קודמים (לפני ה-rollback של היום)

> פריטים אלה היו ב-todo.md ישן. אחרי ה-rollback ל-3f9077e5 חלקם
> נשארו בקוד וחלקם לא — אין דרך לאמת אותם ללא בדיקת קבצים.
> משאירים אותם כ-[ ] להמשך ביצוע לפי הצורך.

### שילוב הלוגו הרשמי
- [ ] העלאת קובץ הלוגו ללא רקע ל-webdev-static-assets
- [ ] העלאת קובץ הלוגו עם הרקע הסגול
- [ ] עדכון Header עם הלוגו החדש
- [ ] שילוב הלוגו במסך הסיכום (SummaryStage)

### אימות נתוני הדמו
- [ ] איתור קובץ הדוח האמיתי בתיקיית uploads
- [ ] סקריפט Python לחישוב מטריקות
- [ ] השוואה ל-demoData/parseReport
- [ ] תיקון parseReport.ts אם יש פערים

### מדריך מודפס
- [ ] בניית מדריך HTML מחדש ללא אזכורי קוואליטי
- [ ] המרה ל-PDF

### בניית SaaS V1 — תשתית & DB & tRPC
> **בקוד** — Drizzle schema (workspaces/users/invitations/reports/clients/policies/actionItems),
> tRPC routers (workspaces/reports/clients), ו-vitest קיימים ועובדים.
> נסמן כ-[x] רק את אלו שאומתו בקוד הנוכחי:
- [x] שדרוג ל-web-db-user (drizzle/schema.ts קיים, drizzle/relations.ts קיים)
- [x] tRPC routers — workspaces/reports/clients (server/routers.ts קיים, vitest עובר)
- [x] vitest לבידוד נתונים (server/workspaces.test.ts — 3 טסטים עוברים)


## 📈 הוספת תהליכים פיננסיים ל-SaaS (עבור סוכנים פיננסיים)

- [ ] אפיון קטגוריות פיננסיות (השתלמות נזילה, תיקון 190, דמי ניהול, ניודים)
- [ ] עדכון `parseReport.ts` לזיהוי דגלים פיננסיים מתוך קובץ שורנס
- [ ] עדכון `ActionsStage.tsx` להצגת פעולות פיננסיות (אנימציה)
- [ ] עדכון Dashboard להצגת מטריקות פיננסיות (למשל: "הון נזיל להשקעה")
- [ ] עדכון Clients להצגת דגלים פיננסיים בטבלה
- [ ] בדיקות vitest ושמירת checkpoint

- [ ] הוספת קטגוריית VIP (לקוחות עם צבירה גבוהה) — סף אוטומטי + סף מותאם
- [ ] זיהוי תשואות חלשות / חזקות לפי השוואה לבנצ'מרק (מסלקה / שורנס)
- [ ] תג VIP בולט בטבלת לקוחות + פילטר ייעודי
