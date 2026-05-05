# שילוב הלוגו הרשמי של SPARK AI

- [ ] העלאת קובץ הלוגו ללא רקע ל-webdev-static-assets
- [ ] העלאת קובץ הלוגו עם הרקע הסגול לשימוש במסך הסיכום
- [ ] עדכון Header עם הלוגו החדש (גרסת ללא רקע)
- [ ] שילוב הלוגו במסך הסיכום (SummaryStage) במקום אייקון Sparkles
- [ ] בדיקה ויזואלית של כל המסכים
- [ ] שמירת checkpoint סופי


# Todo (חדש) - אימות נתוני הדמו ובניית מדריך מחדש

- [ ] איתור קובץ הדוח האמיתי בתיקיית uploads
- [ ] כתיבת סקריפט Python לקריאת הקובץ והפקת מטריקות (לקוחות, AUM, פרמיה, דגלים)
- [ ] השוואת התוצאות לערכים שמופיעים בדמו (demoData / parseReport)
- [ ] תיקון parseReport.ts אם יש פערים
- [ ] בניית מדריך HTML מחדש ללא אזכורי קוואליטי + המרה ל-PDF
- [ ] שמירת checkpoint ודיווח סופי


# בניית SaaS Multi-Tenant — V1 MVP

## תשתית
- [x] שדרוג הפרויקט ל-Full-Stack (web-db-user) — בוצע
- [x] פתרון התנגשות ב-client/src/pages/Home.tsx (לשמור את הקוד הישן + להוסיף Auth)
- [x] עדכון package.json להחזרת xlsx, jspdf, html2canvas (חיוניים לדמו)
- [x] התקנת תלויות (pnpm install)

## מודל נתונים (Drizzle Schema)
- [x] טבלת workspaces (סוכנויות / בתי סוכן) — id, name, plan, createdAt
- [x] עדכון טבלת users — workspaceId (FK), role בתוך workspace (admin/agent)
- [x] טבלת invitations — workspaceId, email, token, expiresAt
- [x] טבלת reports — workspaceId, ownerUserId, fileKey, uploadedAt, summary
- [x] טבלת clients — workspaceId, ownerUserId, idNumber, name, email, phone, ...
- [x] טבלת policies — clientId, productType, premium, balance, startDate, endDate, ...
- [x] טבלת actionItems — workspaceId, clientId, type, status, priority

## Backend (tRPC)
- [x] workspace router — create, get, listMembers, invite, removeMember
- [x] reports router — upload, list, parse, getSummary
- [x] clients router — list (filtered by workspace + role), get, search
- [x] adminProcedure — אימות שהמשתמש הוא admin בתוך ה-workspace שלו

## Frontend
- [ ] מסך Landing חדש (Marketing) — Hero, Features, Pricing, CTA לרישום
- [ ] מסך Login/Signup
- [x] מסך Onboarding — יצירת workspace חדש או הצטרפות לקיים
- [x] Dashboard ראשי לאחר התחברות
- [x] מסך העלאת דוח (Upload) ששומר ב-DB
- [x] מסך תיק לקוחות (Clients) עם חיפוש ובידוד נתונים
- [x] שמירת חוויית הדמו הקיימת כ-"Demo Mode" / "Try Now" ללא לוגין
- [x] מסך Settings → Team Members — הזמנה, הסרה, שינוי הרשאות
- [ ] DashboardLayout עם sidebar מלא (יבנה בגרסה הבאה)

## בדיקות וצ'קפוינט
- [x] vitest test לבידוד נתונים (3 טסטים — כולם עוברים)
- [x] שמירת checkpoint


# החלת שפת העיצוב הסינמטית של הדמו על מסכי ה-SaaS

- [ ] מיפוי טוקנים, רקעים, ASSETS, כפתורי זהב, כותרות Rubik מהדמו
- [ ] עדכון Landing (Home.tsx) — Splash hero עם תמונת הספר, חלקיקי זהב, כפתור "התחילו ניסיון" זהב
- [ ] עדכון Onboarding — רקע סינמטי, כרטיסים בסגנון הדמו (גבולות זהב, glass)
- [ ] עדכון Dashboard — רקע נייבי, כרטיסי מטריקה מסגנון DashboardStage, טיפוגרפיה Rubik
- [ ] עדכון UploadReport — רקע נייבי+דרמה, אזור drag-drop בסגנון UploadStage
- [ ] עדכון Clients — טבלה עם נייבי-deep, hover זהב, כותרות תואמות
- [ ] עדכון Team — קלפי חברי צוות עם גבולות זהב, רקע סינמטי
- [ ] בדיקה ויזואלית של 6 המסכים והשוואה לדמו
- [ ] vitest רץ ועובר
- [ ] שמירת checkpoint סופי
