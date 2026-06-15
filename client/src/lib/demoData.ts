// Editorial Fintech | SPARK AI
// נתוני דמו - מבוססים על דוח "מוצרים בניהול" האמיתי, מותאמים להדרכה

export const LOGO = {
  clear: "/manus-storage/spark_logo_tight_38c6fe50.png",
  purple: "/manus-storage/spark_logo_tight_38c6fe50.png",
};

export const ASSETS = {
  hero: "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/spark-hero-realistic-5fdaVri48YgDTzfR7GGfMo.webp",
  brain: "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/spark_hero_v2-GhGtJfaqU3oTBzjHbRCT73.webp",
  summary: "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/spark_summary_v2-Kf7bPwjNXxfHimS7o3PJHf.webp",
};

export type Stage =
  | "splash"
  | "intro"
  | "upload"
  | "category"
  | "analyzing"
  | "dashboard"
  | "dashboard2"
  | "dashboard3"
  | "actions"
  | "summary";

/**
 * Analysis category buckets that drive the guest demo experience.
 * Each value maps to a `flagStatus` produced by the parser, so we can
 * filter `customers` and tailor stats/triggers/actions per selection.
 */
export type AnalysisCategory =
  | "all"
  | "vip"
  | "tikun_190"
  | "liquid_fund"
  | "high_fees"
  | "risk_ending"
  | "coverage_gaps";

export interface AnalysisCategoryDef {
  id: AnalysisCategory;
  name: string;
  subtitle: string;
  description: string;
  /** P-bucket label shown on the picker card */
  priorityLabel: string;
  /** Tailwind classes for the badge accent */
  accent: string;
}

/**
 * Maps each analysis category to the set of customer `status` values that
 * belong to it. "all" returns null (no filter).
 */
export const CATEGORY_TO_STATUSES: Record<AnalysisCategory, ReadonlyArray<Customer["status"]> | null> = {
  all: null,
  risk_ending: ["ריסק זמני", "תום הנחה"],
  coverage_gaps: ["ללא פנסיה"],
  tikun_190: ["תיקון 190"],
  liquid_fund: ["השתלמות נזילה"],
  high_fees: ["תשואה חלשה", "דמי ניהול גבוהים"],
  vip: ["VIP"],
};

/**
 * Filter helper: given a list of customers and an AnalysisCategory, return
 * only those whose `status` belongs to the category. Order is preserved.
 */
export function filterCustomersByCategory<T extends { status: Customer["status"] }>(
  customers: T[],
  category: AnalysisCategory,
): T[] {
  const allowed = CATEGORY_TO_STATUSES[category];
  if (!allowed) return customers;
  const set = new Set(allowed);
  return customers.filter((c) => set.has(c.status));
}

