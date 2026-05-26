// Round 129 — Enriches AI Assistant context with real client names.
//
// Problem: ai.qa used to send only the aggregated analysis JSON (counts only)
// to the LLM. When the agent asked "מי 3 הלקוחות עם כספים נזילים?", the
// model honestly answered "אין שמות בנתונים" because... there really were
// no names in the payload.
//
// Fix: when the question mentions a known trigger AND uses a "who/which"
// phrase, attach up to N real clients (name + key numbers) pulled from
// clientFlags JOIN clients, with strict workspace + role isolation enforced
// inside listClientsForTriggerV2.

import { listClientsForTriggerV2 } from "./db";

// ────────────────────────────────────────────────────────────────────
// Trigger keyword map — Hebrew aliases → canonical triggerKey used by
// computeWorkspaceFlags / clientFlags.
// All lookups are case-insensitive substring matches.
// ────────────────────────────────────────────────────────────────────
type TriggerKey =
  | "vipGoldPremium"
  | "noEmail"
  | "birthdayThisMonth"
  | "birthdayMilestone"
  | "noActivePension"
  | "savingsNoInsurance"
  | "riskTemporary"
  | "coverageEnding"
  | "aumFrozen"
  | "trackMismatch"
  | "concentrationRisk"
  | "selfEmployedNoDeposit"
  | "poaExpired"
  | "poaExpiring90d"
  | "highFees";

const TRIGGER_ALIASES: Array<{ key: TriggerKey; words: string[] }> = [
  { key: "vipGoldPremium", words: ["vip", "וי איי פי", "זהב", "פרימיום", "צבירה גבוהה", "מובחר"] },
  { key: "noEmail", words: ["ללא מייל", "בלי מייל", "אין מייל", "ללא אימייל", "בלי אימייל", "ללא דוא\"ל"] },
  { key: "birthdayThisMonth", words: ["יום הולדת", "יומולדת", "החודש"] },
  { key: "birthdayMilestone", words: ["יום הולדת עגול", "גיל עגול", "milestone"] },
  { key: "noActivePension", words: ["ללא פנסיה", "בלי פנסיה", "אין פנסיה", "פנסיה לא פעילה"] },
  { key: "savingsNoInsurance", words: ["חיסכון בלי ביטוח", "חיסכון ללא ביטוח", "חוסר ביטוח"] },
  { key: "riskTemporary", words: ["ריסק זמני", "ריסק זמן", "סיום ריסק", "ביטוח זמני"] },
  { key: "coverageEnding", words: ["סיום כיסוי", "כיסוי מסתיים", "כיסוי שעומד להסתיים"] },
  { key: "aumFrozen", words: ["aum קפוא", "צבירה קפואה", "כסף קפוא", "כספים קפואים", "כספים נזילים", "נזיל", "השתלמות נזילה"] },
  { key: "trackMismatch", words: ["אי התאמה במסלול", "מסלול לא מתאים", "track mismatch"] },
  { key: "concentrationRisk", words: ["סיכון ריכוזיות", "ריכוזיות", "פיזור חסר"] },
  { key: "selfEmployedNoDeposit", words: ["עצמאי בלי הפקדה", "עצמאי ללא הפקדה", "עצמאי שלא מפקיד"] },
  { key: "poaExpired", words: ["ייפוי כוח פג", "ייפוי כוח שפג", "poa פג"] },
  { key: "poaExpiring90d", words: ["ייפוי כוח", "poa"] },
  { key: "highFees", words: ["דמי ניהול גבוהים", "דמי ניהול", "high fees"] },
];

// Triggers explicitly excluded from being matched by very short generic words.
// "פנסיה" alone is too broad — we require "ללא פנסיה" or similar.
// This is enforced by the alias lists above (no single-word aliases).

const WHO_PHRASES: string[] = [
  "מי ",
  "מיהם",
  "מי הם",
  "אילו לקוחות",
  "איזה לקוחות",
  "אילו",
  "תן לי רשימה",
  "תני לי רשימה",
  "הראה לי",
  "הראי לי",
  "תציג לי",
  "מי ה ",
  "מי הלקוח",
  "תן לי שמות",
  "תני לי שמות",
  "שמות של",
  "list",
  "show me",
  "who is",
  "who are",
  "which clients",
];

export function detectTriggersInQuestion(question: string): TriggerKey[] {
  const q = question.toLowerCase();
  const hits: TriggerKey[] = [];
  for (const { key, words } of TRIGGER_ALIASES) {
    if (words.some(w => q.includes(w.toLowerCase()))) {
      if (!hits.includes(key)) hits.push(key);
    }
  }
  return hits;
}

export function isWhoQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return WHO_PHRASES.some(p => q.includes(p));
}

// Shape sent to the LLM — names + a few stable numeric fields per client.
export type RelevantClient = {
  name: string;
  totalBalance: number | null;
  age: number | null;
  email: string | null;
  phone: string | null;
};

export type RelevantTriggerBlock = {
  triggerKey: TriggerKey;
  totalCount: number;
  shownCount: number;
  clients: RelevantClient[];
};

export async function buildRelevantClientsContext(opts: {
  workspaceId: number;
  userId: number;
  workspaceRole: "owner" | "admin" | "agent" | null | undefined;
  question: string;
  perTriggerLimit?: number;
}): Promise<RelevantTriggerBlock[]> {
  const triggers = detectTriggersInQuestion(opts.question);
  if (triggers.length === 0) return [];

  // Even if the question is not phrased as "who", we still attach a small
  // sample when a trigger is mentioned — gives the LLM material to answer
  // follow-ups like "ומי הם?" or "ומה הצבירה הממוצעת שלהם?".
  const limit = opts.perTriggerLimit ?? (isWhoQuestion(opts.question) ? 20 : 5);

  const blocks: RelevantTriggerBlock[] = [];
  for (const triggerKey of triggers) {
    const rows = await listClientsForTriggerV2({
      workspaceId: opts.workspaceId,
      triggerKey,
      userId: opts.userId,
      workspaceRole: opts.workspaceRole,
      limit,
    });
    const clientsForBlock: RelevantClient[] = rows.map((c: any) => ({
      name: (c.fullName ?? "").trim() || "(ללא שם)",
      totalBalance: c.totalBalance != null ? Number(c.totalBalance) : null,
      age: c.age ?? null,
      email: c.email ?? null,
      phone: c.phone ?? null,
    }));
    blocks.push({
      triggerKey,
      totalCount: rows.length,
      shownCount: clientsForBlock.length,
      clients: clientsForBlock,
    });
  }
  return blocks;
}
