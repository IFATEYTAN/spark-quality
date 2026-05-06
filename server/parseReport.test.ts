// בדיקה ש-classify מזהה את הקטגוריות הפיננסיות כפי שצפוי
import { describe, expect, it } from "vitest";
import { parseShorensReport } from "../client/src/lib/parseReport";

// יוצרים קובץ Excel מינימלי בדמיון (mock) דרך SheetJS
import * as XLSX from "xlsx";

function makeExcel(rows: Record<string, unknown>[]): File {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "חיסכון");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buf], "test.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseReport · קטגוריות פיננסיות", () => {
  it("מזהה לקוח VIP כשצבירה ≥ 1M ₪", async () => {
    const file = makeExcel([
      {
        "תעודת זהות": "301111111",
        "שם": "לקוח VIP",
        "גיל": 50,
        "טלפון": "050-0000000",
        "אימייל": "vip@test.co.il",
        "מוצר": "מגדל - חיסכון פרט",
        "חברה": "מגדל",
        "פרמיה": 0,
        "צבירה": 1500000,
        "תאריך הצטרפות": "01/01/2020",
        "סטטוס": "פעיל",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].status).toBe("VIP");
    expect(result.stats.vipCustomers).toBe(1);
  });

  it("מזהה השתלמות נזילה (קרן ≥ 6 שנים)", async () => {
    const file = makeExcel([
      {
        "תעודת זהות": "302222222",
        "שם": "לקוח נזיל",
        "גיל": 45,
        "אימייל": "test@test.co.il",
        "מוצר": "אקסלנס השתלמות",
        "חברה": "אקסלנס",
        "פרמיה": 0,
        "צבירה": 200000,
        "תאריך הצטרפות": "01/01/2018", // 8 שנים
        "סטטוס": "פעיל",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("השתלמות נזילה");
    expect(result.stats.liquidFunds).toBe(1);
  });

  it("מזהה תיקון 190 (גיל 60+ ללא פנסיה עם צבירה ≥ 300K)", async () => {
    const file = makeExcel([
      {
        "תעודת זהות": "303333333",
        "שם": "לקוח 190",
        "גיל": 65,
        "אימייל": "test@test.co.il",
        "מוצר": "מגדל - חיסכון פרט",
        "חברה": "מגדל",
        "פרמיה": 0,
        "צבירה": 400000,
        "תאריך הצטרפות": "01/01/2020",
        "סטטוס": "פעיל",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("תיקון 190");
  });

  it("מזהה תשואה חלשה / דמי ניהול גבוהים (צבירה נמוכה ביחס לוותק)", async () => {
    const file = makeExcel([
      {
        "תעודת זהות": "304444444",
        "שם": "לקוח תשואה חלשה",
        "גיל": 40,
        "אימייל": "test@test.co.il",
        "מוצר": "מגדל - חיסכון פרט",
        "חברה": "מגדל",
        "פרמיה": 0,
        "צבירה": 50000, // 50K אחרי 10 שנים זה מעט מאוד
        "תאריך הצטרפות": "01/01/2016", // 10 שנים
        "סטטוס": "פעיל",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("תשואה חלשה");
  });

  it("מזהה תשואה חזקה (צבירה גבוהה ביחס לוותק)", async () => {
    const file = makeExcel([
      {
        "תעודת זהות": "305555555",
        "שם": "לקוח תשואה חזקה",
        "גיל": 40,
        "אימייל": "test@test.co.il",
        "מוצר": "מגדל - חיסכון פרט",
        "חברה": "מגדל",
        "פרמיה": 0,
        "צבירה": 200000, // 200K אחרי 4 שנים זה מצוין
        "תאריך הצטרפות": "01/01/2022", // 4 שנים
        "סטטוס": "פעיל",
      },
    ]);
    const result = await parseShorensReport(file);
    expect(result.customers[0].status).toBe("תשואה חזקה");
  });
});

describe("parseReport · רגרסיה: merge בין sheet ביטוח וsheet חיסכון", () => {
  function makeMixedExcel(): File {
    // לקוח אחד מופיע גם ב-sheet ביטוח (פרמיה, ללא צבירה) וגם ב-sheet חיסכון (צבירה גבוהה).
    // אם ה-merge מקלקל, flagStatus יישאר זה של ה-sheet הראשון (בד״כ ביטוח → "regular" / coverage_gaps).
    const insRows = [{
      "תעודת זהות": "401010101",
      "שם": "לקוח דו-Sheet",
      "גיל": 65,
      "אימייל": "merge@test.co.il",
      "מוצר": "ביטוח חיים",
      "חברה": "מגדל",
      "פרמיה": 1200,
      "צבירה": 0,
      "תאריך הצטרפות": "01/01/2018",
      "סטטוס": "פעיל",
    }];
    const savRows = [{
      "תעודת זהות": "401010101",
      "שם": "לקוח דו-Sheet",
      "גיל": 65,
      "אימייל": "merge@test.co.il",
      "מוצר": "מגדל - חיסכון פרט",
      "חברה": "מגדל",
      "פרמיה": 0,
      "צבירה": 1500000, // VIP
      "תאריך הצטרפות": "01/01/2018",
      "סטטוס": "פעיל",
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insRows), "מוצרי ביטוח");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savRows), "מוצרי חיסכון");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return new File([buf], "mixed.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  it("שומר flagStatus=vip ו-isVip=true גם כשהלקוח הופיע קודם ב-sheet ביטוח", async () => {
    const result = await parseShorensReport(makeMixedExcel());
    expect(result.customers).toHaveLength(1);
    const c = result.customers[0] as { flagStatus?: string; isVip?: boolean; accumulation: number };
    expect(c.flagStatus).toBe("vip");
    expect(c.isVip).toBe(true);
    expect(c.accumulation).toBe(1500000);
  });

  it("דירוג חזק יותר מנצח: tikun_190 גובר על coverage_gaps", async () => {
    const insRows = [{
      "תעודת זהות": "501010101",
      "שם": "לקוח 190 דו-Sheet",
      "גיל": 67,
      "אימייל": "x@y.co.il",
      "מוצר": "ביטוח חיים",
      "חברה": "מגדל",
      "פרמיה": 0,
      "צבירה": 0,
      "תאריך הצטרפות": "01/01/2018",
      "סטטוס": "פעיל",
    }];
    const savRows = [{
      "תעודת זהות": "501010101",
      "שם": "לקוח 190 דו-Sheet",
      "גיל": 67,
      "אימייל": "x@y.co.il",
      "מוצר": "מגדל - חיסכון פרט",
      "חברה": "מגדל",
      "פרמיה": 0,
      "צבירה": 400000,
      "תאריך הצטרפות": "01/01/2018",
      "סטטוס": "פעיל",
    }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insRows), "מוצרי ביטוח");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savRows), "מוצרי חיסכון");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const file = new File([buf], "mix2.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = await parseShorensReport(file);
    const c = result.customers[0] as { flagStatus?: string };
    expect(c.flagStatus).toBe("tikun_190");
  });
});
