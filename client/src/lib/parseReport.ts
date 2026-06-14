// Editorial Fintech | Parse Shorens "Products in Management" report
// Aligned with the official surense-analyzer skill spec (v2.0).
// Covers the three real sheets that contain customer-level data:
//   • גיליון 3 — מוצרי חיסכון (41 columns) — primary AUM source
//   • גיליון 5 — מוצרי ביטוח (28 columns) — premium source
//   • גיליון 6 — מוצרי ביטוח (כיסויים) (30 columns) — coverage-level details
// Aggregate sheets (1, 2) and the investment-tracks sheet (4) are skipped.
import * as XLSX from "xlsx";
import type { Customer } from "./demoData";

/**
 * A single policy row extracted from the report, keyed back to its client by
 * `idNumber`. Persisted server-side (table `policies`) so the 16-trigger engine
 * (`computeWorkspaceFlags`) has real per-policy data to work with — without it,
 * coverage/risk/concentration/frozen triggers run on empty input.
 */
export interface ParsedPolicy {
  idNumber: string;
  productType: string;
  company: string;
  policyNumber: string;
  monthlyPremium: number;
  annualPremium: number;
  balance: number;
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  status: "active" | "inactive" | "cancelled" | "expired";
}

export interface ParsedReport {
  customers: Customer[];
  policies: ParsedPolicy[];
  customerCount: number;
  productCount: number;
  rawRows: number;
  fileName: string;
  insurerBreakdown: { name: string; customers: number }[];
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
    vipCustomers: number;
    liquidFunds: number;
    liquidAUM: number;
    amendment190: number;
    lowYield: number;
    coverageGaps: number;
    // New skill-aligned KPIs
    appointmentExpired: number;
    appointmentExpiring90d: number;
    inactiveWithBalance: number;
    inactiveBalanceTotal: number;
    highFeesAnnualCost: number;
    noNursing46plus: number;
    selfEmployedNoDeposit: number;
    trackAgeMismatch: number;
    insuranceClients: number;
  };
}

// ---- helpers --------------------------------------------------------------

const HE = (s: any) => String(s ?? "").trim();

// Pension product types per skill spec
const PENSION_PRODUCT_TYPES = [
  "קרן פנסיה חדשה מקיפה",
  "קרן פנסיה חדשה כללית",
  "ביטוח מנהלים",
  "מנהלים חיסכון טהור",
];

// Risk-zmani exact statuses (skill spec)
const RISK_ZMANI_STATUSES = ["ריסק זמני", "ריסק זמני אוטומטי"];

// Self-employed statuses (skill spec)
const SELF_EMPLOYED_STATUSES = ["עצמאי", "בעל שליטה"];

