// Round 90 — these tests use the official Shorens column names that the
// rewritten parseShorensReport now expects. Older fixtures were dropped
// because the parser is now strictly aligned to the skill spec.
import { describe, expect, it } from "vitest";
import { parseShorensReport } from "../client/src/lib/parseReport";
import * as XLSX from "xlsx";

// Build a single-sheet "מוצרי חיסכון" workbook with the canonical Shorens
// column names. Caller passes raw row objects keyed by those names.
function makeSavingsExcel(rows: Record<string, unknown>[]): File {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "מוצרי חיסכון");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "fixture.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

const baseRow = (id: string, savings: number, joinDate: string) => ({
  "מספר ת.ז": id,
  "שם פרטי": "לקוח",
  "שם משפחה": "בדיקה",
  "תאריך לידה": "01/01/1980",
  "טלפון נייד": "0500000000",
  "כתובת מייל": "test@test.co.il",
  "סוג מוצר": "קופת גמל להשקעה",
  "תיאור מוצר": "מגדל גמל להשקעה",
  "מספר פוליסה": "P-" + id,
  "חברה": "מגדל",
  "סטטוס מוצר": "פעיל",
  "מעמד": "שכיר",
  "סה\"כ צבירה": savings,
  "סה\"כ הפקדות חודשיות": 0,
  "תאריך הצטרפות": joinDate,
  "דמי ניהול מצבירה": 0.005,
  "דמי ניהול מהפקדה": 0.01,
});

describe("parseReport · קטגוריות פיננסיות (skill spec column names)", () => {
  it("מזהה לקוח VIP כשצבירה ≥ 1M ₪", async () => {
    const file = makeSavingsExcel([
      { ...baseRow("301111111", 1_500_000, "01/01/2020"), "תאריך לידה": "01/01/1975" },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].status).toBe("VIP");
    expect(result.stats.vipCustomers).toBe(1);
  });

  it("מזהה השתלמות נזילה (קרן השתלמות שצורפה לפני ≥ 6 שנים)", async () => {
    const oldDate = "01/01/2018"; // 8+ שנים אחורה
    const file = makeSavingsExcel([
      {
        ...baseRow("302222222", 200_000, oldDate),
        "סוג מוצר": "קרן השתלמות",
        "תיאור מוצר": "אקסלנס השתלמות",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("השתלמות נזילה");
    expect(result.stats.liquidFunds).toBe(1);
  });

  it("מזהה תיקון 190 (גיל 60+ ללא פנסיה עם צבירה ≥ 300K)", async () => {
    const file = makeSavingsExcel([
      {
        ...baseRow("303333333", 400_000, "01/01/2020"),
        "תאריך לידה": "01/01/1958", // ~ גיל 67
        "סוג מוצר": "קופת גמל להשקעה",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("תיקון 190");
    expect(result.stats.amendment190).toBe(1);
  });

  it("מזהה דמי ניהול גבוהים (>0.7% מצבירה)", async () => {
    const file = makeSavingsExcel([
      {
        ...baseRow("304444444", 250_000, "01/01/2020"),
        "דמי ניהול מצבירה": 0.012, // 1.2% — מעל הסף 0.7%
        "סוג מוצר": "ביטוח מנהלים", // יש פנסיה כדי לא ליפול ל-coverage_gaps
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("תשואה חלשה");
  });
});

describe("parseReport · רגרסיה: merge בין sheet ביטוח וsheet חיסכון", () => {
  function makeMixedExcel(savings: number, age: number): File {
    const id = "401010101";
    const birth = age === 65 ? "01/01/1960" : "01/01/1958";
    const insRows = [{
      "מספר ת.ז": id,
      "שם פרטי": "לקוח",
      "שם משפחה": "דו-גליון",
      "תאריך לידה": birth,
      "סוג מוצר": "ביטוח חיים",
      "חברה": "מגדל",
      "סה\"כ פרמיה": 14_400, // 1,200/חודש
      "סטטוס מוצר": "פעיל",
    }];
    const savRows = [{
      ...baseRow(id, savings, "01/01/2018"),
      "תאריך לידה": birth,
      "שם פרטי": "לקוח",
      "שם משפחה": "דו-גליון",
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insRows), "מוצרי ביטוח");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savRows), "מוצרי חיסכון");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return new File([buf], "mixed.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  it("שומר flagStatus=vip גם כשהלקוח הופיע קודם ב-sheet ביטוח", async () => {
    const result = await parseShorensReport(makeMixedExcel(1_500_000, 65));
    expect(result.customers).toHaveLength(1);
    const c = result.customers[0] as { flagStatus?: string; isVip?: boolean; accumulation: number };
    expect(c.flagStatus).toBe("vip");
    expect(c.isVip).toBe(true);
    expect(c.accumulation).toBe(1_500_000);
  });

  it("דירוג חזק יותר מנצח: tikun_190 גובר על coverage_gaps", async () => {
    const result = await parseShorensReport(makeMixedExcel(400_000, 67));
    const c = result.customers[0] as { flagStatus?: string };
    expect(c.flagStatus).toBe("tikun_190");
  });
});

describe("parseReport · פוליסות לשמירה (קלט למנוע הטריגרים)", () => {
  it("מפיק שורת פוליסה לכל מוצר עם שדות productType/balance/status", async () => {
    const file = makeSavingsExcel([
      { ...baseRow("305555555", 250_000, "01/01/2019"), "סוג מוצר": "קרן פנסיה חדשה מקיפה" },
    ]);
    const result = await parseShorensReport(file);
    expect(result.policies.length).toBeGreaterThan(0);
    const p = result.policies.find((x) => x.idNumber === "305555555");
    expect(p).toBeDefined();
    expect(p!.productType).toContain("פנס");
    expect(p!.balance).toBe(250_000);
    expect(p!.status).toBe("active");
  });

  it("ממפה סטטוס 'לא פעיל' ל-inactive ומשייך פוליסה ללקוח", async () => {
    const file = makeSavingsExcel([
      { ...baseRow("306666666", 80_000, "01/01/2017"), "סטטוס מוצר": "לא פעיל" },
    ]);
    const result = await parseShorensReport(file);
    const p = result.policies.find((x) => x.idNumber === "306666666");
    expect(p).toBeDefined();
    expect(p!.status).toBe("inactive");
  });

  it("מפיק תאריך לידה (ISO) על שורת הלקוח", async () => {
    const file = makeSavingsExcel([
      { ...baseRow("307777777", 120_000, "01/01/2019"), "תאריך לידה": "15/06/1970" },
    ]);
    const result = await parseShorensReport(file);
    const c = result.customers[0] as { birthDate?: string | null };
    expect(c.birthDate).toBeTruthy();
    expect(new Date(c.birthDate as string).getFullYear()).toBe(1970);
  });

  it("מפיק פוליסת 'מינוי סוכן' עם תאריך תום מינוי (לזיהוי POA)", async () => {
    const file = makeSavingsExcel([
      {
        ...baseRow("308888888", 90_000, "01/01/2019"),
        "תאריך תום תוקף מינוי סוכן": "01/01/2030",
      },
    ]);
    const result = await parseShorensReport(file);
    const appt = result.policies.find(
      (p) => p.idNumber === "308888888" && p.productType === "מינוי סוכן",
    );
    expect(appt).toBeDefined();
    expect(appt!.endDate).toBeTruthy();
    expect(new Date(appt!.endDate as string).getFullYear()).toBe(2030);
  });
});
