import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config for SPARK Quality.
 *
 * Targets the PUBLIC, deterministic demo (`/demo`) and marketing pages — no
 * auth or DB required, so it runs against `pnpm dev` as-is. Authenticated areas
 * (/dashboard, /clients, …) need a test-auth + seeded DB setup (see e2e/README).
 *
 * Browser binaries must be installed first: `pnpm exec playwright install chromium`.
 * (In some sandboxes the Playwright CDN is blocked by network egress rules — run
 * this where the CDN is reachable, e.g. CI / the Manus environment.)
 */
const PORT = Number(process.env.E2E_PORT ?? 5599);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "he-IL",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `PORT=${PORT} pnpm dev`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