// Header normalization: removes punctuation, quotes, geresh/gershayim, whitespace
function normHeader(s: string): string {
  return s
    .replace(/["׳״'\.\(\)\[\]\s\u05BE-]/g, "")
    .replace(/\u200f|\u200e|\u202a|\u202b|\u202c/g, "")
    .toLowerCase();
}

// Find the first column whose normalized header CONTAINS any normalized candidate.
function findCol(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => normHeader(HE(h)));
  for (const c of candidates) {
    const cn = normHeader(c);
    const idx = normalized.findIndex((h) => h.includes(cn));
    if (idx !== -1) return idx;
  }
  return -1;
}

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
  const n = parseFloat(String(v).replace(/[,₪\s%]/g, ""));
  return isNaN(n) ? 0 : n;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Excel sometimes returns a string like "2023-05-30" or "30/05/2023"
  const s = String(v).trim();
  if (!s) return null;
  // Try ISO first
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = parseInt(m[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

// Map a Hebrew product status to the policies.status enum used by the trigger
// engine. Unknown / "פעיל" / "ריסק זמני" → active (so they are counted).
function mapPolicyStatus(he: string): "active" | "inactive" | "cancelled" | "expired" {
  const s = HE(he);
  if (!s) return "active";
  if (s.includes("מבוטל")) return "cancelled";
  if (s.includes("פג") || s.includes("הסתיים") || s.includes("הופסק")) return "expired";
  if (s.includes("לא פעיל")) return "inactive";
  return "active";
}

function ageFromBirth(birth: Date | null, fallback: number): number {
  if (!birth) return fallback || 40;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 && age < 120 ? age : fallback || 40;
}

// Days from today to a future date. Negative means already past.
function daysFromToday(d: Date | null): number | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ---- internal row models --------------------------------------------------

interface SavingsRow {
  insurer: string;
  productType: string;     // סוג מוצר
  product: string;          // מוצר
  policyNumber: string;     // מס' חשבון/פוליסה
  firstName: string;
  lastName: string;
  id: string;               // מספר ת.ז
  phone: string;
  email: string;
  birthDate: Date | null;
  ageRaw: number;
  city: string;
  classification: string;   // סיווג לקוח (זהב / פרימיום)
  status: string;           // סטטוס מוצר
  joinDate: Date | null;    // תאריך הצטרפות למוצר
  employment: string;        // מעמד
  savings: number;          // צבירה
  lastDeposit: number;      // הפקדה אחרונה
  dmHafkada: number;        // דמי ניהול מהפקדה
  dmTzvirah: number;        // דמי ניהול מצבירה
  agentNumber: string;
  appointmentEnd: Date | null; // תאריך תום תוקף מינוי סוכן
}

interface InsuranceRow {
  id: string;               // מספר ת.ז
  productType: string;
  premium: number;          // סה"כ פרמיה
  status: string;
  appointmentEnd: Date | null;
}

interface CoverageRow {
  id: string;
  policyNumber: string;
  coverageType: string;     // סוג כיסוי
  coverageEnd: Date | null; // תאריך תום כיסוי
}

// ---- sheet parsers --------------------------------------------------------

function parseSavingsSheet(sheet: XLSX.WorkSheet): SavingsRow[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  if (rows.length < 2) return [];
  const headers = rows[0].map(HE);

  const idx = {
    insurer: findCol(headers, ["יצרן"]),
    productType: findCol(headers, ["סוג מוצר"]),
    product: findCol(headers, ["מוצר"]),
    policyNumber: findCol(headers, ["מס' חשבון", "מספר חשבון", "פוליסה"]),
    firstName: findCol(headers, ["שם פרטי"]),
    lastName: findCol(headers, ["שם משפחה"]),
    id: findCol(headers, ["מספר ת.ז", "ת.ז", "תעודת זהות"]),
    phone: findCol(headers, ["סלולרי", "נייד", "טלפון"]),
    email: findCol(headers, ['דוא"ל', "דואל", "מייל", "email"]),
    birthDate: findCol(headers, ["תאריך לידה"]),
    age: findCol(headers, ["גיל"]),
    city: findCol(headers, ["יישוב", "ישוב", "עיר"]),
    classification: findCol(headers, ["סיווג לקוח"]),
    status: findCol(headers, ["סטטוס מוצר", "סטטוס"]),
    joinDate: findCol(headers, ["תאריך הצטרפות למוצר", "תאריך הצטרפות"]),
    employment: findCol(headers, ["מעמד"]),
    savings: findCol(headers, ["צבירה"]),
    lastDeposit: findCol(headers, ["הפקדה אחרונה"]),
    dmHafkada: findCol(headers, ["דמי ניהול מהפקדה"]),
    dmTzvirah: findCol(headers, ["דמי ניהול מצבירה"]),
    agentNumber: findCol(headers, ["מספר סוכן"]),
    appointmentEnd: findCol(headers, [
      "תאריך תום תוקף מינוי סוכן",
      "תום תוקף מינוי",
    ]),
  };

  const out: SavingsRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => HE(c) === "")) continue;
    const id = idx.id !== -1 ? HE(row[idx.id]) : `R${r}`;
    const firstName = idx.firstName !== -1 ? HE(row[idx.firstName]) : "";
    const lastName = idx.lastName !== -1 ? HE(row[idx.lastName]) : "";
    if (!id && !firstName && !lastName) continue;
    out.push({
      insurer: idx.insurer !== -1
        ? HE(row[idx.insurer]).replace(/חברה לביטוח בע"מ|בע"מ/g, "").trim()
        : "—",
      productType: idx.productType !== -1 ? HE(row[idx.productType]) : "",
      product: idx.product !== -1 ? HE(row[idx.product]) : "",
      policyNumber: idx.policyNumber !== -1 ? HE(row[idx.policyNumber]) : "",
      firstName,
      lastName,
      id: id || `R${r}`,
      phone: idx.phone !== -1 ? normalizePhone(row[idx.phone]) : "",
      email: idx.email !== -1 ? HE(row[idx.email]) : "",
      birthDate: idx.birthDate !== -1 ? toDate(row[idx.birthDate]) : null,
      ageRaw: idx.age !== -1 ? Math.round(toNumber(row[idx.age])) : 0,
      city: idx.city !== -1 ? HE(row[idx.city]) : "",
      classification: idx.classification !== -1 ? HE(row[idx.classification]) : "",
      status: idx.status !== -1 ? HE(row[idx.status]) : "",
      joinDate: idx.joinDate !== -1 ? toDate(row[idx.joinDate]) : null,
      employment: idx.employment !== -1 ? HE(row[idx.employment]) : "",
      savings: idx.savings !== -1 ? toNumber(row[idx.savings]) : 0,
      lastDeposit: idx.lastDeposit !== -1 ? toNumber(row[idx.lastDeposit]) : 0,
      dmHafkada: idx.dmHafkada !== -1 ? toNumber(row[idx.dmHafkada]) : 0,
      dmTzvirah: idx.dmTzvirah !== -1 ? toNumber(row[idx.dmTzvirah]) : 0,
      agentNumber: idx.agentNumber !== -1 ? HE(row[idx.agentNumber]) : "",
      appointmentEnd: idx.appointmentEnd !== -1 ? toDate(row[idx.appointmentEnd]) : null,
    });
  }
  return out;
}

