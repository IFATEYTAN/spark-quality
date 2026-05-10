/**
 * Round 90 — these were originally regex-on-source assertions that locked
 * the spelling of SAVINGS_SHEET_HINTS / SKIP_HINTS string arrays. After the
 * Round 90 rewrite, the parser uses a runtime detectSheets() function with
 * substring hints, so we now assert the *behavior* with tiny in-memory
 * workbooks — that's a much stronger guarantee anyway.
 *
 * Round 89 background still applies: an older revision matched the typo
 * "חיסון" (no כ) instead of "חיסכון", so every real Shorens upload silently
 * fell back to the 487M placeholder dashboard. We keep an explicit
 * regression test for that exact scenario.
 */
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseShorensReport } from "../client/src/lib/parseReport";

function makeWorkbook(sheets: { name: string; rows: Record<string, unknown>[] }[]): File {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.rows), s.name);
  }
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "wb.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const savingsRow = (id = "201111111", savings = 250_000) => ({
  "מספר ת.ז": id,
  "שם פרטי": "א",
  "שם משפחה": "ב",
  "תאריך לידה": "01/01/1980",
  "סוג מוצר": "קופת גמל להשקעה",
  "חברה": "מגדל",
  "סטטוס מוצר": "פעיל",
  "סה\"כ צבירה": savings,
  "תאריך הצטרפות": "01/01/2020",
});

describe("parseReport detectSheets behaviour", () => {
  it("recognises the savings sheet under its real Hebrew name (חיסכון with כ)", async () => {
    const file = makeWorkbook([{ name: "מוצרי חיסכון", rows: [savingsRow()] }]);
    const r = await parseShorensReport(file);
    expect(r.customerCount).toBe(1);
    expect(r.stats.totalAUM).toBe(250_000);
  });

  it("regression: rejects the legacy typo (חיסון without כ) — file with that sheet name should fail", async () => {
    // The bug Round 89 fixed: parser used to match "חיסון" instead of "חיסכון",
    // so a workbook with only "מוצרי חיסון" would silently succeed and a real
    // upload (named "מוצרי חיסכון") would fail. Now it should be the opposite:
    // a workbook with ONLY "מוצרי חיסון" and no real Shorens sheet should be rejected.
    const file = makeWorkbook([{ name: "מוצרי חיסון", rows: [savingsRow()] }]);
    await expect(parseShorensReport(file)).rejects.toThrow();
  });

  it("matches insurance + coverage sheets alongside savings", async () => {
    const file = makeWorkbook([
      { name: "מוצרי חיסכון", rows: [savingsRow()] },
      {
        name: "מוצרי ביטוח",
        rows: [{
          "מספר ת.ז": "201111111",
          "סוג מוצר": "ביטוח חיים",
          "סה\"כ פרמיה": 12_000,
          "סטטוס מוצר": "פעיל",
        }],
      },
      {
        name: "מוצרי ביטוח (כיסויים)",
        rows: [{
          "מספר ת.ז": "201111111",
          "מספר פוליסה": "P1",
          "סוג כיסוי": "סיעודי",
        }],
      },
    ]);
    const r = await parseShorensReport(file);
    expect(r.customerCount).toBe(1);
    expect(r.stats.insuranceClients).toBe(1);
  });

  it("skips aggregate / track sheets so they don't double-count AUM", async () => {
    const file = makeWorkbook([
      { name: "סיכום מסכם", rows: [{ "מספר ת.ז": "999", "סה\"כ צבירה": 9_999_999 }] },
      { name: "מסלולי השקעה", rows: [{ "מספר ת.ז": "999", "סה\"כ צבירה": 8_888_888 }] },
      { name: "מוצרי חיסכון", rows: [savingsRow("201111111", 250_000)] },
    ]);
    const r = await parseShorensReport(file);
    // Only the savings sheet should drive AUM (250K), not the aggregates.
    expect(r.stats.totalAUM).toBe(250_000);
    expect(r.customerCount).toBe(1);
  });
});
