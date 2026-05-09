import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * Tests for ENV.publicAppUrl — the stable public origin used to build links
 * inside transactional emails (e.g. activation success email).
 *
 * Background: webhook callers (Make.com, iCount) hit the *internal* Cloud Run
 * host (e.g. dde7tz2ik7-gjegtl4ccq-ue.a.run.app), not the public domain.
 * Building email links from req.host therefore breaks the OAuth login flow
 * because the internal host is not in the project's allowed redirect list.
 * The fix is to always read from ENV.publicAppUrl which falls back to the
 * published Manus Space domain.
 */
describe("ENV.publicAppUrl", () => {
  const ORIGINAL_ENV = process.env.PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.PUBLIC_APP_URL;
    // Reset module registry so ENV is re-evaluated with the new env var.
    Object.keys(require.cache ?? {}).forEach((k) => delete require.cache[k]);
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = ORIGINAL_ENV;
  });

  it("falls back to the published Manus Space domain when not set", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.publicAppUrl).toBe("https://sparkquality-zqvpyevd.manus.space");
  });

  it("strips a trailing slash so concatenation produces a valid URL", async () => {
    process.env.PUBLIC_APP_URL = "https://sparkquality.example.com/";
    // Re-import fresh ENV after env var change.
    const mod = await import(`./_core/env?cachebust=${Date.now()}`);
    expect(mod.ENV.publicAppUrl).toBe("https://sparkquality.example.com");
  });

  it("never starts with the internal Cloud Run host pattern", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV.publicAppUrl).not.toMatch(/run\.app/);
    expect(ENV.publicAppUrl).not.toMatch(/-ue\.a\./);
  });

  it("produces a valid /dashboard link suitable for an email button", async () => {
    const { ENV } = await import("./_core/env");
    const url = `${ENV.publicAppUrl}/dashboard`;
    expect(() => new URL(url)).not.toThrow();
    expect(new URL(url).hostname).toMatch(/manus\.space$/);
    expect(new URL(url).pathname).toBe("/dashboard");
  });
});
