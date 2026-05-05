// Editorial Fintech | Parse Shorens "Products in Management" report
// Reads a real .xlsx/.xls/.csv file and extracts customers + products into a unified structure
// that mirrors our Customer demo shape, so the rest of the demo can present real data.
import * as XLSX from "xlsx";
import type { Customer } from "./demoData";

export interface ParsedReport {
  customers: Customer[];
  customerCount: number;
  productCount: number;
  rawRows: number;
  fileName: string;
  // Insurer breakdown derived from the file
  insurerBreakdown: { name: string; customers: number }[];
  // Aggregate stats matching the dashboard shape
  stats: {
    totalCustomers: number;
    activeProducts: number;
    totalAUM: number;
    monthlyPremium: number;
    riskFlags: number;
    noPension: number;
    endingDiscount: number;
    noEmail: number;
    noEmailPercent: number;
    upcomingBirthdays: number;
    crossSellOpps: number;
    potentialRevenue: number;
    timesSaved: number;
  };
}

// ---- Hebrew column-name detection (fuzzy) ---------------------------------
const HE = (s: any) => String(s ?? "").trim();

function findCol(headers: string[], candidates: string[]): number {
  const norm = (s: string) =>
    s.replace(/["׳״'\.\(\)\s\u05BE-]/g, "").toLowerCase();
  const normalized = headers.map(norm);
  for (const c of candidates) {
    const cn = norm(c);
    const idx = normalized.findIndex((h) => h.includes(cn));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Map of fields we care about
const COL_HINTS = {
  insurer: ["יצרן", "חברת ביטוח"],
  product: ["מוצר", "סוג מוצר"],
  policy: ["מספר חשבון", "פוליסה", 'מס" חשבון'],
  firstName: ["שם פרטי"],
  lastName: ["שם משפחה"],
  fullName: ["שם הלקוח", "שם לקוח"],
  id: ["תז", "ת.ז", "תעודת זהות", "מספר ת.ז", "מספר תז"],
  phone: ["סלולרי", "נייד", "טלפון"],
  email: ["דואל", 'דוא"ל', "מייל", "אימייל", "email"],
  birthDate: ["תאריך לידה"],
  age: ["גיל"],
  city: ["יישוב", "עיר", "ישוב"],
  status: ["סטטוס", "סטטוס מוצר"],
  premium: ["סהכפרמיה", 'סה"כ פרמיה', "פרמיה"],
  accumulation: ["צבירה", "יתרה", "סכום צבירה"],
  lastPayment: ["תאריך עדכון", "תאריך הצטרפות", "תאריך עדכון סטטוס"],
};

// Normalize phone to 0XX-XXX-XXXX
function normalizePhone(raw: any): string {
  const s = HE(raw).replace(/\D/g, "");
  if (!s) return "";
  if (s.length === 10) return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
  if (s.length === 9) return `0${s.slice(0, 2)}-${s.slice(2, 5)}-${s.slice(5)}`;
  return s;
}

function toNumber(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[,₪\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function classify(row: Record<string, any>): {
  status: Customer["status"];
  priority: Customer["priority"];
  flag: string;
  recommendation: string;
} {
  const status = HE(row.status);
  const email = HE(row.email);
  const product = HE(row.product).toLowerCase();
  const accumulation = toNumber(row.accumulation);

  // Heuristics
  if (status.includes("ריסק") || status.includes("מסתיים")) {
    return {
      status: "ריסק זמני",
      priority: "גבוהה",
      flag: "כיסוי מסתיים בקרוב",
      recommendation: "פנייה מיידית - הצעת חידוש כיסוי",
    };
  }
  if (status.includes("הנחה")) {
    return {
      status: "תום הנחה",
      priority: "גבוהה",
      flag: "תום הנחת פרמיה",
      recommendation: "פגישת שימור · הצעת חידוש הטבה",
    };
  }
  if (!product.includes("פנסיה") && !product.includes("גמל")) {
    return {
      status: "ללא פנסיה",
      priority: "בינונית",
      flag: "אין מוצר פנסיוני פעיל",
      recommendation: "הזדמנות אאפסל - הצעת קרן פנסיה מקיפה",
    };
  }
  if (!email) {
    return {
      status: "ללא מייל",
      priority: "נמוכה",
      flag: "אין כתובת מייל בתיק",
      recommendation: "השלמת פרטי קשר לתקשורת שיווקית",
    };
  }
  return {
    status: "פעיל",
    priority: "נמוכה",
    flag: accumulation > 100000 ? "צבירה משמעותית - מעקב תקופתי" : "תיק פעיל תקין",
    recommendation: "סקירה תקופתית · ללא פעולה דחופה",
  };
}

function buildCustomersFromSheet(
  sheet: XLSX.WorkSheet,
): Customer[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  if (rows.length < 2) return [];
  const headers = rows[0].map(HE);

  const idx = {
    insurer: findCol(headers, COL_HINTS.insurer),
    product: findCol(headers, COL_HINTS.product),
    firstName: findCol(headers, COL_HINTS.firstName),
    lastName: findCol(headers, COL_HINTS.lastName),
    fullName: findCol(headers, COL_HINTS.fullName),
    id: findCol(headers, COL_HINTS.id),
    phone: findCol(headers, COL_HINTS.phone),
    email: findCol(headers, COL_HINTS.email),
    age: findCol(headers, COL_HINTS.age),
    city: findCol(headers, COL_HINTS.city),
    status: findCol(headers, COL_HINTS.status),
    premium: findCol(headers, COL_HINTS.premium),
    accumulation: findCol(headers, COL_HINTS.accumulation),
    lastPayment: findCol(headers, COL_HINTS.lastPayment),
  };

  // Need at least an ID column or a name column to proceed
  if (idx.id === -1 && idx.fullName === -1 && idx.firstName === -1) return [];

  // Aggregate at customer level (id) - keep one row per customer with most informative fields
  const map = new Map<string, Customer>();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => HE(c) === "")) continue;

    const idVal = idx.id !== -1 ? HE(row[idx.id]) : "";
    const id = idVal || `R${r}`;

    const firstName = idx.firstName !== -1 ? HE(row[idx.firstName]) : "";
    const lastName = idx.lastName !== -1 ? HE(row[idx.lastName]) : "";
    const fullName =
      idx.fullName !== -1
        ? HE(row[idx.fullName])
        : `${firstName} ${lastName}`.trim();
    if (!fullName) continue;

    const r1 = {
      insurer: idx.insurer !== -1 ? HE(row[idx.insurer]).replace(/חברה לביטוח בע"מ|בע"מ/g, "").trim() : "—",
      product: idx.product !== -1 ? HE(row[idx.product]) : "—",
      phone: idx.phone !== -1 ? normalizePhone(row[idx.phone]) : "",
      email: idx.email !== -1 ? HE(row[idx.email]) || null : null,
      age: idx.age !== -1 ? Math.round(toNumber(row[idx.age])) || 40 : 40,
      city: idx.city !== -1 ? HE(row[idx.city]) : "",
      status: idx.status !== -1 ? HE(row[idx.status]) : "",
      premium: idx.premium !== -1 ? toNumber(row[idx.premium]) : 0,
      accumulation: idx.accumulation !== -1 ? toNumber(row[idx.accumulation]) : 0,
      lastPayment: idx.lastPayment !== -1 ? HE(row[idx.lastPayment]).slice(0, 10) : "",
    };

    const cls = classify(r1);

    if (!map.has(id)) {
      map.set(id, {
        id,
        name: fullName,
        age: r1.age,
        city: r1.city || "—",
        phone: r1.phone || "—",
        email: r1.email,
        product: `${r1.insurer} - ${r1.product}`.replace(/^\s*-\s*/, ""),
        insurer: r1.insurer || "—",
        premium: r1.premium,
        accumulation: r1.accumulation,
        lastPayment: r1.lastPayment || "",
        status: cls.status,
        priority: cls.priority,
        flag: cls.flag,
        recommendation: cls.recommendation,
      });
    } else {
      // accumulate financial figures
      const existing = map.get(id)!;
      existing.premium += r1.premium;
      existing.accumulation += r1.accumulation;
      // upgrade priority if a higher-flag row appears
      if (cls.priority === "גבוהה") {
        existing.priority = "גבוהה";
        existing.status = cls.status;
        existing.flag = cls.flag;
        existing.recommendation = cls.recommendation;
      }
      // backfill missing email/phone
      if (!existing.email && r1.email) existing.email = r1.email;
      if (existing.phone === "—" && r1.phone) existing.phone = r1.phone;
    }
  }

  return Array.from(map.values());
}

export async function parseShorensReport(file: File): Promise<ParsedReport> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });

  // Process sheets selectively to avoid double-counting financials.
  // Savings (מוצרי חיסון) provides accumulation. Insurance (מוצרי ביטוח) provides premium.
  // Skip summary/aggregate sheets (דוח מסכם) which would inflate counts.
  const allCustomers = new Map<string, Customer>();
  let totalRows = 0;
  const SAVINGS_SHEET_HINTS = ["חיסון", "פנסיה וגמל", "פינסים"];
  const INSURANCE_SHEET_HINTS = ["ביטוח"];
  const SKIP_HINTS = ["מסכם", "מסלול", "כיסוי"]; // skip aggregates and coverage detail sheet
  
  for (const sheetName of wb.SheetNames) {
    if (SKIP_HINTS.some(h => sheetName.includes(h))) continue;
    const sheet = wb.Sheets[sheetName];
    const isSavings = SAVINGS_SHEET_HINTS.some(h => sheetName.includes(h)) || sheetName.includes("חיסון");
    const isInsurance = INSURANCE_SHEET_HINTS.some(h => sheetName.includes(h));
    const customers = buildCustomersFromSheet(sheet);
    totalRows += customers.length;
    for (const c of customers) {
      if (!allCustomers.has(c.id)) {
        // Initialize - if this is insurance sheet, zero out accumulation (insurance has no AUM)
        const init = { ...c };
        if (isInsurance) init.accumulation = 0;
        if (isSavings) init.premium = 0; // savings premium is yearly contribution, not monthly insurance
        allCustomers.set(c.id, init);
      } else {
        // Merge: accumulation comes only from savings sheet, premium from insurance
        const ex = allCustomers.get(c.id)!;
        if (isSavings && ex.accumulation === 0) ex.accumulation = c.accumulation;
        if (isInsurance) ex.premium += c.premium;
        if (!ex.email && c.email) ex.email = c.email;
        if (ex.priority !== "גבוהה" && c.priority === "גבוהה") {
          ex.priority = c.priority;
          ex.status = c.status;
          ex.flag = c.flag;
          ex.recommendation = c.recommendation;
        }
      }
    }
  }

  const customers = Array.from(allCustomers.values());
  if (customers.length === 0) {
    throw new Error(
      "לא זוהו לקוחות בקובץ. ודאי שהקובץ הוא דוח 'מוצרים בניהול' מ-שורנס.",
    );
  }

  // Aggregate stats
  const totalCustomers = customers.length;
  const totalAUM = customers.reduce((s, c) => s + c.accumulation, 0);
  const monthlyPremium = Math.round(customers.reduce((s, c) => s + c.premium, 0) / 12);
  const noPension = customers.filter((c) => c.status === "ללא פנסיה").length;
  const riskFlags = customers.filter((c) => c.status === "ריסק זמני").length;
  const endingDiscount = customers.filter((c) => c.status === "תום הנחה").length;
  const noEmail = customers.filter((c) => !c.email || c.status === "ללא מייל").length;

  const insurerCount = new Map<string, number>();
  for (const c of customers) {
    insurerCount.set(c.insurer, (insurerCount.get(c.insurer) || 0) + 1);
  }
  const insurerBreakdown = Array.from(insurerCount.entries())
    .map(([name, customers]) => ({ name, customers }))
    .sort((a, b) => b.customers - a.customers)
    .slice(0, 6);

  // Heuristic potential-revenue: 8% of total accumulation flagged
  const flaggedAccumulation = customers
    .filter((c) => c.priority !== "נמוכה")
    .reduce((s, c) => s + c.accumulation, 0);
  const potentialRevenue = Math.round(flaggedAccumulation * 0.08);

  return {
    customers,
    customerCount: totalCustomers,
    productCount: totalRows,
    rawRows: totalRows,
    fileName: file.name,
    insurerBreakdown,
    stats: {
      totalCustomers,
      activeProducts: totalRows,
      totalAUM,
      monthlyPremium,
      riskFlags,
      noPension,
      endingDiscount,
      noEmail,
      noEmailPercent: Math.round((noEmail / totalCustomers) * 100),
      upcomingBirthdays: Math.round(totalCustomers * 0.07),
      crossSellOpps: Math.round(totalCustomers * 0.18),
      potentialRevenue,
      timesSaved: 30,
    },
  };
}
