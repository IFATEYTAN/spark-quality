// 16 distinct action-flow scenarios — one per priority trigger key.
// Each scenario carries its own pain/trigger/example/outcome text so the
// CategoryScenarioModal renders a unique experience for every trigger,
// while still reusing one of the 6 existing FLOWCHART_DATA visual flows.
//
// `flowchartKey` selects the visual flowchart from InteractiveFlowchart.tsx
// (limited set: vip / lowYield / 190 / discount / risk / coverageGaps).

export type TriggerKey =
  | "poaExpired"
  | "poaExpiring90d"
  | "riskTemporary"
  | "coverageEnding"
  | "savingsNoInsurance"
  | "noActivePension"
  | "age46NoLongTermCare"
  | "aumFrozen"
  | "highFees"
  | "trackMismatch"
  | "selfEmployedNoDeposit"
  | "concentrationRisk"
  | "birthdayMilestone"
  | "birthdayThisMonth"
  | "vipGoldPremium"
  | "noEmail";

export type FlowchartKey =
  | "vip"
  | "lowYield"
  | "190"
  | "discount"
  | "risk"
  | "coverageGaps"
  // Added Round 132 — 7 new flows so every trigger gets a matching flow
  | "poa"
  | "selfEmployed"
  | "birthday"
  | "noContact"
  | "concentration"
  | "feeReduction"
  | "coverageRenewal";

export interface OutcomeMetric {
  label: string;
  value: string;
}

export interface ExampleCustomer {
  name: string;
  flag: string;
  channel: string;
}

export interface TriggerScenario {
  triggerKey: TriggerKey;
  flowchartKey: FlowchartKey;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  title: string;
  pain: string;
  trigger: string;
  exampleCustomer: ExampleCustomer;
  outcome: OutcomeMetric[];
}

