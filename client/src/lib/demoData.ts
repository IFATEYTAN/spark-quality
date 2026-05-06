// Editorial Fintech | SPARK AI × קוואליטי
// נתוני דמו - מבוססים על דוח "מוצרים בניהול" האמיתי, מותאמים להדרכה

export const LOGO = {
  clear: "/manus-storage/spark_logo_tight_38c6fe50.png",
  purple: "/manus-storage/spark_logo_tight_38c6fe50.png",
  quality: "/manus-storage/quality_logo_157d21ea.png",
};

export const ASSETS = {
  hero: "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/spark_hero_clean-ND9uBaHdtTbuBzrJA2YgFK.webp",
  brain: "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/spark_hero_v2-GhGtJfaqU3oTBzjHbRCT73.webp",
  summary: "https://d2xsxph8kpxj0f.cloudfront.net/99541940/ZqvPyEVdTkw9DPvc2ezGwV/spark_summary_v2-Kf7bPwjNXxfHimS7o3PJHf.webp",
};

export type Stage = "splash" | "intro" | "upload" | "analyzing" | "dashboard" | "actions" | "summary";

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
  { id: "discount", name: "תום הנחה", count: 67, color: "navy", icon: "Calendar" },
  { id: "email", name: "ללא מייל", count: 723, color: "muted", icon: "Mail" },
  { id: "birthday", name: "יום הולדת", count: 89, color: "navy", icon: "Gift" },
  { id: "crosssell", name: "קרוס-סייל", count: 312, color: "gold", icon: "Sparkles" },
];

// דוגמאות להתראות אוטומטיות
export const NOTIFICATIONS = [
  {
    type: "email",
    to: "סוכן: יפעת איתן",
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
export const ANALYSIS_STEPS = [
  { label: "טעינת קובץ Excel", duration: 600 },
  { label: "פענוח 6 גיליונות נתונים", duration: 800 },
  { label: "מיפוי 1,247 לקוחות ייחודיים", duration: 900 },
  { label: "ניתוח 2,891 מוצרים פעילים", duration: 800 },
  { label: "זיהוי דגלים אדומים (AI)", duration: 1100 },
  { label: "חישוב הזדמנויות עסקיות", duration: 700 },
  { label: "הפקת דשבורד תובנות", duration: 500 },
];

export const formatCurrency = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ₪`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₪`;
  return `${n.toLocaleString("he-IL")} ₪`;
};

export const formatNumber = (n: number): string => n.toLocaleString("he-IL");
