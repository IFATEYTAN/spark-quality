import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

const customerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(130).optional(),
  city: z.string().trim().max(80).optional(),
  product: z.string().trim().max(200).optional(),
  insurer: z.string().trim().max(120).optional(),
  accumulation: z.number().min(0).max(1_000_000_000).optional(),
  status: z.string().trim().max(80).optional(),
  flagStatus: z
    .enum([
      "vip",
      "liquid_fund",
      "tikun_190",
      "high_fees",
      "risk_ending",
      "coverage_gaps",
      "regular",
    ])
    .optional(),
});

const draftInputSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  customer: customerSchema,
});

type DraftInput = z.infer<typeof draftInputSchema>;
type CustomerInput = z.infer<typeof customerSchema>;

const SYSTEM_PROMPT = `אתה כותב הודעות מוכן-לשליחה בעברית עבור סוכנת ביטוח ותיקה בשם יפעת איתן (SPARK AI).
המטרה: לנסח הודעה אישית, חמה, מקצועית ולא דחוסה ללקוח/ה ספציפי/ת, על בסיס סטטוס התיק שלו/ה.
הקפד:
- עברית תקנית, RTL. בלי אנגלית מיותרת.
- חתימה: "יפעת איתן | SPARK AI" (במייל בלבד; ב-WhatsApp בלי חתימה).
- במייל: subject קצר וממוקד (≤ 70 תווים) ועוד גוף הודעה. ב-WhatsApp: רק body, קצר (3–5 שורות), עם אימוג'י אחד לכל היותר.
- אל תמציא מספרים שלא ניתנו. אם נתון חסר — דלג עליו בעדינות.
- סיים בקריאה לפעולה ברורה (קביעת שיחה / פגישה / אישור).
- החזר JSON בלבד לפי הסכמה. בלי טקסט נוסף, בלי הסברים.`;

function categoryHint(c: CustomerInput): string {
  // Prefer the granular `flagStatus` (DB-side); fall back to the demo `status` string.
  const f = c.flagStatus;
  if (f === "risk_ending") return "פוליסת ריסק/מסתיימת — דחוף לתאם חידוש לפני סיום הכיסוי.";
  if (f === "coverage_gaps") return "אין מוצר פנסיוני — לפתוח שיחה על בניית חיסכון פנסיוני מותאם.";
  if (f === "tikun_190") return "מועמד/ת לתיקון 190 (גיל 60+ עם צבירה גבוהה) — להציע סימולציית משיכה פטורה ממס.";
  if (f === "liquid_fund") return "קרן השתלמות נזילה — להציע מעבר ל-IRA או פוליסת חיסכון.";
  if (f === "high_fees") return "דמי ניהול גבוהים — שיחת שימור והפחתת דמי ניהול.";
  if (f === "vip") return "לקוח/ה VIP — פגישה לניהול עושר ומוצרי פרמיום.";

  const s = c.status || "";
  if (s.includes("ריסק")) return "פוליסת ריסק/מסתיימת — דחוף לתאם חידוש.";
  if (s.includes("ללא פנסיה")) return "אין מוצר פנסיוני — שיחה על בניית חיסכון פנסיוני.";
  if (s.includes("תום הנחה")) return "הנחת פרמיה מסתיימת — לבחון חידוש או מעבר.";
  if (s.includes("השתלמות")) return "קרן השתלמות נזילה — להציע IRA / פוליסת חיסכון.";
  if (s.includes("190")) return "תיקון 190 — סימולציית משיכה פטורה ממס.";
  if (s.includes("דמי ניהול")) return "דמי ניהול גבוהים — שיחת שימור.";
  if (s.includes("VIP")) return "VIP — ניהול עושר.";
  return "סקירה תקופתית של התיק.";
}

