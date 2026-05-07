# SPARK Quality × Make.com — אינטגרציית תשלום

מסמך זה מתאר את חוזה ה-JSON בין מערכת SPARK Quality לבין תרחיש ה-Make שלך,
כך שתהיה לך שליטה מלאה במי שילם, כמה, ומתי הוראת הקבע מופעלת.

## ארכיטקטורה כללית

```
[ Pricing / Onboarding CTA ]
        │  trpc billing.startCheckoutViaMake
        ▼
[ SPARK server ] ──HTTPS POST JSON──▶ [ Make webhook ]
                                         │
                                         │ Make scenario:
                                         │  1. בונה דף תשלום iCount
                                         │  2. שולח את הלינק במייל / WhatsApp
                                         │  3. מאזין ל-iCount עד אישור הסליקה
                                         ▼
[ Make ] ──HTTPS POST JSON──▶ [ SPARK /api/billing/activate ]
                                         │
                                         ▼
                              workspace.subscriptionStatus = active
                              + מייל אישור RTL ממותג ללקוח
```

## 1. Webhook יוצא — מ-SPARK ל-Make

* **URL:** `MAKE_PAYMENT_WEBHOOK_URL` (ברירת מחדל: `https://hook.eu1.make.com/35kisdafvvmvnm1dbezy2bg8wridh0hw`)
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`, `X-Spark-Signature: <hex hmac>`
* **גוף הבקשה (JSON):**

```json
{
  "requestId": "a1b2c3d4e5f6...",
  "workspaceId": 60002,
  "workspaceName": "ביטוח דניאל",
  "plan": "pro",
  "planLabel": "Pro",
  "billingPeriod": "yearly",
  "billingPeriodLabel": "שנתי",
  "amount": 2508,
  "currency": "ILS",
  "customer": {
    "name": "Anat Hemell Greenberg",
    "email": "anat@leandolini.com",
    "phone": "0547395570",
    "taxId": "037216298",
    "taxIdType": "company"
  },
  "returnUrl": "https://sparkquality-zqvpyevd.manus.space/billing/waiting?ws=60002&req=a1b2c3d4...",
  "activationUrl": "https://sparkquality-zqvpyevd.manus.space/api/billing/activate",
  "issuedAt": "2026-05-07T13:30:00.000Z",
  "signature": "9f8e7d...sha256-hex..."
}
```

### חישוב חתימה (יוצא)

מחושב על ידי SPARK ונשלח גם בגוף וגם בכותרת `X-Spark-Signature`. אין צורך
לאמת אותה ב-Make אלא אם ה-scenario חשוף לאינטרנט הציבורי. אבל ה-secret
שלנו ו-Make הוא **`MAKE_WEBHOOK_SECRET`** (משותף).

```
HMAC-SHA256(
  MAKE_WEBHOOK_SECRET,
  JSON.stringify({ requestId, workspaceId, workspaceName, plan, billingPeriod,
                   amount, currency, customer, returnUrl, activationUrl, issuedAt })
)
```

הסדר חשוב — נא להשתמש בשדות המפתחיים בדיוק לפי הסדר ב-`makeCheckout.ts`.
לרוב לא תזדקקו לאמת אותו ידנית ב-Make.

## 2. תרחיש Make מומלץ

1. **Webhook trigger** — קלוט את ה-JSON מ-SPARK.
2. **iCount: יצירת לקוח** (אם לא קיים) — שלח את `customer.name`, `customer.email`,
   `customer.phone`, `customer.taxId`, `customer.taxIdType` (`company` → סוג לקוח 1, `individual` → 2).
3. **iCount: הפקת דף תשלום (Hosted Payment Page)** — עם:
   - `sum = amount`
   - `currency = ILS`
   - `desc = "מנוי SPARK Quality · {{planLabel}} · {{billingPeriodLabel}}"`
   - `hp = 1` (הוראת קבע)
   - `cf1 = workspaceId`, `cf2 = requestId`
   - `notify_url` = יעד פנימי ב-Make שלך, לא ה-SPARK callback
4. **שלח לינק ללקוח** במייל (Resend / Gmail / שירות אחר) או ב-WhatsApp,
   עם הטקסט הבא ב-RTL:

   > שלום {{customer.name}}, להלן לינק להפעלת הוראת הקבע למנוי SPARK Quality
   > {{planLabel}} ({{billingPeriodLabel}}) בסך ₪{{amount}}: {{paymentLink}}

5. **Listener: iCount Webhook → Make** — קלוט אישור סליקה.
6. **בנה payload לאקטיבציה ב-SPARK:**

```json
{
  "workspaceId": 60002,
  "requestId": "a1b2c3d4e5f6...",
  "status": "ok",
  "plan": "pro",
  "billingPeriod": "yearly",
  "invoiceId": "INV-12345",
  "subscriptionId": "SUB-67890",
  "clientId": "CLI-555",
  "signature": "<computed>"
}
```

7. **חישוב חתימה (אקטיבציה):**

```
HMAC-SHA256(
  MAKE_WEBHOOK_SECRET,
  `${workspaceId}|${requestId}|${status}|${invoiceId}|${subscriptionId}`
)
```

   ב-Make אפשר להשתמש במודול **Tools → Set Variable** + פונקציית `sha256`,
   או במודול **HMAC** של Make (יש כבר תוסף sha256 hex). הפלט הוא הקסה-סטרינג
   באורך 64 תווים. הוסיפי אותו לשדה `signature` ב-JSON.

8. **HTTP POST** ל-`activationUrl` (השדה הוא חלק מה-payload המקורי שקיבלת,
   אבל אפשר גם הראשי `https://sparkquality-zqvpyevd.manus.space/api/billing/activate`):

   * Method: `POST`
   * Headers: `Content-Type: application/json`
   * Body: ה-JSON מסעיף 6.

