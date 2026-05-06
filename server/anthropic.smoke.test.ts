import { describe, expect, it } from "vitest";

/**
 * Live smoke test for ANTHROPIC_API_KEY.
 * Sends the smallest possible request (1 token, tiny prompt) to confirm
 * the key is valid and Anthropic API is reachable. Skips automatically
 * if the env var is missing so that local dev / CI without the secret
 * does not fail.
 */
describe("Anthropic API key validation", () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  it.runIf(Boolean(apiKey))(
    "responds 200 with a valid key",
    async () => {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(
          `Anthropic API rejected the key (status ${resp.status}): ${text.slice(0, 400)}`
        );
      }

      const data = (await resp.json()) as { type?: string };
      expect(data.type).toBe("message");
    },
    20_000
  );

  it("env var is set for production runtime", () => {
    expect(apiKey, "ANTHROPIC_API_KEY must be configured").toBeTruthy();
  });
});
