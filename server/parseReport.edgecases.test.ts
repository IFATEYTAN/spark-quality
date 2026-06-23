// Edge-case matrix for parseSurenseReport — "reality is dirty" guardrails.
//
// The happy-path demo (parseReport.fixture.test.ts) proves every trigger fires
// on a clean, engineered 04/2026 export. These tests do the opposite: they feed
// the parser the malformed / unexpected inputs a real agency upload will sooner
// or later contain, and lock in GRACEFUL behavior — a clear Hebrew error, silent
// trigger-skip, or correct dedupe — so a future mapping change can't regress
// into a crash or a wrong KPI without a test going red.
//
// All inputs are fabricated in-code with SheetJS (no real client data).
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseSurenseReport } from "../client/src/lib/parseReport";

type Row = Record<string, unknown>;

/** Build a workbook from named sheets. First sheet whose name contains a
 * savings keyword (חיסכון/גמל/השתלמות/פנסיה) is the one the parser reads. */
function makeWorkbook(sheets: { name: string; rows: Row[] }[]): File {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "edge.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function savings(rows: Row[]): File {
  return makeWorkbook([{ name: "מוצרי חיסכון", rows }]);
}

/** A "מוצרי חיסכון" sheet with a header row but ZERO data rows — what an empty
 * Surense export actually looks like (json_to_sheet([]) builds an invalid range). */
function headerOnlySavings(): File {
  const ws = XLSX.utils.aoa_to_sheet([["מספר ת.ז", "צבירה", "סטטוס מוצר"]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "מוצרי חיסכון");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "edge.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Canonical savings row. Overridable per-test. */
const row = (over: Row = {}): Row => ({
  "מספר ת.ז": "300000001",
  "שם פרטי": "בדיקה",
  "שם משפחה": "קצה",
  "תאריך לידה": "01/01/1980",
  "סלולרי": "0500000000",
  'דוא"ל': "edge@test.co.il",
  "סוג מוצר": "קופת גמל להשקעה",
  "מוצר": "מגדל גמל",
  "מס' חשבון/פוליסה": "P-1",
  "יצרן": "מגדל",
  "סטטוס מוצר": "פעיל",
  "מעמד": "שכיר",
  "צבירה": 200_000,
  "הפקדה אחרונה": 1_000,
  "תאריך הצטרפות למוצר": "01/01/2018",
  "דמי ניהול מצבירה": "0.300%",
  "דמי ניהול מהפקדה": "1.000%",
  ...over,
});

describe("parseSurenseReport · edge-case matrix (dirty inputs)", () => {
  it("דוח ללא גיליון 'מוצרי חיסכון' → שגיאה ברורה בעברית, לא קריסה", async () => {
    const file = makeWorkbook([{ name: "Sheet1", rows: [{ a: 1 }] }]);
    await expect(parseSurenseReport(file)).rejects.toThrow(/מוצרי חיסכון/);
  });

  it("גיליון חיסכון ללא שורות נתונים → שגיאת 'לא זוהו לקוחות'", async () => {
    await expect(parseSurenseReport(headerOnlySavings())).rejects.toThrow(/לא זוהו לקוחות/);
  });

  it("גרסת ייצוא ישנה (ללא עמודות מינוי) → שאר הטריגרים עובדים, T1/T2 מדלגים בשקט", async () => {
    // No "תאריך תום תוקף מינוי סוכן" column at all — the appointment KPIs must
    // be 0 (skipped), while a VIP (≥1M) still gets flagged.
    const r = await parseSurenseReport(
      savings([row({ "מספר ת.ז": "300000010", "צבירה": 1_500_000 })]),
    );
    expect(r.stats.appointmentExpired).toBe(0);
    expect(r.stats.appointmentExpiring90d).toBe(0);
    expect(r.stats.vipCustomers).toBeGreaterThanOrEqual(1);
    expect(r.customerCount).toBe(1);
  });

  it("לקוח כפול (אותה ת\"ז בשתי שורות) → מתאחד לשורה אחת, צבירה מסוכמת", async () => {
    const r = await parseSurenseReport(
      savings([
        row({ "מספר ת.ז": "300000020", "צבירה": 200_000, "מס' חשבון/פוליסה": "P-A" }),
        row({ "מספר ת.ז": "300000020", "צבירה": 300_000, "מס' חשבון/פוליסה": "P-B" }),
      ]),
    );
    expect(r.customerCount).toBe(1);
    expect(r.customers[0].accumulation).toBe(500_000);
  });

  it("ערכים קיצוניים ושליליים (clawback) → אין NaN, הספירה תקינה", async () => {
    const r = await parseSurenseReport(
      savings([
        row({ "מספר ת.ז": "300000030", "צבירה": 5_000_000_000 }),
        row({ "מספר ת.ז": "300000031", "צבירה": -50_000 }),
      ]),
    );
    expect(r.customerCount).toBe(2);
    expect(Number.isFinite(r.stats.totalAUM)).toBe(true);
    for (const c of r.customers) expect(Number.isFinite(c.accumulation)).toBe(true);
    expect(r.stats.vipCustomers).toBeGreaterThanOrEqual(1); // the 5B client
  });

  it("ת\"ז עם אפס מוביל → נשמרת כמחרוזת (לא נחתכת למספר)", async () => {
    const r = await parseSurenseReport(
      savings([row({ "מספר ת.ז": "012345678" })]),
    );
    expect(r.customerCount).toBe(1);
    expect(String(r.customers[0].id)).toBe("012345678");
  });

  it("תאריך לידה כ-Excel serial → מומר לגיל סביר (תיקון toDate החדש)", async () => {
    // 25000 ≈ 1968-06 → age ~58 in 2026; must NOT fall back to the 40 default.
    const r = await parseSurenseReport(
      savings([row({ "מספר ת.ז": "300000040", "תאריך לידה": 25_000 })]),
    );
    expect(r.customerCount).toBe(1);
    expect(r.customers[0].age).toBeGreaterThan(50);
    expect(r.customers[0].age).toBeLessThan(66);
  });

  it("נרמול מעמד מגדרי — 'עצמאית' נספרת כעצמאי (T11)", async () => {
    const r = await parseSurenseReport(
      savings([
        row({ "מספר ת.ז": "300000050", "מעמד": "עצמאית", "הפקדה אחרונה": 0 }),
      ]),
    );
    expect(r.stats.selfEmployedNoDeposit).toBeGreaterThanOrEqual(1);
  });
});
