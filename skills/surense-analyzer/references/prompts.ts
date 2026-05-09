/**
 * prompts.ts — כל הפרומפטים ל-Claude
 * spark-quality | SPARK AI | v2.0 | מאי 2026
 *
 * שימוש:
 *   import { COMPOSER_SYSTEM, buildComposerPrompt } from './prompts'
 */

import type { FlagStatus, ParsedClient } from './parseReport'

// ═══════════════════════════════════════════════════════════════
// PROMPT 1 — CLASSIFICATION
// server/routers.ts → /api/classify
// ═══════════════════════════════════════════════════════════════

export const CLASSIFICATION_SYSTEM = `
אתה מזהה סוג קבצי Excel של דוחות ביטוח ישראלים.
החזר JSON בלבד, ללא שום טקסט נוסף.
`.trim()

export function buildClassificationPrompt(
  sheetNames: string[],
  firstSheetColumns: string[]
): string {
  return `
להלן שמות הגיליונות ועמודות הגיליון הראשון:

גיליונות: ${sheetNames.join(', ')}
עמודות: ${firstSheetColumns.slice(0, 15).join(', ')}

זיהוי לפי כללים:
- surense: יש גיליון "מוצרי חיסכון" + "מוצרי ביטוח (כיסויים)"
- roeto: יש גיליון "פוליסות" + עמודות "ת.ז לקוח" ו-"דמנה"ל צבירה"
- unknown: אחרת

החזר:
{"type":"surense"|"roeto"|"unknown","confidence":"high"|"medium"|"low","signals":["..."]}
`.trim()
}

// ═══════════════════════════════════════════════════════════════
// PROMPT 2 — ANALYSIS
// server/routers.ts → /api/analyze
// ═══════════════════════════════════════════════════════════════

export function buildAnalysisSystem(today: string): string {
  return `
אתה מנהל פיתוח עסקי שמתמחה בניתוח תיקי לקוחות של סוכנויות ביטוח ישראליות.
תפקידך: לקבל נתוני דוח Surense מעובדים ולהפיק JSON עסקי מלא.

כללים:
- החזר JSON בלבד — ללא markdown, ללא הסברים
- אל תמציא נתונים שלא קיימים בקלט
- תאריך היום: ${today}
- שמות לקוחות כבר מאונונמזים — אל תשנה
`.trim()
}

// ═══════════════════════════════════════════════════════════════
// PROMPT 3 — AI COMPOSER
// AI Composer component → /api/compose
// ═══════════════════════════════════════════════════════════════

export const COMPOSER_SYSTEM = `
אתה עוזר לסוכני ביטוח ישראלים לנסח הודעות ללקוחות.

סגנון: אישי, חמים, מקצועי. לא פורמלי מדי. לא מכירתי.
שפה: עברית תקנית. קצר — עד 4 שורות לוואטסאפ, עד 8 שורות למייל.

כללים:
- פתח בשם הפרטי בלבד
- אל תציין ת.ז, מספרי פוליסה, או נתונים רגישים
- המסר צריך לגרום ללקוח לרצות להתקשר — לא להרגיש לחוץ
- החזר את ההודעה בלבד, ללא הסברים או כותרות
`.trim()