function parseInsuranceSheet(sheet: XLSX.WorkSheet): InsuranceRow[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  if (rows.length < 2) return [];
  const headers = rows[0].map(HE);
  const idx = {
    id: findCol(headers, ["מספר ת.ז", "ת.ז"]),
    productType: findCol(headers, ["סוג מוצר"]),
    premium: findCol(headers, ['סה"כ פרמיה', "סהכ פרמיה", "פרמיה"]),
    status: findCol(headers, ["סטטוס מוצר", "סטטוס"]),
    appointmentEnd: findCol(headers, [
      "תאריך תום תוקף מינוי סוכן",
      "תום תוקף מינוי",
    ]),
  };
  const out: InsuranceRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => HE(c) === "")) continue;
    const id = idx.id !== -1 ? HE(row[idx.id]) : "";
    if (!id) continue;
    out.push({
      id,
      productType: idx.productType !== -1 ? HE(row[idx.productType]) : "",
      premium: idx.premium !== -1 ? toNumber(row[idx.premium]) : 0,
      status: idx.status !== -1 ? HE(row[idx.status]) : "",
      appointmentEnd: idx.appointmentEnd !== -1 ? toDate(row[idx.appointmentEnd]) : null,
    });
  }
  return out;
}

function parseCoverageSheet(sheet: XLSX.WorkSheet): CoverageRow[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  if (rows.length < 2) return [];
  const headers = rows[0].map(HE);
  const idx = {
    id: findCol(headers, ["מספר ת.ז", "ת.ז"]),
    policyNumber: findCol(headers, ["מס' חשבון", "מספר חשבון", "פוליסה"]),
    coverageType: findCol(headers, ["סוג כיסוי"]),
    coverageEnd: findCol(headers, ["תאריך תום כיסוי", "תום כיסוי"]),
  };
  const out: CoverageRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => HE(c) === "")) continue;
    const id = idx.id !== -1 ? HE(row[idx.id]) : "";
    if (!id) continue;
    out.push({
      id,
      policyNumber: idx.policyNumber !== -1 ? HE(row[idx.policyNumber]) : "",
      coverageType: idx.coverageType !== -1 ? HE(row[idx.coverageType]) : "",
      coverageEnd: idx.coverageEnd !== -1 ? toDate(row[idx.coverageEnd]) : null,
    });
  }
  return out;
}

// ---- sheet detection ------------------------------------------------------

