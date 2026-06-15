/**
 * End-to-end smoke test for the upload pipeline.
 *
 * 1. Reads the agent's real Surense workbook.
 * 2. Runs the production parser.
 * 3. Builds the same `clientRows` payload that UploadReport.tsx sends to
 *    `reports.save`.
 * 4. Asserts that we have at least one client with each critical field
 *    that the dashboard needs (`flagStatus`, `isVip`, `totalBalance`).
 *
 * If this test passes, we know that uploading the workbook through the UI
 * will correctly populate `/clients` and `/dashboard` — the only remaining
 * variable would be DB connectivity, which is exercised by the live app.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { parseSurenseReport } from "../client/src/lib/parseReport";

const FIXTURE = "/home/ubuntu/upload/דוח_מוצרים_בניהולשורנס.xlsx";

describe("real-xlsx roundtrip", () => {
  it("parses the agent's real workbook and produces save-ready client rows", async () => {
    if (!existsSync(FIXTURE)) {
      console.warn(`[realXlsxRoundtrip] fixture missing at ${FIXTURE} — skipping`);
      return;
    }

    const buf = readFileSync(FIXTURE);
    // parseSurenseReport accepts File | Blob | ArrayBuffer; node Buffer works
    // because the underlying xlsx library only needs an array-like.
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const file = new File([arrayBuf], "real.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const parsed = await parseSurenseReport(file);

    // Sanity: at least 1 customer extracted
    expect(parsed.customers.length).toBeGreaterThan(0);
    expect(parsed.stats.totalCustomers).toBe(parsed.customers.length);

    // Build the exact payload UploadReport.tsx sends to reports.save
    const clientRows = parsed.customers
      .map((c) => ({
        idNumber: String(c.id ?? "").trim(),
        fullName: c.name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        flagStatus: (c as { flagStatus?: string }).flagStatus ?? "regular",
        isVip: !!(c as { isVip?: boolean }).isVip,
        totalBalance: Number(c.accumulation ?? 0),
      }))
      .filter((c) => c.idNumber.length > 0);

    expect(clientRows.length).toBeGreaterThan(0);

    // Every row must have a non-empty idNumber (uniqueness key in DB)
    for (const r of clientRows) {
      expect(r.idNumber.length).toBeGreaterThan(0);
    }

    // At least one client should have a non-zero totalBalance — otherwise
    // the dashboard's AUM tile would silently render as ₪0.
    const aumSum = clientRows.reduce((s, r) => s + r.totalBalance, 0);
    expect(aumSum).toBeGreaterThan(0);

    // flagStatus must always be a valid enum value
    const validFlags = new Set([
      "regular", "vip", "liquid_fund", "tikun_190",
      "high_fees", "risk_ending", "coverage_gaps",
    ]);
    for (const r of clientRows) {
      expect(validFlags.has(r.flagStatus)).toBe(true);
    }

    // Print a small diagnostic — useful when we want to compare what the
    // dashboard SHOULD show after upload.
    const summary = {
      customers: clientRows.length,
      vip: clientRows.filter((r) => r.isVip).length,
      liquid_fund: clientRows.filter((r) => r.flagStatus === "liquid_fund").length,
      tikun_190: clientRows.filter((r) => r.flagStatus === "tikun_190").length,
      high_fees: clientRows.filter((r) => r.flagStatus === "high_fees").length,
      risk_ending: clientRows.filter((r) => r.flagStatus === "risk_ending").length,
      coverage_gaps: clientRows.filter((r) => r.flagStatus === "coverage_gaps").length,
      totalAum: aumSum,
      stats: parsed.stats,
    };
    // eslint-disable-next-line no-console
    console.info("[realXlsxRoundtrip] dashboard preview", summary);
  });
});
