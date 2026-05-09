# Make → SPARK Quality — חוזה ה-callback של תשלום

מסמך זה מגדיר במדויק איך תרחיש Make.com מחזיר ל-SPARK Quality אישור תשלום (או כישלון) אחרי שה-iCount סלק את הלקוח.

---

## 1. כתובת היעד (Endpoint)

**Production**

```
POST https://sparkquality-zqvpyevd.manus.space/api/billing/activate
```

**Headers**

```
Content-Type: application/json
```

> ה-endpoint **פתוח לאינטרנט בכוונה** (אין session cookie). האימות נעשה דרך השדה `signature` בגוף ה-JSON — HMAC-SHA256 עם סוד משותף שמוגדר אצלי כ-`MAKE_BILLING_SHARED_SECRET`. בלי חתימה תקינה ה-callback נדחה עם `403`.

---

## 2. גוף הבקשה (Request body)

```json
{
  "workspaceId": 60002,
  "requestId": "71a14c1b7d34ae89ef83f0e87b16111b",
  "status": "ok",
  "plan": "basic",
  "billingPeriod": "monthly",
  "invoiceId": "12345",
  "subscriptionId": "67890",
  "clientId": "555",
  "signature": "<HMAC-SHA256 hex>"
}
```

**טבלת השדות**

| שדה | חובה | סוג | מקור ב-Make | הערות |
|---|---|---|---|---|
| `workspaceId` | כן | number | ה-Bundle ההתחלתי שקיבלת מ-Spark Quality | אותו ערך שאני שולחת לך בקריאה הראשונה |
| `requestId` | כן | string (32 hex) | ה-Bundle ההתחלתי | ה-correlation id שמקשר בין הקריאה היוצאת לחוזרת |
| `status` | כן | `"ok"` או `"fail"` | קבועה ע"ב תוצאת iCount | `ok` = תשלום אושר; `fail` = נדחה / boucefail |
| `plan` | מומלץ | `"basic"` / `"pro"` / `"premium"` | ה-Bundle ההתחלתי | sanity-check; אם חסר נשאר הערך הקיים ב-DB |
| `billingPeriod` | מומלץ | `"monthly"` / `"yearly"` | ה-Bundle ההתחלתי | אותו דבר — חוזר אלינו לסנכרון |
| `invoiceId` | כן ב-`ok` | string | `iCount.doc_num` | מספר חשבונית/קבלה ב-iCount |
| `subscriptionId` | כן ב-`ok` | string | `iCount.subscription_id` | מזהה הוראת הקבע ב-iCount |
| `clientId` | מומלץ | string | `iCount.client_id` | מזהה הלקוח ב-iCount; שימושי לצפייה ידנית |
| `signature` | כן | string (hex) | מחושבת ב-Make | HMAC-SHA256 על ה-string של הקצה־לקצה (ראו §3) |

> **שדות נוספים** (כגון `paidAt`, `amount`, `currency`) מותר לשלוח אך הם **לא מאומתים** ולא נשמרים. אם תרצי לשמור גם אותם — תעדכני אותי ואוסיף עמודות.

---

## 3. חישוב ה-`signature` (Make)

החתימה מחושבת על המחרוזת הבאה (פייפ-separator, **ללא** רווחים, **באותו סדר** תמיד):

```
${workspaceId}|${requestId}|${status}|${invoiceId}|${subscriptionId}
```

לדוגמה, עבור הבקשה לעיל:

```
60002|71a14c1b7d34ae89ef83f0e87b16111b|ok|12345|67890
```

**איך מחשבים ב-Make:**

1. לפני ה-HTTP module שולחת את ה-callback, להוסיף **Tools → Set variable** בשם `signaturePayload` עם הערך:
   ```
   {{14.workspaceId}}|{{14.requestId}}|ok|{{18.doc_num}}|{{18.subscription_id}}
   ```
   (להחליף את מספרי המודולים ב-Make לפי המסך).

2. להוסיף **Tools → Set variable** בשם `signature` עם הפונקציה הבנויה של Make:
   ```
   {{sha256(`${signaturePayload}`; `hex`; `MAKE_BILLING_SHARED_SECRET`)}}
   ```
   (Make תומך ב-HMAC עם 3 פרמטרים: text, encoding, key.)

3. ב-HTTP module, ב-Body → Raw → JSON, לכלול את `{{signature}}` כשדה `signature`.

> **חשוב:** ה-key חייב להיות **בדיוק** הערך של `MAKE_BILLING_SHARED_SECRET` (אותו אעביר לך בנפרד דרך ערוץ מאובטח). שינוי ב-key = פסילת כל ה-callbacks. גם אם תהיה אפילו שגיאת תווים אחת ב-payload (סדר/רווח/case) — החתימה תשתנה והבקשה תידחה.

---

## 4. תגובות מהשרת