function detectSheets(wb: XLSX.WorkBook) {
  let savingsName: string | null = null;
  let insuranceName: string | null = null;
  let coverageName: string | null = null;

  for (const name of wb.SheetNames) {
    if (name.includes("מסכם") || name.includes("מסלול")) continue;
    const isCoverage = name.includes("כיסוי");
    const isInsurance = !isCoverage && name.includes("ביטוח");
    const isSavings =
      !isInsurance &&
      !isCoverage &&
      (name.includes("חיסכון") ||
        name.includes("חסכון") ||
        name.includes("פנסיה") ||
        name.includes("גמל") ||
        name.includes("השתלמות"));

    if (isSavings && !savingsName) savingsName = name;
    if (isInsurance && !insuranceName) insuranceName = name;
    if (isCoverage && !coverageName) coverageName = name;
  }
  return { savingsName, insuranceName, coverageName };
}

// ---- aggregation + classification ----------------------------------------

interface Aggregate {
  // identity
  id: string;
  name: string;
  age: number;
  birthDate: Date | null;
  city: string;
  phone: string;
  email: string | null;
  classification: string;
  employment: string;
  // financial
  insurer: string;
  productLabel: string;
  productTypes: Set<string>;
  savings: number;
  monthlyPremium: number; // sum of yearly premium / 12 from insurance sheet
  // operational signals
  hasInsurancePolicy: boolean;
  hasNursingCoverage: boolean;
  earliestAppointmentEnd: Date | null;
  inactiveBalance: number;       // savings on inactive products
  hasInactiveProduct: boolean;
  maxDmTzvirah: number;
  maxDmHafkada: number;
  hasRiskZmani: boolean;
  hasZeroDeposits: boolean;
  hasEquityTrack: boolean;       // T10 — placeholder, requires sheet 4
  joinDates: Date[];
}

function emptyAgg(s: SavingsRow): Aggregate {
  const fullName = `${s.firstName} ${s.lastName}`.trim() || `לקוח ${s.id.slice(-4)}`;
  return {
    id: s.id,
    name: fullName,
    age: ageFromBirth(s.birthDate, s.ageRaw),
    birthDate: s.birthDate,
    city: s.city || "—",
    phone: s.phone || "",
    email: s.email || null,
    classification: s.classification || "",
    employment: s.employment || "",
    insurer: s.insurer || "—",
    productLabel: `${s.insurer} - ${s.productType || s.product}`.replace(/^\s*-\s*/, ""),
    productTypes: new Set<string>(),
    savings: 0,
    monthlyPremium: 0,
    hasInsurancePolicy: false,
    hasNursingCoverage: false,
    earliestAppointmentEnd: null,
    inactiveBalance: 0,
    hasInactiveProduct: false,
    maxDmTzvirah: 0,
    maxDmHafkada: 0,
    hasRiskZmani: false,
    hasZeroDeposits: true,
    hasEquityTrack: false,
    joinDates: [],
  };
}

function mergeSavings(a: Aggregate, s: SavingsRow) {
  a.savings += s.savings;
  if (s.productType) a.productTypes.add(s.productType);
  if (s.dmTzvirah > a.maxDmTzvirah) a.maxDmTzvirah = s.dmTzvirah;
  if (s.dmHafkada > a.maxDmHafkada) a.maxDmHafkada = s.dmHafkada;
  if (RISK_ZMANI_STATUSES.includes(s.status)) a.hasRiskZmani = true;
  if (s.status === "לא פעיל") {
    a.hasInactiveProduct = true;
    a.inactiveBalance += s.savings;
  }
  if (s.lastDeposit > 0) a.hasZeroDeposits = false;
  if (s.appointmentEnd) {
    if (!a.earliestAppointmentEnd || s.appointmentEnd < a.earliestAppointmentEnd) {
      a.earliestAppointmentEnd = s.appointmentEnd;
    }
  }
  if (s.joinDate) a.joinDates.push(s.joinDate);
  if (!a.email && s.email) a.email = s.email;
  if (!a.phone && s.phone) a.phone = s.phone;
  if (!a.classification && s.classification) a.classification = s.classification;
  if (!a.employment && s.employment) a.employment = s.employment;
}

