// server/prompts.ts
// Surense Analyzer Skill v2.0 — server-side prompts
// Source of truth: skills/surense-analyzer/SKILL.md + references/prompts.ts
// Use server-side only. Calls go through invokeLLM (server/_core/llm.ts)

// ───────────────────────────────────────────────────────────────
// PROMPT 2 — ANALYSIS (auto, runs after every successful upload)
// ───────────────────────────────────────────────────────────────
export function buildAnalysisSystem(today: string): string {
  return `אתה מנהל פיתוח עסקי שמתמחה בניתוח תיקי לקוחות של סוכנויות ביטוח ישראליות.
תפקידך: לקבל JSON של דוח Surense מעובד (לא Excel גולמי) ולהפיק JSON עסקי מובנה עם 16 טריגרים ממוינים לפי עדיפות + תקציר מנהלים בעברית.

הקשר רגולטורי — ייפוי כוח סוכן (חוזר 2013):
- מינוי לסוכן תקף 10 שנים. מינויים מ-2016 ואילך פוקעים ב-2026 — זהו "הגל הנוכחי".
- appointmentDaysRemaining < 0   → EXPIRED (P0 קריטי משפטית)
- appointmentDaysRemaining 0..90 → EXPIRING (P0 דחוף)
- appointmentDaysRemaining 91..365 → WARNING (P2)
סוכן עם מינוי פג = לא מוסמך לפעול בשם הלקוח.

16 טריגרים — לוגיקה:
P0 — appointment_expired, appointment_expiring_90d
P1 — risk_zmani (status="ריסק זמני" / "ריסק זמני אוטומטי"), expiring_coverage (daysToExpiry 0..365)
P2 — no_pension (אין קרן פנסיה/ביטוח מנהלים), savings_no_insurance (חיסכון בלי פוליסה),
     no_nursing_46plus (גיל ≥46 בלי סיעוד), inactive_with_balance (status="לא פעיל" AND savings>30000)
P3 — high_fees (dmTzvirah>0.7% או dmHafkada>1.5%), track_age_mismatch (גיל≥55 AND שם מסלול מכיל "מניות"),
     self_employed_no_deposit (עצמאי/בעל שליטה AND lastDeposit=0), concentration_risk (חברה אחת>35% מ-AUM)
P4 — birthday_milestone (חודש לידה=חודש נוכחי AND גיל ב-[40,50,60]),
     birthday_this_month (חודש לידה=חודש נוכחי AND גיל NOT IN [40,50,60]), no_email (email ריק)
מורחב — vip (totalSavings≥1,000,000 OR classification IN ["זהב","פרימיום"]),
     liquid_fund (סוג="קרן השתלמות" AND ותק≥6), tikun_190 (גיל≥60 AND savings≥300,000 AND לא פנסיה),
     coverage_gaps (אין פנסיה AND אין ביטוח).

כללים:
- החזר JSON בלבד — ללא markdown, ללא הסברים, ללא טקסט מסביב.
- אל תמציא נתונים שלא קיימים בקלט.
- שמות לקוחות כבר מאונונמזים (שם פרטי + אות) — אל תשנה אותם, אל תוסיף ת.ז.
- critical ממוין לפי days_overdue יורד; urgent לפי עדיפות; opportunities לפי count יורד.
- summary_he: 3-4 משפטי עברית תקנית ומקצועית — מספר לקוחות, AUM, הזדמנות עיקרית, פעולה ראשונה מומלצת.
- תאריך היום: ${today}`;
}