export const ANALYSIS_CATEGORIES: AnalysisCategoryDef[] = [
  {
    id: "all",
    name: "תמונה מלאה של התיק",
    subtitle: "כל הטריגרים במבט אחד",
    description: "להציג את כל המדדים, הטריגרים וההמלצות בתמונה מלאה — גם הטריגרים שהמשמעות המיידית שלהם נמוכה יותר.",
    priorityLabel: "תצוגה מלאה",
    accent: "text-white",
  },
  {
    id: "risk_ending",
    name: "ריסק זמני · כיסוי מסתיים",
    subtitle: "P1 · דורש טיפול מיידי",
    description: "לקוחות שהכיסוי הזמני שלהם עומד להסתיים, לפני שתיווצר חלל בכיסוי. מציע רשימת פעולה לטיפול מיידי.",
    priorityLabel: "P1 · לטיפול מיידי",
    accent: "text-rose-300",
  },
  {
    id: "coverage_gaps",
    name: "ללא פנסיה · חוסר כיסויים",
    subtitle: "P1 · הזדמנות להשלמת תיק",
    description: "לקוחות עם חיסכון אך ללא מוצר פנסיוני פעיל, או תיק חלקי ללא כיסויים משלימים. הזדמנות לקרן פנסיה מקיפה / כיסוי חיים.",
    priorityLabel: "P1 · השלמת תיק",
    accent: "text-amber-300",
  },
  {
    id: "tikun_190",
    name: "תיקון 190 / עצמאי",
    subtitle: "P2 · פטור ממס רווחי הון",
    description: "לקוחות מעל גיל 60 עם צבירה משמעותית שלא בקרן פנסיה. הזדמנות להפקדה לפי תיקון 190 לניצול פטור ממס רווחי הון.",
    priorityLabel: "P2 · פטור ממס",
    accent: "text-gold",
  },
  {
    id: "liquid_fund",
    name: "השתלמויות נזילות",
    subtitle: "P2 · הזדמנות להשקעה / IRA",
    description: "קרנות השתלמות שעברו 6 שנים — לקוח יכול למשוך את הכסף ללא תשלום מס. הזדמנות מצוינת לשיחת השקעה מחדש.",
    priorityLabel: "P2 · הזדמנות השקעה",
    accent: "text-emerald-300",
  },
  {
    id: "high_fees",
    name: "תשואה חלשה / דמי ניהול גבוהים",
    subtitle: "P3 · שימור והוזלה",
    description: "לקוחות עם תשואה מתחת למדד או דמי ניהול גבוהים. פגישת שימור להוזלת דמי ניהול או מעבר למסלול רווחי.",
    priorityLabel: "P3 · שימור",
    accent: "text-sky-300",
  },
  {
    id: "vip",
    name: "לקוחות VIP / זהב",
    subtitle: "P4 · מגע אישי",
    description: "לקוחות עם צבירה מעל 1M ₪. מגע אישי, תכנון פיננסי מקיף וניהול עושר — לקוחות שמזיזים את רוב הכנסה של המשרד.",
    priorityLabel: "P4 · מגע אישי",
    accent: "text-gold",
  },
];

export interface Customer {
  id: string;
  name: string;
  age: number;
  city: string;
  phone: string;
  email: string | null;
  product: string;
  insurer: string;
  premium: number;
  accumulation: number;
  lastPayment: string;
  status: "ריסק זמני" | "תום הנחה" | "ללא פנסיה" | "ללא מייל" | "פעיל" | "VIP" | "השתלמות נזילה" | "תיקון 190" | "דמי ניהול גבוהים" | "תשואה חלשה" | "תשואה חזקה";
  priority: "גבוהה" | "בינונית" | "נמוכה";
  flag: string;
  recommendation: string;
}

