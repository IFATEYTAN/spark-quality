# שילוב הלוגו הרשמי של SPARK AI

- [x] העלאת קובץ הלוגו ללא רקע ל-webdev-static-assets
- [x] העלאת קובץ הלוגו עם הרקע הסגול לשימוש במסך הסיכום
- [x] עדכון Header עם הלוגו החדש (גרסת ללא רקע)
- [x] שילוב הלוגו במסך הסיכום (SummaryStage) במקום אייקון Sparkles
- [x] בדיקה ויזואלית של כל המסכים
- [x] שמירת checkpoint סופי


# Todo (חדש) - אימות נתוני הדמו ובניית מדריך מחדש

- [x] איתור קובץ הדוח האמיתי בתיקיית uploads
- [x] כתיבת סקריפט Python לקריאת הקובץ והפקת מטריקות (לקוחות, AUM, פרמיה, דגלים)
- [x] השוואת התוצאות לערכים שמופיעים בדמו (demoData / parseReport)
- [x] תיקון parseReport.ts אם יש פערים
- [x] בניית מדריך HTML מחדש ללא אזכורי קוואליטי + המרה ל-PDF
- [x] שמירת checkpoint ודיווח סופי


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
- [x] מסך Landing חדש (Marketing) — Hero, Features, Pricing, CTA לרישום
- [x] מנגנון Login/Signup (משתמש ב-OAuth של Manus, מופעל ישירות מה-Landing ללא מסך ביניים)
- [x] מסך Onboarding — יצירת workspace חדש או הצטרפות לקיים
- [x] Dashboard ראשי לאחר התחברות
- [x] מסך העלאת דוח (Upload) ששומר ב-DB
- [x] מסך תיק לקוחות (Clients) עם חיפוש ובידוד נתונים
- [x] שמירת חוויית הדמו הקיימת כ-"Demo Mode" / "Try Now" ללא לוגין
- [x] מסך Settings → Team Members — הזמנה, הסרה, שינוי הרשאות
- [x] ניווט פנימי (הוחלט להשאיר את הניווט העליון הקיים של הדמו במקום לעטוף ב-Sidebar כדי לשמור על עיצוב אחיד)

## בדיקות וצ'קפוינט
- [x] vitest test לבידוד נתונים (3 טסטים — כולם עוברים)
- [x] שמירת checkpoint


# תיקון עיצוב — החלת שפת הדמו על כל מסכי ה-SaaS

- [ ] מיפוי טוקני העיצוב מהדמו (Navy 950, Gold, Heebo, RTL)
- [ ] עדכון client/src/index.css עם הטוקנים האחידים
- [ ] עדכון Landing (Home.tsx) — רקע Navy + Gold + Heebo
- [ ] עדכון Onboarding — רקע Navy + Gold + Heebo
- [ ] עדכון Dashboard — רקע Navy + Gold + Heebo
- [ ] עדכון UploadReport — רקע Navy + Gold + Heebo
- [ ] עדכון Clients — רקע Navy + Gold + Heebo
- [ ] עדכון Team — רקע Navy + Gold + Heebo
- [ ] בדיקה ויזואלית של כל המסכים
- [ ] שמירת checkpoint


# החלפת פלטת המותג מ-Navy לסגול עמוק (Deep Plum) + Gold

- [x] העלאת לוגות חדשים ל-webdev-static-assets
- [x] עדכון demoData.LOGO עם הקבצים החדשים
- [x] עדכון index.css — החלפת navy לסגול עמוק (Deep Plum) דרך CSS aliases
- [x] תיקון bg-blue-600 ב-NotFound.tsx (כפתור הבית)
- [x] תיקון bg-blue-500/20 ב-Team.tsx (תג admin)
- [x] בדיקה ויזואלית של כל המסכים (Demo + SaaS)
- [x] vitest — 4 בדיקות עוברות
- [x] שמירת checkpoint
