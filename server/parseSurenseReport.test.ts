// Round 90 — verify the new parseSurenseReport against the real spec.
// We synthesize an in-memory workbook that follows the surense-analyzer
// skill column order, then assert on the output stats.
import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseSurenseReport } from "../client/src/lib/parseReport";

function makeFile(buffer: ArrayBuffer, name: string): File {
  // Node 22 has File globally.
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildBook() {
  const wb = XLSX.utils.book_new();

  // ---- Savings sheet ----
  const savingsHeaders = [
    "יצרן","סוג מוצר","מוצר","מס' מ\"ה","מס' חשבון/פוליסה","סוכנות",
    "שם פרטי לקוח","שם משפחה לקוח","מספר ת.ז","סלולרי לקוח","דוא\"ל לקוח",
    "תאריך לידה","גיל","מגדר","יישוב","סיווג לקוח","סטטוס מוצר",
    "תאריך עדכון סטטוס","תאריך הצטרפות למוצר","מעמד","מזהה מעסיק","שם מעסיק",
    "צבירה","שכר למוצר","שיעור תגמולים עובד","שיעור תגמולים מעסיק",
    "שיעור הפרשה לפיצויים","הפקדה אחרונה","תאריך הפקדה אחרונה",
    "דמי ניהול מהפקדה","דמי ניהול מצבירה","מקדם מובטח לפרישה",
    "מסלול ביטוח (פנסיה)","מספר סוכן","תיאור מספר סוכן","מיופה כוח אחרון",
    "מת\"ל","נכון ליום","קידוד אחיד",
  ];

  const savingsRows = [
    savingsHeaders,
    // Row 1 — Dani Cohen, age 42, normal pension product
    [
      "הפניקס","קרן פנסיה חדשה מקיפה","הפניקס פנסיה מקיפה","209","2214959088","טריפל איי",
      "דני","כהן","301234567","052-111-2222","dani.cohen@demo.co.il",
      "1/1/1983",42,"זכר","תל אביב","","פעיל",
      "8/31/2025","6/18/2020","שכיר","512345678","חברת הייטק בע\"מ",
      185000,12500,"7.000%","7.500%","8.330%",950,"12/1/2025",
      "1.500%","0.150%","","","33541","","","","12/31/2025","",
    ],
    // Row 2 — Sara Levi, age 65, no pension, big savings → tikun_190 candidate
    [
      "הפניקס","קופת גמל להשקעה","הפניקס גמל להשקעה","210","2214959099","טריפל איי",
      "שרה","לוי","302345678","052-333-4444","sara.levi@demo.co.il",
      "1/1/1960",65,"נקבה","חיפה","זהב","פעיל",
      "8/31/2025","1/1/2018","עצמאי","","",
      450000,0,"","","",0,"6/1/2025",
      "0.500%","0.080%","","","33541","","","","12/31/2025","",
    ],
    // Row 3 — Yossi Mizrahi, age 50, high fees
    [
      "מגדל","מנהלים חיסכון טהור","מגדל מנהלים","211","2214959100","טריפל איי",
      "יוסי","מזרחי","303456789","052-555-6666","yossi.m@demo.co.il",
      "1/1/1975",50,"זכר","ירושלים","","פעיל",
      "8/31/2025","1/1/2015","שכיר","","",
      120000,15000,"","","",1200,"12/1/2025",
      "2.000%","1.000%","","","33541","","","","12/31/2025","",
    ],
    // Row 4 — Inactive product with balance
    [
      "כלל","קרן פנסיה חדשה מקיפה","כלל פנסיה","212","2214959111","טריפל איי",
      "אבי","שמש","304567890","052-777-8888","avi.s@demo.co.il",
      "1/1/1970",55,"זכר","פתח תקווה","","לא פעיל",
      "8/31/2025","1/1/2010","שכיר","","",
      60000,0,"","","",0,"1/1/2024",
      "1.000%","0.300%","","","33541","","","","12/31/2025","",
    ],
  ];

  const savingsSheet = XLSX.utils.aoa_to_sheet(savingsRows);
  XLSX.utils.book_append_sheet(wb, savingsSheet, "מוצרי חיסכון");

  // ---- Insurance sheet ----
  const insuranceHeaders = [
    "יצרן","סוג מוצר","מוצר","מס' חשבון/פוליסה","סוכנות",
    "שם פרטי לקוח","שם משפחה לקוח","מספר ת.ז","סלולרי לקוח","דוא\"ל לקוח",
    "תאריך לידה","גיל","מגדר","יישוב","סיווג לקוח","סה\"כ פרמיה","סטטוס מוצר",
    "תאריך עדכון סטטוס","תאריך הצטרפות למוצר","מזהה מעסיק","שם מעסיק",
    "מספר סוכן","תיאור מספר סוכן","מיופה כוח אחרון","מת\"ל","נכון ליום",
  ];

  const insuranceRows = [
    insuranceHeaders,
    [
      "הפניקס","ביטוח בריאות","הפניקס - בריאות","5512345678","טריפל איי",
      "דני","כהן","301234567","052-111-2222","dani.cohen@demo.co.il",
      "1/1/1983",42,"זכר","תל אביב","",1500,"פעיל",
      "","1/4/2021","","","88349","","","","12/31/2025",
    ],
    // Risk zmani for Sara
    [
      "הראל","ביטוח חיים","הראל ריסק","5598765432","טריפל איי",
      "שרה","לוי","302345678","052-333-4444","sara.levi@demo.co.il",
      "1/1/1960",65,"נקבה","חיפה","זהב",450,"ריסק זמני",
      "","1/1/2020","","","88349","","","","12/31/2025",
    ],
  ];

  const insuranceSheet = XLSX.utils.aoa_to_sheet(insuranceRows);
  XLSX.utils.book_append_sheet(wb, insuranceSheet, "מוצרי ביטוח");

  // Generate buffer
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return makeFile(buf, "test-shorens.xlsx");
}

describe("parseSurenseReport (Round 90 — skill spec aligned)", () => {
  it("aggregates customers by ת.ז and returns real AUM/premium", async () => {
    const file = buildBook();
    const r = await parseSurenseReport(file);

    // 4 distinct customers in our fixture
    expect(r.customerCount).toBe(4);
    // AUM = sum of savings = 185000+450000+120000+60000 = 815000
    expect(r.stats.totalAUM).toBe(815000);
    // Monthly premium ≈ (1500+450) / 12 = 162.5 → 162 or 163 depending on rounding
    expect(r.stats.monthlyPremium).toBeGreaterThanOrEqual(162);
    expect(r.stats.monthlyPremium).toBeLessThanOrEqual(163);
  });

  it("flags risk_zmani correctly", async () => {
    const file = buildBook();
    const r = await parseSurenseReport(file);
    expect(r.stats.riskFlags).toBe(1);
    const sara = r.customers.find((c) => c.id === "302345678");
    expect(sara?.flagStatus).toBe("risk_ending");
  });

  it("flags VIP based on סיווג זהב + savings", async () => {
    const file = buildBook();
    const r = await parseSurenseReport(file);
    const sara = r.customers.find((c) => c.id === "302345678");
    // Sara has classification זהב — should be VIP regardless of risk_zmani for the badge
    expect(sara?.isVip).toBe(true);
  });

  it("flags high fees (>0.7% from savings or >1.5% from deposit)", async () => {
    const file = buildBook();
    const r = await parseSurenseReport(file);
    expect(r.stats.lowYield).toBeGreaterThanOrEqual(1);
    const yossi = r.customers.find((c) => c.id === "303456789");
    expect(yossi?.flagStatus).toBe("high_fees");
  });

  it("flags inactive product with balance > 30K", async () => {
    const file = buildBook();
    const r = await parseSurenseReport(file);
    expect(r.stats.inactiveWithBalance).toBeGreaterThanOrEqual(1);
    expect(r.stats.inactiveBalanceTotal).toBeGreaterThanOrEqual(60000);
  });

  it("does NOT explode if insurance sheet is missing", async () => {
    // Build with only savings
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["מספר ת.ז","שם פרטי לקוח","שם משפחה לקוח","סוג מוצר","צבירה","דמי ניהול מצבירה"],
      ["999","טל","אבי","קרן פנסיה חדשה מקיפה",100000,"0.5%"],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "מוצרי חיסכון");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const f = makeFile(buf, "savings-only.xlsx");
    const r = await parseSurenseReport(f);
    expect(r.customerCount).toBe(1);
    expect(r.stats.monthlyPremium).toBe(0);
  });
});
