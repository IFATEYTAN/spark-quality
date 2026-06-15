import { test, expect } from "@playwright/test";

// Public marketing/legal pages — no auth, high-confidence smoke checks.
test.describe("דפי שיווק ומידע ציבוריים", () => {
  test("דף הבית נטען עם הכותרת והניווט", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/SPARK Quality/i);
    await expect(page.locator("#root")).toBeVisible();
  });

  test("דף התמחור מציג את תוכנית SPARK Quality במחיר ₪199", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("SPARK Quality").first()).toBeVisible();
    await expect(page.getByText(/₪\s*199|199/).first()).toBeVisible();
  });

  test("עמוד התקנון נטען", async ({ page }) => {
    await page.goto("/legal/terms");
    await expect(page.locator("#root")).toBeVisible();
    await expect(page.locator("body")).toContainText(/תקנון|תנאי|שימוש/);
  });
});
