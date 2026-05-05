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
- [ ] שדרוג הפרויקט ל-Full-Stack (web-db-user) — בוצע
- [ ] פתרון התנגשות ב-client/src/pages/Home.tsx (לשמור את הקוד הישן + להוסיף Auth)
- [ ] עדכון package.json להחזרת xlsx, jspdf, html2canvas (חיוניים לדמו)
- [ ] התקנת תלויות (pnpm install)

## מודל נתונים (Drizzle Schema)
- [ ] טבלת workspaces (סוכנויות / בתי סוכן) — id, name, plan, createdAt
- [ ] עדכון טבלת users — workspaceId (FK), role בתוך workspace (admin/agent)
- [ ] טבלת invitations — workspaceId, email, token, expiresAt
- [ ] טבלת reports — workspaceId, ownerUserId, fileKey, uploadedAt, summary
- [ ] טבלת clients — workspaceId, ownerUserId, idNumber, name, email, phone, ...
- [ ] טבלת policies — clientId, productType, premium, balance, startDate, endDate, ...
- [ ] טבלת actionItems — workspaceId, clientId, type, status, priority

## Backend (tRPC)
- [ ] workspace router — create, get, listMembers, invite, removeMember
- [ ] reports router — upload, list, parse, getSummary
- [ ] clients router — list (filtered by workspace + role), get, search
- [ ] adminProcedure — אימות שהמשתמש הוא admin בתוך ה-workspace שלו

## Frontend
- [ ] מסך Landing חדש (Marketing) — Hero, Features, Pricing, CTA לרישום
- [ ] מסך Login/Signup
- [ ] מסך Onboarding — יצירת workspace חדש או הצטרפות לקיים
- [ ] DashboardLayout עם sidebar — Dashboard, Clients, Reports, Action Items, Team, Settings
- [ ] שמירת חוויית הדמו הקיימת כ-"Demo Mode" / "Try Now" ללא לוגין
- [ ] מסך Settings → Team Members — הזמנה, הסרה, שינוי הרשאות

## בדיקות וצ'קפוינט
- [ ] vitest test למשפט: "user from workspace A cannot read clients from workspace B"
- [ ] vitest test ל-invitation flow
- [ ] שמירת checkpoint