9. **תגובה צפויה מ-SPARK:**

```json
{
  "ok": true,
  "workspaceId": 60002,
  "subscriptionStatus": "active",
  "subscriptionEndsAt": "2027-05-07T13:30:00.000Z"
}
```

מרגע זה ה-AccessGuard נפתח אוטומטית ללקוח, והוא מקבל מייל אישור ב-RTL.

## 3. ערכים סודיים (Secrets)

הוסיפי ב-Settings → Secrets של פרויקט Manus webdev:

| מפתח | מטרה | ברירת מחדל |
|------|------|------------|
| `MAKE_PAYMENT_WEBHOOK_URL` | כתובת ה-webhook ב-Make | הכתובת ששלחת |
| `MAKE_WEBHOOK_SECRET` | סוד משותף לחתימת JSON | `spark-quality-make-shared-secret` |

**מומלץ מאוד** להחליף את `MAKE_WEBHOOK_SECRET` למחרוזת אקראית באורך 32+
תווים מיד לפני העלייה לאוויר, ולשמור עותק זהה גם ב-Make כ-Variable.

## 4. סטטוס תשלום שלילי

אם הסליקה נכשלה, שלחי מ-Make POST עם:

```json
{
  "workspaceId": 60002,
  "requestId": "a1b2c3d4e5f6...",
  "status": "fail",
  "signature": "<HMAC-SHA256(... |fail|...)>"
}
```

המערכת תסמן את ה-workspace כ-`past_due`, יתחיל החל מאותו רגע grace של 3 ימים,
ובתום הזמן תישלח אוטומטית הודעת השעיה ב-RTL.

## 5. בדיקה

```
curl -X POST https://sparkquality-zqvpyevd.manus.space/api/billing/activate \
  -H 'Content-Type: application/json' \
  -d '{"workspaceId":60002,"requestId":"test-001","status":"ok","plan":"pro","billingPeriod":"yearly","invoiceId":"INV-TEST","subscriptionId":"SUB-TEST","signature":"..."}'
```

החתימה תיכשל אם לא תחושב נכון — זה מבטיח שלא ניתן להפעיל workspace ללא
תשלום אמיתי.

## 6. תזכורת חשובה

* `MAKE_PAYMENT_WEBHOOK_URL` נכון מיידית בהשקה אבל אפשר להחליפו ל-URL ייצור.
* כל החתימות הן HMAC-SHA256 hex, לא base64.
* כל ה-payload בעברית RTL מבחינת תוכן, אך מבנה ה-JSON לטיני בלבד.
* לעולם **לא** מפעילים workspace ללא חתימה תקינה — זה מנוף ההגנה היחיד שלנו
  מול spoof.