// קבוצת לקוחות מייצגת מתוך הדוח
export const CUSTOMERS: Customer[] = [
  {
    id: "301234567",
    name: "דני כהן",
    age: 42,
    city: "תל אביב",
    phone: "052-111-2222",
    email: "dani.cohen@demo.co.il",
    product: "הפניקס - בריאות",
    insurer: "הפניקס",
    premium: 850,
    accumulation: 185000,
    lastPayment: "01/12/2025",
    status: "ריסק זמני",
    priority: "גבוהה",
    flag: "כיסוי מסתיים תוך 14 יום",
    recommendation: "פנייה מיידית - הצעת חידוש כיסוי",
  },
  {
    id: "302345678",
    name: "שרה לוי",
    age: 45,
    city: "חיפה",
    phone: "054-333-4444",
    email: "sara.levi@demo.co.il",
    product: "אקסלנס השתלמות",
    insurer: "הפניקס",
    premium: 0,
    accumulation: 92000,
    lastPayment: "01/11/2025",
    status: "ללא פנסיה",
    priority: "גבוהה",
    flag: "אין מוצר פנסיוני פעיל",
    recommendation: "הזדמנות אאפסל - הצעת קרן פנסיה מקיפה",
  },
  {
    id: "303456789",
    name: "אבי ברק",
    age: 38,
    city: "רמת גן",
    phone: "050-555-6666",
    email: null,
    product: "מגדל - חיסכון פרט",
    insurer: "מגדל",
    premium: 1200,
    accumulation: 240000,
    lastPayment: "15/11/2025",
    status: "ללא מייל",
    priority: "בינונית",
    flag: "חסר אמצעי קשר דיגיטלי",
    recommendation: "השלמת פרטי קשר לתקשורת שיווקית",
  },
  {
    id: "304567890",
    name: "מיכל דוד",
    age: 51,
    city: "ירושלים",
    phone: "053-777-8888",
    email: "michal.d@demo.co.il",
    product: "כלל - מנהלים",
    insurer: "כלל",
    premium: 2400,
    accumulation: 580000,
    lastPayment: "01/12/2025",
    status: "תום הנחה",
    priority: "גבוהה",
    flag: "הנחת פרמיה מסתיימת ב-31/01",
    recommendation: "פגישת שימור - מניעת נטישה",
  },
  {
    id: "305678901",
    name: "יוסי אברהם",
    age: 33,
    city: "באר שבע",
    phone: "055-999-0000",
    email: "yossi.a@demo.co.il",
    product: "מנורה - חיסכון",
    insurer: "מנורה",
    premium: 750,
    accumulation: 68000,
    lastPayment: "20/11/2025",
    status: "ללא פנסיה",
    priority: "גבוהה",
    flag: "צעיר ללא חיסכון פנסיוני",
    recommendation: "פגישת ייעוץ פנסיוני - פוטנציאל גבוה",
  },
  {
    id: "306789012",
    name: "רונית גולן",
    age: 47,
    city: "הרצליה",
    phone: "052-444-5555",
    email: "ronit.g@demo.co.il",
    product: "הראל - בריאות",
    insurer: "הראל",
    premium: 1100,
    accumulation: 0,
    lastPayment: "10/11/2025",
    status: "ריסק זמני",
    priority: "גבוהה",
    flag: "פוליסת בריאות בסיכון לביטול",
    recommendation: "פנייה מיידית - בדיקת צרכים",
  },
  {
    id: "307890123",
    name: "אילן שמש",
    age: 56,
    city: "פתח תקווה",
    phone: "050-222-3333",
    email: null,
    product: "מגדל - מנהלים",
    insurer: "מגדל",
    premium: 1850,
    accumulation: 720000,
    lastPayment: "01/12/2025",
    status: "ללא מייל",
    priority: "בינונית",
    flag: "חסר מייל - לקוח VIP",
    recommendation: "השלמת מייל לדוחות שנתיים",
  },
  {
    id: "308901234",
    name: "טל שרון",
    age: 29,
    city: "תל אביב",
    phone: "054-666-7777",
    email: "tal.s@demo.co.il",
    product: "אלטשולר - גמל",
    insurer: "אלטשולר שחם",
    premium: 0,
    accumulation: 45000,
    lastPayment: "01/10/2025",
    status: "ללא פנסיה",
    priority: "גבוהה",
    flag: "צעיר ללא קרן פנסיה",
    recommendation: "הזדמנות אאפסל - מוקד צעירים",
  },
  {
    id: "309012345",
    name: "עופר כהן",
    age: 62,
    city: "סביון",
    phone: "050-888-9999",
    email: "ofer.c@demo.co.il",
    product: "הפניקס - גמל",
    insurer: "הפניקס",
    premium: 0,
    accumulation: 1250000,
    lastPayment: "01/12/2025",
    status: "VIP",
    priority: "גבוהה",
    flag: "לקוח VIP - צבירה מעל 1M ₪",
    recommendation: "פגישת תכנון פיננסי מקיפה",
  },
  {
    id: "310123456",
    name: "מאיה לוי",
    age: 48,
    city: "רעננה",
    phone: "052-777-6666",
    email: "maya.l@demo.co.il",
    product: "ילין לפידות - השתלמות",
    insurer: "ילין לפידות",
    premium: 0,
    accumulation: 280000,
    lastPayment: "01/12/2025",
    status: "השתלמות נזילה",
    priority: "גבוהה",
    flag: "קרן השתלמות נזילה (ותק 6+ שנים)",
    recommendation: "הזדמנות להשקעה / IRA",
  },
  {
    id: "311234567",
    name: "יעקב שפירא",
    age: 66,
    city: "חיפה",
    phone: "054-555-4444",
    email: "yaakov.s@demo.co.il",
    product: "מגדל - חיסכון פרט",
    insurer: "מגדל",
    premium: 0,
    accumulation: 450000,
    lastPayment: "01/12/2025",
    status: "תיקון 190",
    priority: "בינונית",
    flag: "פוטנציאל לתיקון 190 (גיל 60+)",
    recommendation: "בחינת כדאיות הפקדה לפטור ממס",
  },
];