function applyInsurance(a: Aggregate, ins: InsuranceRow) {
  a.hasInsurancePolicy = true;
  a.monthlyPremium += ins.premium / 12;
  if (ins.productType.includes("סיעוד")) a.hasNursingCoverage = true;
  // T2 — risk-zmani can come from either the savings sheet OR an insurance row
  // whose product status equals one of the risk-zmani statuses.
  if (RISK_ZMANI_STATUSES.includes(ins.status)) a.hasRiskZmani = true;
  if (ins.appointmentEnd) {
    if (!a.earliestAppointmentEnd || ins.appointmentEnd < a.earliestAppointmentEnd) {
      a.earliestAppointmentEnd = ins.appointmentEnd;
    }
  }
}

function applyCoverage(a: Aggregate, cov: CoverageRow) {
  if (cov.coverageType === "סיעודי") a.hasNursingCoverage = true;
}

// Map an aggregated customer to a Customer + flagStatus per the 7 demo buckets.
function classifyAggregate(a: Aggregate): Customer & { flagStatus: string; isVip: boolean; birthDate: string | null } {
  const productLabel = a.productLabel || "—";
  const hasPension = Array.from(a.productTypes).some((t) => PENSION_PRODUCT_TYPES.includes(t));
  const isSelfEmployed = SELF_EMPLOYED_STATUSES.includes(a.employment);
  const liquidYearsOk = a.joinDates.some((d) => {
    const years = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return years >= 6;
  });
  const isLiquidFund = liquidYearsOk &&
    Array.from(a.productTypes).some((t) => t.includes("השתלמות"));

  // Choose the strongest flag in priority order
  let status: Customer["status"] = "פעיל";
  let priority: Customer["priority"] = "נמוכה";
  let flag = "תיק פעיל תקין";
  let recommendation = "סקירה תקופתית · ללא פעולה דחופה";
  let flagStatus: string = "regular";
  let isVip = false;

  // VIP — totalSavings >= 1M OR classification in זהב/פרימיום
  if (a.savings >= 1_000_000 || ["זהב", "פרימיום"].includes(a.classification)) {
    status = "VIP"; priority = "גבוהה";
    flag = a.classification ? `סיווג ${a.classification}` : "לקוח עתיר נכסים (≥ 1M ₪)";
    recommendation = "פגישת תכנון פיננסי שנתית — priority";
    flagStatus = "vip";
    isVip = true;
  }
  // Risk zmani (overrides regular but not VIP for status badge — but flagStatus prioritises risk first)
  if (a.hasRiskZmani) {
    status = "ריסק זמני"; priority = "גבוהה";
    flag = "ריסק זמני פעיל — דורש פנייה תוך 48 שעות";
    recommendation = "טלפון תוך 48 שעות + הצעה לכיסוי קבע";
    flagStatus = "risk_ending";
  }
  // Tikun 190 — age 60+ and savings >= 300K and not in pension product
  // Lower priority than VIP / risk_zmani — don't override those.
  if (
    a.age >= 60 && a.savings >= 300_000 && !hasPension &&
    flagStatus !== "risk_ending" && flagStatus !== "vip"
  ) {
    status = "תיקון 190"; priority = "גבוהה";
    flag = "פוטנציאל להפקדה לפי תיקון 190";
    recommendation = "ייעוץ משיכה הונית vs קצבתית";
    flagStatus = "tikun_190";
  }
  // Liquid fund — שווה ערך ל-T (קרן השתלמות נזילה)
  if (isLiquidFund && flagStatus === "regular") {
    status = "השתלמות נזילה"; priority = "גבוהה";
    flag = "קרן השתלמות נזילה";
    recommendation = "שיחת ייעוץ — מה לעשות עם הכסף";
    flagStatus = "liquid_fund";
  }
  // High fees — only when nothing higher priority matched.
  if (
    flagStatus === "regular" &&
    (a.maxDmTzvirah > 0.007 || a.maxDmHafkada > 0.015)
  ) {
    status = "תשואה חלשה"; priority = "בינונית";
    flag = `דמי ניהול גבוהים (עד ${(a.maxDmTzvirah * 100).toFixed(2)}% מצבירה)`;
    recommendation = "פגישת שימור — הוזלת דמי ניהול";
    flagStatus = "high_fees";
  }
  // Coverage gap — no pension AND no insurance
  if (!hasPension && !a.hasInsurancePolicy && flagStatus === "regular") {
    status = "ללא פנסיה"; priority = "בינונית";
    flag = "אין פנסיה ואין ביטוח בניהול";
    recommendation = "פגישה מקיפה — לבנות תיק מאפס";
    flagStatus = "coverage_gaps";
  }
  // No pension only
  if (!hasPension && flagStatus === "regular") {
    status = "ללא פנסיה"; priority = "בינונית";
    flag = "אין מוצר פנסיוני פעיל";
    recommendation = "הזדמנות אאפסל — קרן פנסיה מקיפה";
    flagStatus = "coverage_gaps";
  }
  // No nursing 46+
  if (a.age >= 46 && !a.hasNursingCoverage && flagStatus === "regular") {
    status = "ללא פנסיה"; priority = "בינונית";
    flag = "גיל 46+ ללא ביטוח סיעודי";
    recommendation = "הצעה לרכישת סיעודי — לפני 60 הפרמיה נגישה";
    flagStatus = "coverage_gaps";
  }
  // Self-employed no deposit
  if (isSelfEmployed && a.hasZeroDeposits && flagStatus === "regular") {
    status = "תשואה חלשה"; priority = "בינונית";
    flag = `${a.employment} ללא הפקדה אחרונה`;
    recommendation = "פגישה — חשיפת מס + השלמה לפרישה";
    flagStatus = "high_fees"; // surfaced in same admin bucket
  }
  // Inactive with balance
  if (a.hasInactiveProduct && a.inactiveBalance > 30_000 && flagStatus === "regular") {
    status = "תשואה חלשה"; priority = "בינונית";
    flag = `מוצר לא פעיל עם צבירה ₪${Math.round(a.inactiveBalance).toLocaleString("he-IL")}`;
    recommendation = "האם עזב מעסיק? שכח? מעוניין לאחד?";
    flagStatus = "high_fees";
  }
  // Appointment expired / expiring (overrides everything except VIP for badge — but is most important operationally)
  const apptDays = daysFromToday(a.earliestAppointmentEnd);
  if (apptDays !== null) {
    if (apptDays < 0) {
      // Map agent-appointment expired to ריסק זמני so it surfaces in the same
      // P0/P1 bucket without expanding the demo Customer status enum.
      status = "ריסק זמני"; priority = "גבוהה";
      flag = `מינוי סוכן פג לפני ${Math.abs(apptDays)} ימים — לא מוסמך לפעול`;
      recommendation = "חידוש דיגיטלי מיידי — וואטסאפ + OTP + חתימה";
      if (flagStatus !== "vip") flagStatus = "risk_ending";
    } else if (apptDays <= 90 && flagStatus === "regular") {
      status = "ריסק זמני"; priority = "גבוהה";
      flag = `מינוי סוכן פוקע בעוד ${apptDays} ימים`;
      recommendation = "פנייה לחידוש לפני שפוקע";
      flagStatus = "risk_ending";
    }
  }
  // No email — soft signal, only when nothing else is set
  if (!a.email && flagStatus === "regular") {
    status = "ללא מייל"; priority = "נמוכה";
    flag = "אין כתובת מייל בתיק";
    recommendation = "השלמת פרטי קשר";
  }

  return {
    id: a.id,
    name: a.name,
    age: a.age,
    city: a.city,
    phone: a.phone || "—",
    email: a.email,
    product: productLabel,
    insurer: a.insurer,
    premium: Math.round(a.monthlyPremium),
    accumulation: Math.round(a.savings),
    lastPayment: a.joinDates[0]
      ? a.joinDates[0].toISOString().slice(0, 10)
      : "",
    status,
    priority,
    flag,
    recommendation,
    flagStatus,
    isVip,
    birthDate: a.birthDate ? a.birthDate.toISOString() : null,
  } as Customer & { flagStatus: string; isVip: boolean; birthDate: string | null };
}

