# triggers-reference.md
# 16 טריגרים — טבלת עזר מהירה
# מבוסס על נתוני דוח_מוצרים_בניהול_03_2026
# SPARK AI | v2.0

---

## טבלת טריגרים מלאה

| # | Flag | עדיפות | תנאי מדויק | כמות בדוח | פעולה |
|---|---|---|---|---|---|
| T1 | appointment_expired | P0 🔴 | daysRemaining < 0 | לבדוק | חידוש דיגיטלי מיידי |
| T2 | appointment_expiring_90d | P0 🔴 | 0–90 ימים | 8 (שנה) | פנייה לחידוש |
| T3 | risk_zmani | P1 🟠 | סטטוס = "ריסק זמני" / "ריסק זמני אוטומטי" | 54 | טלפון 48 שעות |
| T4 | expiring_coverage | P1 🟠 | תום כיסוי < 365 ימים | 12 לקוחות | הצעת חידוש |
| T5 | no_pension | P2 🟡 | אין פנסיה/מנהלים לפי ת.ז | 366 | מייל ממוקד גיל |
| T6 | savings_no_insurance | P2 🟡 | יש חיסכון, אין ביטוח (גיליון 3 vs 5) | 979 | קרוס-סייל |
| T7 | no_nursing_46plus | P2 🟡 | גיל ≥ 46, אין ביטוח סיעודי | 340 | הצעת סיעוד |
| T8 | inactive_with_balance | P2 🟡 | לא פעיל + צבירה > 30K | 340 / ₪85.5M | שיחת בירור |
| T9 | high_fees | P3 🔵 | דמ"נ > 0.7% או הפקדה > 1.5% | 855 / ₪1.35M | משא ומתן |
| T10 | track_age_mismatch | P3 🔵 | גיל ≥ 55 + מסלול "מניות" | 39 | ייעוץ מסלול |
| T11 | self_employed_no_deposit | P3 🔵 | עצמאי/בעל שליטה + הפקדה = 0 | 7 | ייעוץ הפרשה |
| T12 | concentration_risk | P3 🔵 | חברה > 35% AUM כולל | 0 בדוח זה | פיזור |
| T13 | birthday_milestone | P4 ⚪ | גיל 40/50/60 החודש | ~ | וואטסאפ + פגישה |
| T14 | birthday_this_month | P4 ⚪ | יום הולדת החודש (לא מפנה) | 99 | וואטסאפ אישי |
| T15 | no_email | P4 ⚪ | דוא"ל ריק | 60 | SMS לעדכון |
| T16 | vip | P4 ⚪ | צבירה ≥ 1M או זהב/פרימיום | 227 | פגישה שנתית |

---

## טריגרים משולבים (כשיש כמה)

```
coverage_gaps = no_pension AND savings_no_insurance
liquid_fund   = קרן השתלמות AND ותק ≥ 6 שנים
tikun_190     = גיל ≥ 60 AND צבירה ≥ 300K AND לא פנסיה
```

---

## סדר עדיפות לפרומפט (primaryFlag)

```typescript
const PRIORITY_ORDER = [
  'appointment_expired',     // 0 — משפטי קריטי
  'appointment_expiring_90d',// 0 — דחוף
  'risk_zmani',              // 1 — ביטוחי דחוף
  'expiring_coverage',       // 1 — חידוש
  'coverage_gaps',           // 2 — חסר הכל
  'no_pension',              // 2 — פנסיה
  'savings_no_insurance',    // 2 — קרוס
  'no_nursing_46plus',       // 2 — סיעוד
  'inactive_with_balance',   // 2 — צבירה ישנה
  'high_fees',               // 3 — דמ"נ
  'track_age_mismatch',      // 3 — מסלול
  'self_employed_no_deposit',// 3 — עצמאי
  'birthday_milestone',      // 4 — מפנה
  'liquid_fund',             // 4 — נזיל
  'tikun_190',               // 4 — מס
  'vip',                     // 4 — VIP
  'birthday_this_month',     // 4 — שגרה
  'no_email',                // 4 — השלמה
  'concentration_risk',      // 5 — ניהול
  'regular',                 // אחרון
]
```

---

## AI Composer — מה לכתוב לכל טריגר

| Flag | ערוץ מועדף | מסר עיקרי | אורך |
|---|---|---|---|
| appointment_expired | וואטסאפ | "המינוי פג — תהליך דיגיטלי 3 דקות" | 4 שורות |
| appointment_expiring_90d | וואטסאפ | "המינוי עומד לפוג — בואנו נחדש" | 3 שורות |
| risk_zmani | טלפון | "הכיסוי בסכנה — צריך לדבר" | 2 שורות |
| expiring_coverage | מייל | "כיסוי X פוקע ב-Y ימים — חידוש?" | 5 שורות |
| no_pension | מייל | "יש לך גמל/השתלמות — אין פנסיה" | 5 שורות |
| savings_no_insurance | וואטסאפ | "יש לך חיסכון — אין ביטוח" | 3 שורות |
| no_nursing_46plus | מייל | "גיל X — ביטוח סיעוד לפני שמתייקר" | 5 שורות |
| inactive_with_balance | וואטסאפ | "יש לך כסף שלא עושה כלום" | 3 שורות |
| high_fees | מייל | "שמנו לב לדמי ניהול — שווה לבדוק" | 5 שורות |
| track_age_mismatch | מייל | "גיל X — מסלול ההשקעה שווה בדיקה" | 5 שורות |
| self_employed_no_deposit | וואטסאפ | "עצמאי/ת — לא הפקדת לאחרונה" | 3 שורות |
| birthday_milestone | וואטסאפ | "יום הולדת X — שנה מיוחדת!" | 2 שורות |
| birthday_this_month | וואטסאפ | "יום הולדת שמח!" | 1 שורה |
| no_email | SMS | "שלחי מייל לעדכון פרטים" | 1 שורה |
| vip | טלפון | "פגישה שנתית — תיק מרכזי" | — |
| liquid_fund | וואטסאפ | "ההשתלמות נזילה — מה עושים?" | 3 שורות |