| HTTP | Body | משמעות |
|---|---|---|
| `200` | `{"ok":true,"workspaceId":60002,"subscriptionStatus":"active","subscriptionEndsAt":"2027-05-09T..."}` | התשלום נרשם, ה-workspace הופעל |
| `200` | `{"ok":true,"marked":"past_due"}` | קיבלנו `status:"fail"`, סימנו את ה-workspace כ-past_due |
| `400` | `{"ok":false,"error":"missing_workspace_or_request"}` | חסרים שדות חובה |
| `403` | `{"ok":false,"error":"missing_signature"}` | אין שדה `signature` ב-body |
| `403` | `{"ok":false,"error":"bad_signature"}` | החתימה לא תאמה — בדקי key/payload |
| `404` | `{"ok":false,"error":"workspace_not_found"}` | ה-`workspaceId` לא קיים אצלי |
| `500` | `{"ok":false,"error":"internal"}` | שגיאת שרת — נסי שוב, אם חוזר תני לי לבדוק logs |

ב-Make אפשר להוסיף Router עם error-handler: אם התשובה היא `403` או `500` — לשלוח לעצמך התראה (Slack/Email) שיש בעיה בחתימה/בשרת.

---

## 5. ה-flow המלא

```
[1] משתמש לוחץ "בחר Pro" ב-/pricing
        ↓
[2] Spark Quality → POST ל-Make webhook עם requestId + signature
        ↓
[3] Make יוצר חשבונית/הוראת קבע ב-iCount, מחזיר HTML עם meta-refresh ל-sale_url
        ↓
[4] Spark Quality מחלץ את ה-URL, פותח tab חדש למשתמש לעמוד הסליקה של iCount
        ↓
[5] משתמש מסיים תשלום ב-iCount
        ↓
[6] iCount → webhook ל-Make (success_url)
        ↓
[7] Make מחשב signature ועושה POST ל-/api/billing/activate שלי   ← ⚡ אנחנו כאן
        ↓
[8] Spark Quality: מסמן workspace כ-active + payment_attempts כ-succeeded
        ↓
[9] שולח מייל "המנוי שלכם פעיל" לכל חברי הסוכנות
```

---

## 6. נטישת עגלה — Watchdog 15 דקות

שמורה אצלי טבלת `payment_attempts` שמתעדת **כל** ניסיון תשלום: `requestId`, `workspaceId`, פרטי הלקוח snapshot, `createdAt`. הסטטוס מתחיל כ-`pending`.

**מה שאמור לקרות:**
1. **תוך 15 דקות** Make מחזיר `/api/billing/activate` עם `status:"ok"` → סטטוס נהיה `succeeded`.
2. אם Make מחזיר `status:"fail"` → סטטוס נהיה `failed`.

**מה שקורה אם אף callback לא מגיע:**

יש watchdog שרץ כל דקה ב-`POST /api/scheduled/abandonedCarts`. הוא מחפש שורות `pending` שעבר עליהן יותר מ-15 דקות, ולכל אחת:
- שולח מייל RTL מותג ל-**anat@spark-ai.co.il** עם פרטי הלקוח (שם, מייל, טלפון, ח.פ, סכום, תוכנית, requestId).
- מסמן את השורה כ-`abandoned` כדי לא לשלוח שוב.
- אם יש טלפון — מצרף כפתור "פתיחת וואטסאפ" ישיר ללקוח.

ה-watchdog רושם cron עצמאי דרך מערכת ה-Heartbeat של Manus (לא דרך Make). אחרי הדיפלוי הבא אצור את ה-cron בפקודה אחת.

---

## 7. בדיקה מקצה לקצה

לפני go-live:

1. ב-Make, הריצי את ה-scenario במצב Run once כך שה-callback יישלח עם `requestId` שאת ממציאה.
2. אם החתימה נכונה תקבלי `200`. אם לא — תקבלי `403 bad_signature`. **אל תזרקי בקשה כזו ל-Production לפני שאומתה!**
3. בדמו אצלי תראי שה-workspace באמת עבר ל-`active` ושנשלח מייל אקטיבציה.
4. כדי לבדוק את ה-watchdog, פשוט שלחי בקשת checkout ואל תחזירי callback. תוך ~15 דקות תקבלי מייל "נטישת עגלה".

---

## 8. שאלות פתוחות ל-Anat

- **שדה `phone` של הלקוח** — כרגע אני שולפת מ-`workspaces.contactPhone`. אם המשתמש ממלא טלפון אישי בעמוד הסליקה של iCount, ושיהיה שונה — תרצי שנעדיף אותו? (אם כן, אני אוסיף שדה `customerPhone` ל-callback ואשמור אותו ב-`payment_attempts`.)
- **תזכורת ללקוח** — היום מייל הנטישה מגיע רק לאנת. תרצי גם **תזכורת ללקוח עצמו** ("שכחת להשלים את התשלום, הנה לינק חדש")? אם כן, תוך כמה דקות לשלוח, ומה הטון.
- **ערוצי alert** — מייל מספיק או שתרצי גם Slack/SMS על נטישות (Push notification דרך iCount Make).
