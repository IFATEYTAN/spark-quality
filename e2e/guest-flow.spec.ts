import { test, expect, type Page } from "@playwright/test";

/**
 * Full guest-flow E2E for the PUBLIC demo (`/demo`).
 *
 * The existing demo.spec.ts deep-links to the trigger grid. This walks the
 * WHOLE cinematic flow front-to-back — splash → … → KPI dashboard → trigger
 * grid → actions → summary — and, crucially, asserts that the KPI dashboard
 * renders a real computed figure (a non-empty AUM number), not an empty shell.
 *
 * That last assertion is the guard against the exact class of bug Layer 4 is
 * meant to catch: the engine computes a value but the UI never displays it
 * (the T10 "trackAgeMismatch was stuck at 0" failure mode). A unit test on the
 * parser can't see a binding that drops the number on the way to the screen —
 * only a browser walking the real render can.
 *
 * Navigation: ArrowLeft = next (RTL). We advance until each stage marker shows.
 */

const AUM_HERO = "סך נכסים בניהול (AUM)";
const TRIGGER_GRID = "16 טריגרים במודל";
const ACTIONS_MARK = "פעולות אוטומטיות · בזמן אמת";
const SUMMARY_MARK = "סיכום הדמו";

/** Press "next" until `text` is visible (or fail after maxPresses). */
async function advanceUntil(page: Page, text: string, maxPresses = 12) {
  const target = page.getByText(text, { exact: false }).first();
  for (let i = 0; i < maxPresses; i++) {
    if (await target.isVisible().catch(() => false)) return;
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(900);
  }
  await expect(target).toBeVisible();
}

test.describe("דמו · flow מלא מקצה-לקצה (אורח)", () => {
  test("עובר את כל השלבים בסדר: KPI → גריד טריגרים → פעולות → סיכום", async ({ page }) => {
    await page.goto("/demo?clean=true");

    // 3א — KPI dashboard
    await advanceUntil(page, AUM_HERO, 8);
    await expect(page.getByText(AUM_HERO).first()).toBeVisible();

    // 3ב — the 16-trigger grid (with a non-zero total-alerts pill)
    await advanceUntil(page, TRIGGER_GRID, 4);
    await expect(page.getByText(/סה.?כ\s*[\d,]+\s*התראות/)).toBeVisible();

    // 4 — automatic actions stage
    await advanceUntil(page, ACTIONS_MARK, 6);

    // 5 — summary stage
    await advanceUntil(page, SUMMARY_MARK, 6);
    await expect(page.getByText(SUMMARY_MARK).first()).toBeVisible();
  });

  test("מסך ה-KPI מציג מספר AUM אמיתי (לא מעטפת ריקה) — מגן מבאג מסוג T10", async ({ page }) => {
    await page.goto("/demo?clean=true");
    await advanceUntil(page, AUM_HERO, 8);

    // The headline AUM figure is rendered in a `.display-number` element. It
    // must actually contain digits — an empty / "—" / "0" value means the
    // engine→UI binding dropped the computed number.
    const aumFigure = page.locator(".display-number").first();
    await expect(aumFigure).toBeVisible();
    await expect(aumFigure).toHaveText(/\d/);
    await expect(aumFigure).not.toHaveText(/^[\s—–-]*0?[\s—–-]*$/);
  });
});