// ---- public entry ---------------------------------------------------------

export async function parseShorensReport(file: File): Promise<ParsedReport> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });

  const { savingsName, insuranceName, coverageName } = detectSheets(wb);

  if (!savingsName) {
    throw new Error(
      'לא נמצא גיליון "מוצרי חיסכון" בקובץ. ודאי שזה דוח "מוצרים בניהול" של שורנס.',
    );
  }

  const savings = parseSavingsSheet(wb.Sheets[savingsName]);
  const insurance = insuranceName ? parseInsuranceSheet(wb.Sheets[insuranceName]) : [];
  const coverages = coverageName ? parseCoverageSheet(wb.Sheets[coverageName]) : [];

  // Aggregate per customer (id)
  const agg = new Map<string, Aggregate>();
  for (const s of savings) {
    if (!agg.has(s.id)) agg.set(s.id, emptyAgg(s));
    mergeSavings(agg.get(s.id)!, s);
  }
  for (const ins of insurance) {
    if (!agg.has(ins.id)) continue; // insurance-only customers without savings are out of scope for AUM dashboard
    applyInsurance(agg.get(ins.id)!, ins);
  }
  for (const cov of coverages) {
    if (!agg.has(cov.id)) continue;
    applyCoverage(agg.get(cov.id)!, cov);
  }

  const customers: (Customer & { flagStatus?: string; isVip?: boolean })[] =
    Array.from(agg.values()).map((a) => classifyAggregate(a));

  if (customers.length === 0) {
    throw new Error('לא זוהו לקוחות בגיליון "מוצרי חיסכון". בדקי שהקובץ תקין.');
  }

  // ---- per-policy rows (persisted for the trigger engine) ----------------
  // Only emit policies whose client is in the aggregate map (so they map to a
  // saved client row). For savings products we use lastDeposit as a deposit
  // proxy for monthlyPremium so the "frozen fund" / "self-employed no deposit"
  // triggers fire only when there is genuinely no recent deposit.
  const policies: ParsedPolicy[] = [];
  for (const s of savings) {
    if (!agg.has(s.id)) continue;
    policies.push({
      idNumber: s.id,
      productType: s.productType || s.product || "",
      company: s.insurer || "",
      policyNumber: s.policyNumber || "",
      monthlyPremium: s.lastDeposit > 0 ? Math.round(s.lastDeposit) : 0,
      annualPremium: 0,
      balance: Math.round(s.savings),
      startDate: s.joinDate ? s.joinDate.toISOString() : null,
      endDate: null,
      status: mapPolicyStatus(s.status),
    });
  }
  for (const ins of insurance) {
    if (!agg.has(ins.id)) continue;
    policies.push({
      idNumber: ins.id,
      productType: ins.productType || "",
      company: "",
      policyNumber: "",
      monthlyPremium: Math.round((ins.premium / 12) * 100) / 100,
      annualPremium: Math.round(ins.premium * 100) / 100,
      balance: 0,
      startDate: null,
      endDate: null,
      status: mapPolicyStatus(ins.status),
    });
  }
  for (const cov of coverages) {
    if (!agg.has(cov.id)) continue;
    policies.push({
      idNumber: cov.id,
      productType: cov.coverageType || "",
      company: "",
      policyNumber: cov.policyNumber || "",
      monthlyPremium: 0,
      annualPremium: 0,
      balance: 0,
      startDate: null,
      endDate: cov.coverageEnd ? cov.coverageEnd.toISOString() : null,
      status: "active",
    });
  }

  // ---- KPIs aligned with the skill spec ---------------------------------
  const totalCustomers = customers.length;
  const totalAUM = customers.reduce((s, c) => s + c.accumulation, 0);
  const monthlyPremium = customers.reduce((s, c) => s + c.premium, 0);
  const insuranceClients = Array.from(agg.values()).filter((a) => a.hasInsurancePolicy).length;

  const aggArr = Array.from(agg.values());

  const appointmentExpired = aggArr.filter((a) => {
    const d = daysFromToday(a.earliestAppointmentEnd);
    return d !== null && d < 0;
  }).length;
  const appointmentExpiring90d = aggArr.filter((a) => {
    const d = daysFromToday(a.earliestAppointmentEnd);
    return d !== null && d >= 0 && d <= 90;
  }).length;
  const riskFlags = aggArr.filter((a) => a.hasRiskZmani).length;
  const noPension = aggArr.filter((a) =>
    !Array.from(a.productTypes).some((t) => PENSION_PRODUCT_TYPES.includes(t)),
  ).length;
  const inactiveWithBalance = aggArr.filter((a) => a.hasInactiveProduct && a.inactiveBalance > 30_000).length;
  const inactiveBalanceTotal = aggArr.reduce(
    (s, a) => (a.hasInactiveProduct ? s + a.inactiveBalance : s),
    0,
  );
  const lowYield = aggArr.filter((a) => a.maxDmTzvirah > 0.007 || a.maxDmHafkada > 0.015).length;
  const highFeesAnnualCost = Math.round(
    aggArr
      .filter((a) => a.maxDmTzvirah > 0.007)
      .reduce((s, a) => s + a.savings * a.maxDmTzvirah, 0),
  );
  const noNursing46plus = aggArr.filter((a) => a.age >= 46 && !a.hasNursingCoverage).length;
  const selfEmployedNoDeposit = aggArr.filter(
    (a) => SELF_EMPLOYED_STATUSES.includes(a.employment) && a.hasZeroDeposits,
  ).length;
  const vipCustomers = customers.filter((c) => (c as any).isVip).length;
  const noEmail = customers.filter((c) => !c.email).length;
  const liquidFundsArr = customers.filter((c) => c.status === "השתלמות נזילה");
  const liquidFunds = liquidFundsArr.length;
  const liquidAUM = liquidFundsArr.reduce((s, c) => s + c.accumulation, 0);
  const amendment190 = customers.filter((c) => c.status === "תיקון 190").length;

  // Birthday this month
  const today = new Date();
  const upcomingBirthdays = aggArr.filter(
    (a) => a.birthDate && a.birthDate.getMonth() === today.getMonth(),
  ).length;

  // Insurer breakdown
  const insurerCount = new Map<string, number>();
  for (const a of aggArr) insurerCount.set(a.insurer, (insurerCount.get(a.insurer) || 0) + 1);
  const insurerBreakdown = Array.from(insurerCount.entries())
    .map(([name, count]) => ({ name, customers: count }))
    .sort((a, b) => b.customers - a.customers)
    .slice(0, 6);

  // Potential revenue heuristic — 8% of savings flagged as actionable
  const potentialRevenue = Math.round(
    aggArr
      .filter((a) => a.maxDmTzvirah > 0.007 || a.hasRiskZmani || a.hasInactiveProduct)
      .reduce((s, a) => s + a.savings, 0) * 0.08,
  );

  return {
    customers: customers as Customer[],
    policies,
    customerCount: totalCustomers,
    productCount: savings.length + insurance.length,
    rawRows: savings.length + insurance.length + coverages.length,
    fileName: file.name,
    insurerBreakdown,
    stats: {
      totalCustomers,
      activeProducts: savings.length + insurance.length,
      totalAUM,
      monthlyPremium,
      riskFlags,
      noPension,
      endingDiscount: 0,
      noEmail,
      noEmailPercent: Math.round((noEmail / Math.max(totalCustomers, 1)) * 100),
      upcomingBirthdays,
      crossSellOpps: aggArr.filter((a) => a.savings > 0 && !a.hasInsurancePolicy).length,
      potentialRevenue,
      timesSaved: 30,
      vipCustomers,
      liquidFunds,
      liquidAUM,
      amendment190,
      lowYield,
      coverageGaps: aggArr.filter(
        (a) =>
          !Array.from(a.productTypes).some((t) => PENSION_PRODUCT_TYPES.includes(t)) &&
          !a.hasInsurancePolicy,
      ).length,
      appointmentExpired,
      appointmentExpiring90d,
      inactiveWithBalance,
      inactiveBalanceTotal: Math.round(inactiveBalanceTotal),
      highFeesAnnualCost,
      noNursing46plus,
      selfEmployedNoDeposit,
      trackAgeMismatch: 0, // requires sheet 4 (investment tracks) — out of scope for v1
      insuranceClients,
    },
  };
}