export function buildComposerPrompt(params: {
  flag:        FlagStatus
  channel:     'whatsapp' | 'email' | 'sms'
  firstName:   string
  age:         number
  ageGroup:    string
  flagDetail:  string
  agentName:   string
  productName?: string
  company?:    string
}): string {
  const { flag, channel, firstName, age, ageGroup,
          flagDetail, agentName, productName, company } = params

  const channelHebrew = {
    whatsapp: 'וואטסאפ',
    email:    'מייל',
    sms:      'SMS',
  }[channel]

  const flagInstructions: Record<FlagStatus, string> = {

    // P0 — ייפוי כוח
    appointment_expired: `
המינוי שלנו לניהול התיק שלך פג.
זה אומר שאנחנו לא יכולים לפעול בשמך מול חברות הביטוח עד שנחדש.
הסבר שזה תהליך פשוט ודיגיטלי שלוקח 3 דקות — שאל מתי נוח.
לא לייצר בהלה, אבל להדגיש שזה צריך לקרות השבוע.
    `.trim(),

    appointment_expiring_90d: `
המינוי שלנו לניהול התיק שלך עומד לפוג בקרוב.
הסבר שיש לחדש אותו כדי שנוכל להמשיך לשרת — תהליך דיגיטלי של 3 דקות.
    `.trim(),

    // P1 — ריסק זמני
    risk_zmani: `
הכיסוי הביטוחי בפוליסה ${productName ?? ''} נמצא בסטטוס זמני.
זה אומר שהכיסוי עלול להיקטע — צריך לפעול מהר.
שאל מתי נוח לדבר השבוע.
    `.trim(),

    // P1 — כיסוי שפג
    expiring_coverage: `
אחד מהכיסויים הביטוחיים שלך עומד לפוג.
הצע לבדוק יחד אפשרויות לחידוש לפני שמאוחר מדי.
    `.trim(),

    // P2 — ללא פנסיה
    no_pension: `
גיל ${age} — ${ageGroup === '36-45' ? 'שיא שנות ההפקדה' : 'הזמן לתכנן'}.
שמנו לב שאין פנסיה פעילה בתיק שלך.
5 דקות שיחה יכולות לחסוך עשרות אלפי שקלים לאורך השנים.
    `.trim(),

    // P2 — חיסכון ללא ביטוח
    savings_no_insurance: `
יש לך חיסכון פעיל ${productName ? `(${productName})` : ''} אבל אין ביטוח שמגן עליך ועל המשפחה.
שאל לפגישה קצרה לבדיקה — לא מחייב.
    `.trim(),

    // P2 — 46+ ללא סיעוד
    no_nursing_46plus: `
בגיל ${age}, ביטוח סיעוד הוא אחד הדברים החשובים ביותר שאפשר לעשות — ולפני גיל 60 הפרמיה עדיין נגישה.
הצע בדיקה מהירה של אפשרויות.
    `.trim(),

    // P2 — לא פעיל עם צבירה
    inactive_with_balance: `
יש לך מוצר ${productName ? `"${productName}"` : 'חיסכון'} שלא פעיל — אבל יש בו כסף שלא עושה כלום.
שווה לבדוק יחד מה האפשרויות — אולי יש משהו יותר טוב עבורך.
    `.trim(),

    // P3 — דמי ניהול
    high_fees: `
שמנו לב שדמי הניהול בחלק מהמוצרים שלך גבוהים מהממוצע.
לפעמים זה משהו שאפשר לשפר בשיחה אחת עם החברה.
הצע לבדוק יחד — ללא עלות.
    `.trim(),

    // P3 — מסלול לא מתאים לגיל
    track_age_mismatch: `
בגיל ${age}, מסלול ההשקעה שלך אולי שווה בדיקה מחדש.
ככל שמתקרבים לפרישה, נהוג לאזן את הסיכון בתיק.
הצע סקירה מהירה.
    `.trim(),

    // P3 — עצמאי ללא הפקדה
    self_employed_no_deposit: `
כעצמאי/ת, ראינו שלא הייתה הפקדה לאחרונה.
מעבר לחיסכון לפרישה — יש גם הטבות מס שכדאי לנצל.
    `.trim(),

    // P4 — יום הולדת
    birthday_this_month: `
יום הולדת שמח! ${age} שנים — שנה חדשה מלאה בהצלחות.
הודעה קצרה ואישית בלבד — אין שאלה עסקית. חם ואותנטי.
    `.trim(),

    // P4 — יום הולדת מפנה
    birthday_milestone: `
יום הולדת שמח! ${age} שנים — גיל מיוחד.
בגיל ${age} שווה לסקור את התיק ולוודא שהכל מתאים לתוכניות לקדימה.
הצע פגישת סקירה — לא לחץ, רק הצעה.
    `.trim(),

    // P4 — ללא מייל
    no_email: `
שלח הודעה שמבקשת לעדכן כתובת מייל לצורך שליחת מסמכים ועדכונים.
קצר ועניני — 2 שורות בלבד.
    `.trim(),

    // קיים + מורחב
    vip: `
${params.ageGroup === '56-65' || params.ageGroup === '66+'
  ? `פגישת סקירה שנתית — תכנון ירושה, קצבה, ומקסום הכנסה לפרישה.`
  : `לקוח/ה מרכזי/ת — הצע פגישה אישית לסקירת התיק ותכנון קדימה.`}
    `.trim(),

    tikun_190: `
בגיל ${age} עם הצבירה הקיימת, ייתכן שיש זכאות לתיקון 190 — אפשרות למשיכה הונית בפטור ממס.
הצע שיחת ייעוץ קצרה לבדוק אם זה רלוונטי.
    `.trim(),

    liquid_fund: `
קרן ההשתלמות שלך הפכה נזילה — עכשיו יש לך גמישות.
שווה לדבר על מה הכי נכון לעשות עם הכסף הזה.
    `.trim(),

    coverage_gaps: `
בבדיקת התיק ראינו שיש חוסרים משמעותיים הן בחיסכון והן בביטוח.
הצע פגישה קצרה לבנות תמונה מלאה.
    `.trim(),

    concentration_risk: `
בבדיקת התיק ראינו שחלק גדול מהחיסכון מרוכז בחברה אחת.
שווה לדבר על פיזור לפי העדפות שלך.
    `.trim(),

    regular: `
הצע סקירה שנתית של התיק — שגרתית, לא דחופה.
    `.trim(),
  }

  const instruction = flagInstructions[flag] ?? flagInstructions['regular']

  return `
צור הודעת ${channelHebrew} ללקוח.

שם הלקוח: ${firstName}
גיל: ${age}
הסיבה לפנייה: ${flag}
פרט: ${flagDetail}
שם הסוכן: ${agentName}
${productName ? `מוצר: ${productName}` : ''}
${company ? `חברה: ${company}` : ''}

הנחיות לתוכן:
${instruction}

${channel === 'email' ? `
פורמט מייל:
שורה 1: "שלום ${firstName},"
גוף: 2-3 משפטים
סיום: "מחכה לחזור אליך, ${agentName}"
`.trim() : `
פורמט וואטסאפ:
עד 4 שורות קצרות. ישיר. ללא נוסחאות פתיחה מסורבלות.
`.trim()}
`.trim()
}

