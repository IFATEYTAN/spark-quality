// Regression fixture test — runs the real parseSurenseReport against a full
// synthetic Surense 04/2026 export (structural twin of the real report:
// 41/32/28/30 columns, real status/employment/coverage enums, dates as Excel
// serials). The fixture is engineered so every trigger fires, which lets us
// lock in parser behavior and catch any mapping regression.
//
// No real client data is used — all IDs/emails/names are synthetic.
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseSurenseReport } from "../client/src/lib/parseReport";

const FIXTURE = join(__dirname, "__fixtures__", "surense-demo-04-2026.xlsx");

function loadFixture(): File {
  const buf = readFileSync(FIXTURE);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new File([ab], "surense-demo-04-2026.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseSurenseReport — full 04/2026 structural fixture", () => {
  it("parses the demo and feeds every critical trigger", async () => {
    const r = await parseSurenseReport(loadFixture());

    // --- structural sanity ---
    expect(r.customerCount).toBe(150);
    expect(r.productCount).toBeGreaterThan(300);
    expect(r.stats.totalAUM).toBeGreaterThan(0);
    expect(r.stats.insuranceClients).toBeGreaterThan(0);

    // --- appointment columns (T1/T2) actually reach the engine ---
    // Proves the 41/28-col layout with תאריך תום תוקף מינוי סוכן (serial!) is
    // read by toDate and turned into appointmentDaysRemaining.
    expect(r.stats.appointmentExpired).toBeGreaterThan(0);
    expect(r.stats.appointmentExpiring90d).toBeGreaterThan(0);

    // --- employment normalization (T11) ---
    expect(r.stats.selfEmployedNoDeposit).toBeGreaterThan(0);

    // --- other engineered triggers ---
    expect(r.stats.riskFlags).toBeGreaterThan(0);
    expect(r.stats.inactiveWithBalance).toBeGreaterThan(0);
    expect(r.stats.noNursing46plus).toBeGreaterThan(0);
    expect(r.stats.vipCustomers).toBeGreaterThan(0);
    expect(r.stats.noPension).toBeGreaterThan(0);

    // --- track/age mismatch (T10) — regression guard against the old
    // hardcoded `trackAgeMismatch: 0` stub. The tracks sheet IS parsed, so
    // older clients in equity tracks must be counted.
    expect(r.stats.trackAgeMismatch).toBeGreaterThan(0);
  });

  it("matches the locked stats snapshot (regression guard)", async () => {
    const r = await parseSurenseReport(loadFixture());
    // Snapshot the whole stats block. Any future mapping change that shifts a
    // KPI will surface here and must be reviewed before committing.
    expect(r.stats).toMatchSnapshot();
  });
});