export const TRIGGER_SCENARIOS: Record<TriggerKey, TriggerScenario> = {
  // ─────────────── P0 · קריטי משפטי ───────────────
  poaExpired: {
    triggerKey: "poaExpired",
    flowchartKey: "poa",
    priority: "P0",
    title: "ללא ייפוי כוח פעיל — חידוש דיגיטלי מיידי",
    pain: "מוצר פעיל ללא מיופה כוח רשום = אינך מוסמך לפעול עליו מול חוזר 2013. חשיפה משפטית וסיכון לאובדן ניהול התיק — לטפל לפני הכל.",
    trigger: "מוצר פעיל ללא 'מיופה כוח אחרון' בדוח",
    exampleCustomer: {
      name: "לקוח עם מוצר פעיל · ללא מיופה כוח רשום",
      flag: "NO POA",
      channel: "SMS דיגיטלי + טלפון מיידי",
    },
    outcome: [
      { label: "תיקים בסיכון", value: "—" },
      { label: "זמן חידוש דיגיטלי", value: "3 דק׳" },
      { label: "חיסכון קנס מקצועי", value: "100%" },
    ],
  },
  poaExpiring90d: {
    triggerKey: "poaExpiring90d",
    flowchartKey: "poa",
    priority: "P0",
    title: "ייפוי כוח פוקע תוך 90 יום",
    pain: "אם נחכה — נצטרך לרדוף אחרי הלקוח ברגע האחרון. פנייה מסודרת היום מבטיחה חידוש שקט והמשכיות.",
    trigger: "פקיעת ייפוי הכוח בטווח של עד 90 יום קדימה",
    exampleCustomer: {
      name: "אבי כהן · תוקף פוקע 27.07.2026",
      flag: "POA · 90D",
      channel: "מייל מתוזמן + לינק חידוש",
    },
    outcome: [
      { label: "חלון פנייה", value: "≤ 90 יום" },
      { label: "אחוז חידוש דיגיטלי", value: "92%" },
      { label: "אובדן צפוי בלי חידוש", value: "0" },
    ],
  },

  // ─────────────── P1 · דחוף ───────────────
  riskTemporary: {
    triggerKey: "riskTemporary",
    flowchartKey: "risk",
    priority: "P1",
    title: "ריסק זמני — שיחת חידוש תוך 48 שעות",
    pain: "כיסוי ביטוח חיים בסטטוס זמני עלול להיקטע. המשפחה חשופה — והסוכן מאבד עמלות קבועות.",
    trigger: "סטטוס המוצר = ׳ריסק זמני׳ או תאריך סיום בטווח קרוב",
    exampleCustomer: {
      name: "אבי מזרחי · ריסק 1.2M ₪ · מסתיים 03/2026",
      flag: "ריסק זמני",
      channel: "WhatsApp דחוף + מייל גיבוי",
    },
    outcome: [
      { label: "כיסויים בסיכון", value: "—" },
      { label: "אחוז חידוש צפוי", value: "82%" },
      { label: "פרמיות שימור", value: "₪95K/שנה" },
    ],
  },
  coverageEnding: {
    triggerKey: "coverageEnding",
    flowchartKey: "coverageRenewal",
    priority: "P1",
    title: "כיסויים פוגים — הצעת חידוש מוכנה",
    pain: "כיסוי שמסתיים בלי חלופה משאיר את הלקוח חשוף ואת הסוכן ללא עמלת שימור. חלון של ימים, לא חודשים.",
    trigger: "תאריך תום כיסוי בטווח של עד 60 יום",
    exampleCustomer: {
      name: "מירב לוי · כיסוי בריאות פוקע 21.06.2026",
      flag: "COVERAGE END",
      channel: "מייל אישי + שיחת מעקב",
    },
    outcome: [
      { label: "כיסויים בסיכון", value: "—" },
      { label: "אחוז חידוש פעיל", value: "74%" },
      { label: "פרמיות נשמרו", value: "₪185K/שנה" },
    ],
  },

  // ─────────────── P2 · הזדמנות גבוהה ───────────────
  savingsNoInsurance: {
    triggerKey: "savingsNoInsurance",
    flowchartKey: "coverageGaps",
    priority: "P2",
    title: "חיסכון ללא ביטוח — קרוס-סייל ישיר",
    pain: "ללקוח יש קרן השתלמות / גמל אבל בלי שום ביטוח. כסף יושב, סיכון גבוה, ועמלת מכירה אחת לוקחת אותו לתיק שלם.",
    trigger: "קיים מוצר חיסכון פעיל אך אין מוצר ביטוח חיים/בריאות",
    exampleCustomer: {
      name: "רינת אברהם · גמל 380K ₪ · ללא ביטוח חיים",
      flag: "NO INS",
      channel: "מייל + פגישת ייעוץ",
    },
    outcome: [
      { label: "לקוחות", value: "—" },
      { label: "פוטנציאל אאפסל", value: "₪520K" },
      { label: "חשיפה ביטוחית", value: "₪16M" },
    ],
  },
  noActivePension: {
    triggerKey: "noActivePension",
    flowchartKey: "coverageGaps",
    priority: "P2",
    title: "אין פנסיה פעילה — חזרה למסלול",
    pain: "לקוח בגיל עבודה בלי קרן פנסיה פעילה הוא פצצת זמן רגולטורית, וגם הזדמנות מיידית לפתוח חיסכון מנוהל.",
    trigger: "אין מוצר פנסיוני בסטטוס פעיל",
    exampleCustomer: {
      name: "יוסי בן-דוד · גיל 47 · ללא פנסיה",
      flag: "NO PENSION",
      channel: "מייל הסבר + שיחה אישית",
    },
    outcome: [
      { label: "לקוחות בסיכון", value: "—" },
      { label: "פוטנציאל פתיחה", value: "75%" },
      { label: "עמלות מכירה", value: "₪240K" },
    ],
  },
  age46NoLongTermCare: {
    triggerKey: "age46NoLongTermCare",
    flowchartKey: "coverageGaps",
    priority: "P2",
    title: "46+ ללא ביטוח סיעוד — חלון נסגר",
    pain: "אחרי גיל 60 הפרמיה מזנקת או שאי אפשר להתקבל בכלל. חלון של מספר שנים שכל יום בו נסגר.",
    trigger: "גיל ≥ 46 ואין מוצר סיעוד פעיל",
    exampleCustomer: {
      name: "סיגלית רוזן · גיל 52 · ללא סיעוד",
      flag: "NO LTC · 46+",
      channel: "מייל ממוקד + סימולציה",
    },
    outcome: [
      { label: "לקוחות במנעד", value: "—" },
      { label: "אחוז סגירה צפוי", value: "61%" },
      { label: "פרמיה שנתית ממוצעת", value: "₪3,200" },
    ],
  },
  aumFrozen: {
    triggerKey: "aumFrozen",
    flowchartKey: "lowYield",
    priority: "P2",
    title: "קרן ללא הפקדות — שיחת בירור",
    pain: "צבירה שיושבת במוצר ללא הפקדות פעילות — תשואה אפס מהפקדות לחיסכון, אפס לסוכן. שיחה אחת מחזירה אותה לפעילות.",
    trigger: "מוצר פעיל עם צבירה אך ללא הפקדות (פרמיה 0)",
    exampleCustomer: {
      name: "תמר בר-לב · גמל 145K ₪ · ללא הפקדות מאז 2021",
      flag: "ללא הפקדות",
      channel: "שיחת בירור + מייל מסכם",
    },
    outcome: [
      { label: "קרנות ללא הפקדה בתיק", value: "—" },
      { label: "פוטנציאל הפעלה", value: "68%" },
      { label: "עמלות שנתיות חדשות", value: "₪180K" },
    ],
  },

  // ─────────────── P3 · שיפור תיק ───────────────
  highFees: {
    triggerKey: "highFees",
    flowchartKey: "feeReduction",
    priority: "P3",
    title: "דמי ניהול גבוהים — מ״מ מול היצרן",
    pain: "הלקוח משלם יותר מהממוצע, היצרן מרוויח, הסוכן מסוכן לאיבוד. משא ומתן יזום מציל את התיק.",
    trigger: "דמי ניהול גבוהים מממוצע השוק לסוג המוצר",
    exampleCustomer: {
      name: "מיכל דוד · דמי ניהול 1.4% · ותק 8 שנים",
      flag: "HIGH FEES",
      channel: "מייל השוואה + שיחת שימור",
    },
    outcome: [
      { label: "לקוחות מעל הממוצע", value: "—" },
      { label: "אחוז שימור צפוי", value: "73%" },
      { label: "עמלות שימור", value: "₪220K" },
    ],
  },
  trackMismatch: {
    triggerKey: "trackMismatch",
    flowchartKey: "lowYield",
    priority: "P3",
    title: "מסלול לא מתאים לגיל — ייעוץ לפני פרישה",
    pain: "55+ במסלול מנייתי = סיכון לא נחוץ לפני פרישה. ייעוץ אחד מציל פנסיה ומחזק נאמנות.",
    trigger: "גיל ≥ 55 במסלול בסיכון גבוה / מנייתי",
    exampleCustomer: {
      name: "רון פרץ · גיל 58 · מסלול מנייתי 100%",
      flag: "TRACK MISMATCH",
      channel: "פגישת ייעוץ + סימולציה",
    },
    outcome: [
      { label: "לקוחות בסטיית מסלול", value: "—" },
      { label: "אחוז שינוי מסלול", value: "84%" },
      { label: "עמלות ייעוץ", value: "₪90K" },
    ],
  },
  selfEmployedNoDeposit: {
    triggerKey: "selfEmployedNoDeposit",
    flowchartKey: "selfEmployed",
    priority: "P3",
    title: "עצמאי / בעל שליטה — לא הפקיד השנה",
    pain: "חשיפת מס חמורה לעצמאים שלא ניצלו את ההפקדה השנתית. תזכורת אוטומטית שווה אלפי שקלים ועמלת מכירה.",
    trigger: "סטטוס עצמאי / בעל שליטה ואין הפקדה בשנה הנוכחית",
    exampleCustomer: {
      name: "ערן ישראלי · עצמאי · לא הפקיד מאז 01.2025",
      flag: "SE · NO DEP",
      channel: "מייל תזכורת + פגישה",
    },
    outcome: [
      { label: "עצמאים זוהו", value: "—" },
      { label: "חיסכון מס ממוצע", value: "₪9,400" },
      { label: "עמלות מכירה צפויות", value: "₪140K" },
    ],
  },
  concentrationRisk: {
    triggerKey: "concentrationRisk",
    flowchartKey: "concentration",
    priority: "P3",
    title: "ריכוז יתר בחברה אחת — ניתוח פיזור",
    pain: "מעל 35% מ-AUM של הלקוח אצל יצרן אחד = סיכון לא נחוץ. ניתוח פיזור מציע את הצעד הבא.",
    trigger: "מעל 35% מצבירת הלקוח אצל יצרן בודד",
    exampleCustomer: {
      name: "ענבר ארז · 78% מהצבירה אצל יצרן יחיד",
      flag: "CONCENTRATION",
      channel: "מייל פיזור + ייעוץ",
    },
    outcome: [
      { label: "לקוחות בריכוז יתר", value: "—" },
      { label: "אחוז ניוד צפוי", value: "55%" },
      { label: "AUM משוחרר", value: "₪22M" },
    ],
  },

  // ─────────────── P4 · שימור ונגיעה ───────────────
  birthdayMilestone: {
    triggerKey: "birthdayMilestone",
    flowchartKey: "birthday",
    priority: "P4",
    title: "יום הולדת מפנה (40 / 50 / 60) — סקירת תיק",
    pain: "ימי הולדת מפנים הם הנקודה הטבעית לסקירת תיק שלמה. הלקוח מצפה לפנייה — ואם לא קיבל, יחפש תחליף.",
    trigger: "יום ההולדת השנתי = 40, 50 או 60",
    exampleCustomer: {
      name: "שרה דניאל · יום הולדת 50 בעוד 18 ימים",
      flag: "MILESTONE 50",
      channel: "WhatsApp אישי + הצעת פגישה",
    },
    outcome: [
      { label: "לקוחות במפנה השנה", value: "—" },
      { label: "אחוז קביעת פגישה", value: "47%" },
      { label: "ערך פגישה ממוצע", value: "₪12K" },
    ],
  },
  birthdayThisMonth: {
    triggerKey: "birthdayThisMonth",
    flowchartKey: "birthday",
    priority: "P4",
    title: "יום הולדת החודש — נגיעה אישית",
    pain: "ברכה אישית בחודש יום ההולדת מחזקת את הקשר ויוצרת פתח לשיחת שימור. בלי זה — הלקוח שוכח שאתם קיימים.",
    trigger: "החודש הנוכחי = חודש יום ההולדת של הלקוח",
    exampleCustomer: {
      name: "אסף כהן · יום הולדת 18.05",
      flag: "BIRTHDAY",
      channel: "WhatsApp אישי",
    },
    outcome: [
      { label: "ברכות החודש", value: "—" },
      { label: "אחוז תגובה", value: "63%" },
      { label: "שיחות מעקב", value: "—" },
    ],
  },
  vipGoldPremium: {
    triggerKey: "vipGoldPremium",
    flowchartKey: "vip",
    priority: "P4",
    title: "VIP / זהב / פרימיום — פגישת ניהול עושר",
    pain: "לקוחות עתירי נכסים מצפים ליחס מיוחד. בלי פגישה שנתית סדורה הם הופכים לטרף תחרותי קל.",
    trigger: "צבירה ≥ 1M ₪ או סיווג זהב/פרימיום בתיק",
    exampleCustomer: {
      name: "דני כהן · גיל 58 · צבירה 1.4M ₪",
      flag: "VIP",
      channel: "אימייל אישי + פגישת זום",
    },
    outcome: [
      { label: "לקוחות זוהו", value: "—" },
      { label: "AUM קבוצה", value: "₪47M" },
      { label: "פוטנציאל הכנסה", value: "₪380K" },
    ],
  },
  noEmail: {
    triggerKey: "noEmail",
    flowchartKey: "noContact",
    priority: "P4",
    title: "ללא מייל — בקשת עדכון פרטי קשר",
    pain: "אי-אפשר לדוור או לתקשר עם לקוח בלי מייל. כל הקמפיינים הבאים תלויים בפעולה הזו.",
    trigger: "לקוח פעיל ללא כתובת מייל בתיק",
    exampleCustomer: {
      name: "נעם רביב · לקוח פעיל · אין כתובת מייל",
      flag: "NO EMAIL",
      channel: "SMS לבקשת עדכון פרטים",
    },
    outcome: [
      { label: "לקוחות ללא מייל", value: "—" },
      { label: "אחוז עדכון תוך שבוע", value: "71%" },
      { label: "כיסוי תקשורת לאחר", value: "100%" },
    ],
  },
};