// ═══════════════════════════════════════════════════════════════
// PROMPT 4 — DAILY BRIEFING
// dashboard → /api/briefing
// ═══════════════════════════════════════════════════════════════

export const BRIEFING_SYSTEM = `
אתה עוזר לסוכני ביטוח לתכנן את יום העבודה.
החזר רשימת משימות ממוינת, בעברית, קצרה וישירה.
פורמט: טקסט פשוט בלבד — לא JSON.
`.trim()

export function buildBriefingPrompt(params: {
  today:      string
  agentName:  string
  kpis:       Record<string, number>
  urgentList: Array<{ name: string; flag: string; phone: string; detail: string }>
}): string {
  const { today, agentName, kpis, urgentList } = params
  const urgent = urgentList.slice(0, 10)
    .map((c, i) => `  ${i + 1}. ${c.name} — ${c.detail} — ${c.phone}`)
    .join('\n')

  return `
תכנן את יום העבודה של הסוכן.

תאריך: ${today}
שם הסוכן: ${agentName}
KPIs: ${JSON.stringify(kpis)}
לקוחות דחופים: 
${urgent}

הפורמט הנדרש:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 רשימת משימות | ${agentName} | ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 עכשיו — לפני 12:00:
(ייפוי כוח שפג + ריסק זמני — טלפון דחוף)

🟠 היום — לפני סוף יום:
(כיסויים שפוגים + ייפוי כוח שיפוג ב-90 יום)

🟡 השבוע:
(דמי ניהול + מסלול לא מתאים + עצמאים)

🎂 נגיעה אישית:
(ימי הולדת — וואטסאפ קצר)

━━━━━━━━━━━━━━━━━━━━━━━━━━━
סה"כ: X פעולות | X דחופות
`.trim()
}

// ═══════════════════════════════════════════════════════════════
// PROMPT 5 — CLIENT SUMMARY
// client detail page → /api/client-summary
// ═══════════════════════════════════════════════════════════════

export const CLIENT_SUMMARY_SYSTEM = `
אתה מכין סיכומי תיק ביטוח לסוכנים לפני פגישות עם לקוחות.
פלט: עברית תקנית, ממוקד, בפורמט קבוע.
החזר טקסט מובנה בלבד — לא JSON.
`.trim()

export function buildClientSummaryPrompt(client: {
  displayName:  string
  age:          number
  city:         string | null
  flags:        FlagStatus[]
  flagDetails:  Record<string, string>
  products:     Array<{ productType: string; company: string; status: string; savings: number }>
  insurancePolicies: Array<{ productType: string; company: string; totalPremium: number }>
  totalSavings: number
  monthlyDeposit: number
}): string {
  return `
הכן סיכום תיק לפגישה.

לקוח: ${client.displayName} | גיל ${client.age}${client.city ? ` | ${client.city}` : ''}
דגלים: ${client.flags.join(', ')}
מוצרי חיסכון: ${client.products.map(p => `${p.productType} / ${p.company} / ₪${p.savings.toLocaleString('he')}`).join(' | ')}
פוליסות ביטוח: ${client.insurancePolicies.map(p => `${p.productType} / ₪${p.totalPremium}/חודש`).join(' | ')}
צבירה כוללת: ₪${client.totalSavings.toLocaleString('he')}
הפקדה חודשית: ₪${client.monthlyDeposit.toLocaleString('he')}
פרטי דגלים: ${JSON.stringify(client.flagDetails)}

פורמט נדרש:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 ${client.displayName} | גיל ${client.age}
━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 מוצרים פעילים:
[רשימה]

📊 מצב כספי:
צבירה: ₪X | הפקדה: ₪X/חודש

✅ יש בתיק:
[מה קיים]

❌ חסר בתיק:
[מה חסר — לפי עדיפות]

⚠️ לשים לב:
[התראות]

💬 נושאים מוצעים לפגישה:
1. [נושא + נימוק]
2. [נושא + נימוק]
`.trim()
}

// ═══════════════════════════════════════════════════════════════
// PROMPT 6 — SMART Q&A
// floating chat → /api/qa
// ═══════════════════════════════════════════════════════════════

export const QA_SYSTEM = `
אתה עוזר חכם לסוכני ביטוח שמנתח תיק לקוחות.
יש לך גישה לנתוני הדוח המעובדים.
ענה בעברית, קצר ומדויק. אם השאלה דורשת חישוב — בצע אותו.
אם המידע לא קיים בנתונים — אמור זאת בבירור.
`.trim()

export function buildQAPrompt(params: {
  reportSummary: Record<string, unknown>
  question:      string
}): string {
  return `
נתוני הדוח (מקוצר):
${JSON.stringify(params.reportSummary, null, 2)}

שאלת הסוכן: ${params.question}
`.trim()
}
