// Resend API key validation — calls the cheap GET /domains endpoint to verify the key works.
// We do NOT actually send mail in tests; sending is mocked in contact router tests.
import { describe, it, expect } from "vitest";

describe("Resend API key validation", () => {
  it("responds 200 from GET /domains with a valid RESEND_API_KEY", async () => {
    const key = process.env.RESEND_API_KEY;
    expect(key, "RESEND_API_KEY must be set").toBeTruthy();

    const res = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status !== 200) {
      const body = await res.text();
      throw new Error(`Resend rejected the key (HTTP ${res.status}): ${body}`);
    }

    const data = (await res.json()) as { data?: unknown };
    expect(data).toBeTruthy();
  }, 15_000);
});