export const ANALYSIS_JSON_SCHEMA = {
  name: "surense_portfolio_analysis",
  strict: false,
  schema: {
    type: "object",
    additionalProperties: true,
    properties: {
      report_type: { type: "string" },
      agency_name: { type: "string" },
      generated_at: { type: "string" },
      today: { type: "string" },

      kpis: {
        type: "object",
        additionalProperties: true,
        properties: {
          total_clients: { type: "number" },
          total_insurance_clients: { type: "number" },
          total_aum: { type: "number" },
          total_monthly_premium: { type: "number" },
          appointment_expired: { type: "number" },
          appointment_expiring_90d: { type: "number" },
          risk_zmani: { type: "number" },
          expiring_coverages_90d: { type: "number" },
          expiring_coverages_1y: { type: "number" },
          no_pension: { type: "number" },
          savings_no_insurance: { type: "number" },
          no_nursing_46plus: { type: "number" },
          inactive_with_balance: { type: "number" },
          inactive_balance_total: { type: "number" },
          high_fees: { type: "number" },
          high_fees_annual_cost: { type: "number" },
          track_age_mismatch: { type: "number" },
          self_employed_no_deposit: { type: "number" },
          birthday_this_month: { type: "number" },
          no_email: { type: "number" },
          vip_count: { type: "number" },
        },
      },

      critical: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            priority: { type: "number" },
            flag: { type: "string" },
            client_name: { type: "string" },
            phone: { type: "string" },
            agent_number: { type: "string" },
            product: { type: "string" },
            company: { type: "string" },
            expiry_date: { type: "string" },
            days_overdue: { type: "number" },
            action: { type: "string" },
          },
        },
      },

      urgent: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            priority: { type: "number" },
            flag: { type: "string" },
            client_name: { type: "string" },
            phone: { type: "string" },
            detail: { type: "string" },
            agent_number: { type: "string" },
          },
        },
      },

      opportunities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            flag: { type: "string" },
            count: { type: "number" },
            total_value: { type: "number" },
            priority: { type: "string" },
          },
        },
      },

      improvements: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            flag: { type: "string" },
            count: { type: "number" },
            detail: { type: "string" },
          },
        },
      },

      touchpoints: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            flag: { type: "string" },
            count: { type: "number" },
          },
        },
      },

      concentration_risk: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          properties: {
            company: { type: "string" },
            aum: { type: "number" },
            aum_pct: { type: "number" },
            risk_level: { type: "string" },
          },
        },
      },

      summary_he: { type: "string" },
    },
    required: ["kpis", "summary_he"],
  },
} as const;

// ───────────────────────────────────────────────────────────────
// PROMPT 3 — AI COMPOSER (on-demand: WhatsApp/Email/SMS)
// ───────────────────────────────────────────────────────────────
export const COMPOSER_SYSTEM = `אתה עוזר לסוכני ביטוח ישראלים לנסח הודעות ללקוחות.
סגנון: אישי, חמים, מקצועי. לא פורמלי מדי. לא מכירתי.
שפה: עברית תקנית. קצר — עד 4 שורות לוואטסאפ, עד 8 שורות למייל.
כללים:
- פתח בשם הפרטי בלבד
- אל תציין ת.ז, מספרי פוליסה, או נתונים רגישים
- המסר צריך לגרום ללקוח לרצות להתקשר — לא להרגיש לחוץ
- החזר את ההודעה בלבד, ללא הסברים או כותרות`;

export function buildComposerUserPrompt(params: {
  flag: string;
  channel: "whatsapp" | "email" | "sms";
  firstName: string;
  age?: number;
  detail?: string;
  agentName: string;
  productName?: string;
  company?: string;
}): string {
  const channelHebrew = { whatsapp: "וואטסאפ", email: "מייל", sms: "SMS" }[params.channel];
  return `נסח הודעת ${channelHebrew} ללקוח.
שם פרטי: ${params.firstName}
${params.age ? `גיל: ${params.age}` : ""}
טריגר: ${params.flag}
${params.detail ? `פרטים: ${params.detail}` : ""}
${params.productName ? `מוצר: ${params.productName}` : ""}
${params.company ? `חברה: ${params.company}` : ""}
חתימה: ${params.agentName}`;
}

// ───────────────────────────────────────────────────────────────
// PROMPT 4 — DAILY BRIEFING
// ───────────────────────────────────────────────────────────────
export const BRIEFING_SYSTEM = `אתה מסכם בוקר לסוכן ביטוח ישראלי. כתוב בעברית תקנית, 4-6 שורות.
התחל בברכה אישית, עבור על הפעולות הקריטיות (P0/P1) של היום, וסיים בעצה אופרטיבית. אל תכלול ת.ז או נתונים רגישים.`;