// סטטיסטיקות מצרפיות (מתואמות לסיפור של "1,247 לקוחות בתיק")
export const STATS = {
  totalCustomers: 1247,
  activeProducts: 2891,
  totalAUM: 487_000_000, // 487 מיליון ש"ח
  monthlyPremium: 1_842_000,
  // דגלים שזוהו ע"י ה-AI
  riskFlags: 21,            // לקוחות בריסק זמני
  noPension: 148,           // ללא פנסיה
  endingDiscount: 67,       // תום הנחה
  noEmail: 723,             // 58% ללא מייל
  noEmailPercent: 58,
  upcomingBirthdays: 89,    // יום הולדת בחודש הקרוב
  crossSellOpps: 312,       // הזדמנויות קרוס סייל
  // דגלים פיננסיים
  vipCustomers: 42,         // לקוחות VIP
  liquidFunds: 186,         // השתלמויות נזילות
  amendment190: 54,         // פוטנציאל תיקון 190
  lowYield: 87,             // תשואה חלשה / דמי ניהול גבוהים
  // ערך עסקי
  potentialRevenue: 2_840_000, // הכנסה פוטנציאלית מהפעולות
  timesSaved: 47, // שעות שנחסכו בחודש
};

// פילוח לפי יצרן (מבוסס על דוח האקסל)
export const INSURER_BREAKDOWN = [
  { name: "הפניקס", customers: 287, aum: 142_000_000 },
  { name: "מגדל", customers: 198, aum: 96_000_000 },
  { name: "כלל", customers: 174, aum: 84_000_000 },
  { name: "הראל", customers: 156, aum: 71_000_000 },
  { name: "מנורה", customers: 142, aum: 58_000_000 },
  { name: "אלטשולר", customers: 121, aum: 23_000_000 },
  { name: "ילין לפידות", customers: 98, aum: 13_000_000 },
  { name: "אחר", customers: 71, aum: 0 },
];

// פילוח גילאים (לקוחות ללא פנסיה)
export const AGE_GROUPS_NO_PENSION = [
  { group: "20-30", count: 38, color: "#0A1628" },
  { group: "31-40", count: 52, color: "#1F3A5F" },
  { group: "41-50", count: 34, color: "#C9A961" },
  { group: "51-60", count: 18, color: "#A38543" },
  { group: "60+", count: 6, color: "#6B5429" },
];

// טריגרים שהמערכת מנטרת
export const TRIGGERS = [
  { id: "risk", name: "ריסק זמני", count: 21, color: "destructive", icon: "AlertTriangle" },
  { id: "pension", name: "ללא פנסיה", count: 148, color: "gold", icon: "TrendingUp" },
  { id: "vip", name: "לקוחות VIP", count: 42, color: "gold", icon: "Crown" },
  { id: "liquid", name: "השתלמות נזילה", count: 186, color: "navy", icon: "Wallet" },
  { id: "amendment190", name: "תיקון 190", count: 54, color: "navy", icon: "Landmark" },
  { id: "lowYield", name: "תשואה חלשה", count: 87, color: "destructive", icon: "TrendingDown" },
];

