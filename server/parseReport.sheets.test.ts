/**
 * Round 89 regression — guards against the old typo bug.
 *
 * Real Shorens reports name their sheets "מוצרי חיסכון" / "מוצרי ביטוח" /
 * "מוצרי פנסיה" / "השתלמות" / "גמל". An older revision of parseReport.ts
 * matched against the typo "חיסון" (no כ) and "פינסים" — meaning every real
 * upload silently failed and the demo dashboard stayed on the canned 487M
 * placeholder. This test asserts the spellings stay correct.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("parseReport sheet hints", () => {
  const src = readFileSync(
    resolve(__dirname, "../client/src/lib/parseReport.ts"),
    "utf8",
  );

  it("uses correct Hebrew spelling for savings sheets", () => {
    expect(src).toContain('"חיסכון"');
    expect(src).toContain('"פנסיה"');
    expect(src).toContain('"גמל"');
    expect(src).toContain('"השתלמות"');
  });

  it("does not regress to the old חיסון / פינסים typos", () => {
    // Locate the SAVINGS_SHEET_HINTS array specifically — the explanatory
    // comment above it intentionally documents the old typo, which is fine.
    const arrayLine = src
      .split("\n")
      .find((l) => l.includes("SAVINGS_SHEET_HINTS = ["));
    expect(arrayLine, "SAVINGS_SHEET_HINTS array not found").toBeTruthy();
    expect(arrayLine!).not.toContain('"חיסון"');
    expect(arrayLine!).not.toContain('"פינסים"');
  });

  it("matches insurance sheets", () => {
    expect(src).toContain('INSURANCE_SHEET_HINTS = ["ביטוח"]');
  });

  it("skips aggregate / coverage / track sheets to avoid double counting", () => {
    expect(src).toMatch(/SKIP_HINTS\s*=\s*\["מסכם",\s*"מסלול",\s*"כיסוי"\]/);
  });
});