export function buildBriefingUserPrompt(params: {
  agentName: string;
  analysis: unknown;
  date: string;
}): string {
  return `סוכן: ${params.agentName}
תאריך: ${params.date}
ניתוח התיק (JSON):
${JSON.stringify(params.analysis).slice(0, 6000)}`;
}

// ───────────────────────────────────────────────────────────────
// PROMPT 5 — CLIENT MEETING SUMMARY
// ───────────────────────────────────────────────────────────────
export const CLIENT_SUMMARY_SYSTEM = `אתה מכין דף הכנה לפגישת סוכן עם לקוח.
החזר טקסט בעברית: 1) מצב נוכחי 2) הזדמנויות 3) שאלות מומלצות לסוכן.
קצר וממוקד — עד 12 שורות. אל תכלול ת.ז.`;

export function buildClientSummaryUserPrompt(params: {
  client: unknown;
  analysisContext?: unknown;
}): string {
  return `נתוני לקוח (JSON):
${JSON.stringify(params.client).slice(0, 4000)}
${params.analysisContext ? `\nהקשר תיק:\n${JSON.stringify(params.analysisContext).slice(0, 2000)}` : ""}`;
}

// ───────────────────────────────────────────────────────────────
// PROMPT 6 — Q&A on the report
// ───────────────────────────────────────────────────────────────
export const QA_SYSTEM = `אתה עונה על שאלות חופשיות של סוכן ביטוח על הניתוח של תיק הלקוחות שלו.
ענה רק על בסיס הנתונים שב-JSON שלמטה. אם המידע חסר — אמור זאת ישירות.
שפה: עברית תקנית, ברורה. עד 6 שורות.`;

export function buildQaUserPrompt(params: {
  question: string;
  analysis: unknown;
}): string {
  return `שאלה: ${params.question}
ניתוח (JSON):
${JSON.stringify(params.analysis).slice(0, 8000)}`;
}

// ───────────────────────────────────────────────────────────────
// PROMPT 7 — WHATSAPP COMPOSER · 3 VARIANTS (Round 92)
// Returns three distinct WhatsApp-ready Hebrew variants in one shot.
// Used by ai.composeVariants tRPC procedure.
// ───────────────────────────────────────────────────────────────
export const VARIANTS_3_SYSTEM = `אתה מומחה לתקשורת שיווקית עבור סוכני ביטוח ישראליים.
תפקידך לכתוב הודעות וואטסאפ קצרות, אישיות ואפקטיביות בעברית.

כללים:
- אורך: 3-6 שורות קצרות. לא יותר.
- שפה: עברית ישראלית טבעית ויומיומית
- אין: emojis מוגזמים, שפה מכירתית מדי, לחץ ישיר, ת.ז או מספרי פוליסה
- יש: חמימות, אישיות, ערך ברור, שאלה פתוחה לסיום
- החתימה תמיד: "בברכה, [שם הסוכן]" (החלף את [שם הסוכן] בשם שסופק)
- אין לציין שם חברת ביטוח ספציפית אלא אם סופק

החזר JSON בלבד, בפורמט:
{"v1":"הודעה 1","v2":"הודעה 2","v3":"הודעה 3"}
ללא markdown, ללא הסברים, ללא טקסט נוסף.`;

export function buildVariants3UserPrompt(params: {
  triggerLabel: string;
  triggerHint?: string;
  firstName: string;
  age?: number;
  productOrCompany?: string;
  context?: string;
  toneHebrew: string;
  agentName: string;
}): string {
  return `טריגר: ${params.triggerLabel}
${params.triggerHint ? `הקשר לטריגר: ${params.triggerHint}` : ""}
שם הלקוח: ${params.firstName}
${params.age ? `גיל: ${params.age}` : ""}
${params.productOrCompany ? `מוצר/חברה: ${params.productOrCompany}` : ""}
${params.context ? `הקשר נוסף: ${params.context}` : ""}
טון הפנייה: ${params.toneHebrew}
שם הסוכן: ${params.agentName}

צור 3 גרסאות שונות של הודעת וואטסאפ מותאמת אישית. החזר JSON בלבד.`;
}