/**
 * Demo trigger cards — the live 16-trigger model (poaExpiring90d excluded, like
 * the real dashboard) grouped by P0–P4, with representative mock counts. Each
 * `key` is one of the real TriggerKeys so the cinematic demo opens the same
 * scenario modal as the authenticated product.
 */
export const DEMO_TRIGGER_CARDS: {
  key: string;
  name: string;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
  count: number;
}[] = [
  { key: "poaExpired", name: "ללא ייפוי כוח פעיל", priority: "P0", count: 12 },
  { key: "riskTemporary", name: "ריסק זמני", priority: "P1", count: 21 },
  { key: "coverageEnding", name: "כיסויים פוגים", priority: "P1", count: 17 },
  { key: "savingsNoInsurance", name: "חיסכון ללא ביטוח", priority: "P2", count: 96 },
  { key: "noActivePension", name: "ללא פנסיה פעילה", priority: "P2", count: 148 },
  { key: "age46NoLongTermCare", name: "46+ ללא סיעוד", priority: "P2", count: 73 },
  { key: "aumFrozen", name: "AUM מוקפא", priority: "P2", count: 28 },
  { key: "highFees", name: "דמי ניהול גבוהים", priority: "P3", count: 64 },
  { key: "trackMismatch", name: "מסלול לא תואם לגיל", priority: "P3", count: 19 },
  { key: "selfEmployedNoDeposit", name: "עצמאי ללא הפקדה", priority: "P3", count: 11 },
  { key: "concentrationRisk", name: "ריכוז יתר בחברה", priority: "P3", count: 41 },
  { key: "birthdayMilestone", name: "יום הולדת מפנה", priority: "P4", count: 8 },
  { key: "birthdayThisMonth", name: "יום הולדת החודש", priority: "P4", count: 34 },
  { key: "vipGoldPremium", name: "VIP / זהב", priority: "P4", count: 42 },
  { key: "noEmail", name: "ללא מייל", priority: "P4", count: 23 },
];

// דוגמאות להתראות אוטומטיות
export const NOTIFICATIONS = [
  {
    type: "email",
    to: "סוכן: הסוכן המוביל",
    subject: "🚨 דחוף: 21 לקוחות בריסק זמני - דורש טיפול מיידי",
    preview: "המערכת זיהתה 21 לקוחות שכיסויי הריסק שלהם מסתיימים תוך 30 יום...",
    time: "לפני 2 דקות",
  },
  {
    type: "whatsapp",
    to: "לקוח: דני כהן",
    subject: "תזכורת חידוש כיסוי בריאות",
    preview: "שלום דני, פוליסת הבריאות שלך בהפניקס מסתיימת בקרוב. נשמח לתאם פגישה לחידוש...",
    time: "נשלח אוטומטית",
  },
  {
    type: "email",
    to: "לקוח: שרה לוי",
    subject: "הזדמנות לחיסכון פנסיוני מותאם אישית",
    preview: "שלום שרה, על בסיס התיק הקיים שלך, זיהינו אפשרות לבניית תוכנית פנסיונית...",
    time: "נשלח אוטומטית",
  },
];

// תהליך האנליזה - שלבים שמוצגים בזמן אמת
// Slowed for live presentation: ~3s per step → ~21s total
export const ANALYSIS_STEPS = [
  { label: "טעינת קובץ Excel", duration: 2200 },
  { label: "פענוח 6 גיליונות נתונים", duration: 2800 },
  { label: "מיפוי 1,247 לקוחות ייחודיים", duration: 3200 },
  { label: "ניתוח 2,891 מוצרים פעילים", duration: 3000 },
  { label: "זיהוי דגלים אדומים (AI)", duration: 3800 },
  { label: "חישוב הזדמנויות עסקיות", duration: 2600 },
  { label: "הפקת דשבורד תובנות", duration: 2200 },
];

export const formatCurrency = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₪`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₪`;
  return `${n.toLocaleString("he-IL")} ₪`;
};

export const formatNumber = (n: number): string => n.toLocaleString("he-IL");
