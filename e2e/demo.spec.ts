import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end coverage of the PUBLIC cinematic demo (`/demo`). The demo uses
 * deterministic fictional data (DEMO_TRIGGER_CARDS / CUSTOMERS), so we can
 * assert that every one of the 16-trigger cards shows the correct label, and
 * that clicking a trigger opens its scenario with the matching content.
 *
 * Guest stage order: splash → intro → category → analyzing → dashboard →
 * dashboard2 (the trigger grid) → dashboard3 → actions → summary.
 * Navigation: ArrowLeft = next (RTL). We advance until the trigger grid shows.
 */

const TRIGGER_GRID_HEADING = "16 טריגרים במודל";

// The 15 displayed trigger labels (poaExpiring90d intentionally hidden).
const TRIGGER_LABELS = [
  "ללא ייפוי כוח פעיל",
  "ריסק זמני",
  "כיסויים פוגים",
  "חיסכון ללא ביטוח",
  "ללא פנסיה פעילה",
  "46+ ללא סיעוד",
  "קרן ללא הפקדות",
  "דמי ניהול גבוהים",
  "מסלול לא תואם לגיל",
  "עצמאי ללא הפקדה",
  "ריכוז יתר בחברה",
  "יום הולדת מפנה",
  "יום הולדת החודש",
  "VIP / זהב",
  "ללא מייל",
];

/** Advance the guest demo until the trigger grid (dashboard2) is visible. */
async function gotoTriggerGrid(page: Page) {
  await page.goto("/demo?clean=true");
  const heading = page.getByText(TRIGGER_GRID_HEADING, { exact: false });
  for (let i = 0; i < 14; i++) {
    if (await heading.isVisible().catch(() => false)) return;
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(900);
  }
  await expect(heading).toBeVisible();
}

test.describe("דמו · גריד 16 הטריגרים (נתוני הדגמה)", () => {
  test("מגיע לשלב הטריגרים ומציג את כותרת המודל P0–P4", async ({ page }) => {
    await gotoTriggerGrid(page);
    await expect(page.getByText(TRIGGER_GRID_HEADING, { exact: false })).toBeVisible();
    // Total alerts pill is rendered with a non-zero number.
    await expect(page.getByText(/סה.?כ\s*[\d,]+\s*התראות/)).toBeVisible();
  });

  test("כל 15 תוויות הטריגרים מוצגות", async ({ page }) => {
    await gotoTriggerGrid(page);
    for (const label of TRIGGER_LABELS) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test("לחיצה על טריגר POA פותחת את התרחיש הנכון", async ({ page }) => {
    await gotoTriggerGrid(page);
    await page.getByRole("button", { name: /ללא ייפוי כוח פעיל/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("סנריו אוטומטי · SPARK AI")).toBeVisible();
    await expect(dialog.getByText(/ללא ייפוי כוח פעיל/)).toBeVisible();
    await expect(dialog.getByText("תוצאה צפויה")).toBeVisible();
  });

  test("לחיצה על טריגר ריסק זמני פותחת את התרחיש הנכון", async ({ page }) => {
    await gotoTriggerGrid(page);
    await page.getByRole("button", { name: /ריסק זמני/ }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/ריסק זמני/)).toBeVisible();
    await expect(dialog.getByText("הלקוחות הרלוונטיים לתהליך").or(dialog.getByText("דוגמה אמיתית מהדוח"))).toBeVisible();
  });
});