/**
 * Try to merge live values from the LLM analysis JSON into the static
 * outcome metrics. The LLM schema isn't strictly enforced, so we look
 * for common fields and fall back to the canned values.
 */
export function mergeOutcomeWithAnalysis(
  scenario: TriggerScenario,
  analysis: unknown,
  count?: number,
): OutcomeMetric[] {
  const outcome = scenario.outcome.map((m) => ({ ...m }));
  // First metric is usually a count slot — replace "—" with live count when available.
  if (typeof count === "number" && Number.isFinite(count) && outcome[0]) {
    if (outcome[0].value === "—" || outcome[0].value === "") {
      outcome[0] = { ...outcome[0], value: count.toLocaleString("he-IL") };
    }
  }
  // Best-effort: pull a matching number from analysis.kpis if it has one
  // matching the scenario's flowchartKey (e.g. risk_zmani, vip_count, …).
  if (analysis && typeof analysis === "object") {
    const a = analysis as { kpis?: Record<string, number> };
    const kpis = a.kpis ?? {};
    const aliases: Record<TriggerKey, string[]> = {
      poaExpired: ["poa_expired", "poaExpired"],
      poaExpiring90d: ["poa_expiring_90d"],
      riskTemporary: ["risk_zmani", "risk_temporary", "riskFlags"],
      coverageEnding: ["coverage_ending"],
      savingsNoInsurance: ["savings_no_insurance"],
      noActivePension: ["no_pension", "noActivePension"],
      age46NoLongTermCare: ["age_46_no_ltc", "noLtc46Plus"],
      aumFrozen: ["aum_frozen", "aumFrozen"],
      highFees: ["high_fees", "highFees", "lowYield"],
      trackMismatch: ["track_mismatch"],
      selfEmployedNoDeposit: ["self_employed_no_deposit"],
      concentrationRisk: ["concentration_risk"],
      birthdayMilestone: ["birthday_milestone"],
      birthdayThisMonth: ["birthday_this_month"],
      vipGoldPremium: ["vip_count", "vipCustomers"],
      noEmail: ["no_email", "noEmail"],
    };
    for (const alias of aliases[scenario.triggerKey] ?? []) {
      const v = kpis[alias];
      if (typeof v === "number" && Number.isFinite(v) && outcome[0]) {
        if (outcome[0].value === "—" || outcome[0].value === "") {
          outcome[0] = { ...outcome[0], value: v.toLocaleString("he-IL") };
          break;
        }
      }
    }
  }
  return outcome;
}