function userPrompt(input: DraftInput): string {
  const c = input.customer;
  const lines: string[] = [
    `ערוץ: ${input.channel === "email" ? "אימייל" : "WhatsApp"}`,
    `שם הלקוח/ה: ${c.name}`,
  ];
  if (c.age != null) lines.push(`גיל: ${c.age}`);
  if (c.city) lines.push(`עיר: ${c.city}`);
  if (c.product) lines.push(`מוצר: ${c.product}`);
  if (c.insurer) lines.push(`חברה מבטחת: ${c.insurer}`);
  if (c.accumulation != null)
    lines.push(`צבירה: ${c.accumulation.toLocaleString("he-IL")} ₪`);
  if (c.status) lines.push(`סטטוס תיק: ${c.status}`);
  lines.push(`כיוון פעולה מומלץ: ${categoryHint(c)}`);
  lines.push(
    input.channel === "email"
      ? `נסח subject + body. החזר JSON בלבד.`
      : `נסח body בלבד (subject ריק). החזר JSON בלבד.`,
  );
  return lines.join("\n");
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    subject: {
      type: "string",
      description: "נושא המייל (חובה לאימייל; ריק ב-WhatsApp).",
    },
    body: {
      type: "string",
      description: "גוף ההודעה.",
    },
  },
  required: ["subject", "body"],
  additionalProperties: false,
} as const;

function fallbackTemplate(
  input: DraftInput,
): { subject: string; body: string } {
  const c = input.customer;
  const firstName = c.name.split(" ")[0];
  const acc = c.accumulation
    ? `${c.accumulation.toLocaleString("he-IL")} ₪`
    : "";
  const product = c.product || "התיק שלך";
  const insurer = c.insurer ? ` ב${c.insurer}` : "";
  const isEmail = input.channel === "email";

  const hint = categoryHint(c);
  if (isEmail) {
    return {
      subject: `${firstName}, ${hint.split("—")[0].trim()}`,
      body: [
        `שלום ${firstName},`,
        ``,
        `כאן יפעת מ-SPARK AI. עברתי על התיק שלך${product ? ` (${product}${insurer})` : ""}${
          acc ? ` עם צבירה של ${acc}` : ""
        }.`,
        ``,
        hint,
        ``,
        `אשמח לתאם איתך שיחה קצרה השבוע — מתי נוח לך?`,
        ``,
        `בברכה,`,
        `יפעת איתן | SPARK AI`,
      ].join("\n"),
    };
  }
  return {
    subject: "",
    body: [
      `שלום ${firstName} 👋`,
      ``,
      `כאן יפעת מ-SPARK AI. ${hint}`,
      ``,
      `מתי נוח לך לשיחה קצרה?`,
    ].join("\n"),
  };
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
}

function parseLLMJson(raw: string): { subject?: string; body?: string } | null {
  try {
    const trimmed = raw.trim();
    // Strip ```json ... ``` fences if the model added them despite json_schema.
    const stripped = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

export const composerRouter = router({
  /**
   * Draft a personalized outreach message (email subject+body or WhatsApp body)
   * for a customer based on their flagStatus / status. Calls the Forge-proxied
   * LLM with a JSON schema; falls back to a deterministic Hebrew template if
   * the API key is missing or the LLM call fails, so the demo never breaks.
   */
  draft: protectedProcedure
    .input(draftInputSchema)
    .mutation(async ({ input }) => {
      const fallback = fallbackTemplate(input);

      if (!ENV.forgeApiKey) {
        return { ...fallback, source: "fallback" as const };
      }

      try {
        const result = await invokeLLM({
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt(input) },
          ],
          responseFormat: {
            type: "json_schema",
            json_schema: {
              name: "outreach_message",
              schema: RESPONSE_SCHEMA as unknown as Record<string, unknown>,
              strict: true,
            },
          },
        });

        const raw = extractText(result.choices?.[0]?.message?.content);
        const parsed = parseLLMJson(raw);
        if (!parsed || typeof parsed.body !== "string" || parsed.body.length < 10) {
          return { ...fallback, source: "fallback" as const };
        }

        const subject =
          input.channel === "email"
            ? typeof parsed.subject === "string" && parsed.subject.trim().length > 0
              ? parsed.subject.trim()
              : fallback.subject
            : "";

        return {
          subject,
          body: parsed.body,
          source: "llm" as const,
        };
      } catch (err) {
        console.warn("[composer.draft] LLM call failed, using fallback:", err);
        return { ...fallback, source: "fallback" as const };
      }
    }),
});

// Exported for unit tests.
export const __composerInternals = {
  fallbackTemplate,
  userPrompt,
  parseLLMJson,
  categoryHint,
};

