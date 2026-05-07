import { describe, it, expect, beforeAll } from "vitest";

// Force iCount config so the SDK is "configured" for tests.
process.env.ICOUNT_API_TOKEN = "test-token-for-vitest";
process.env.ICOUNT_API_USER = "test-user";
process.env.ICOUNT_COMPANY_ID = "12345";

let iCountSdk: typeof import("./iCount").iCountSdk;

beforeAll(async () => {
  ({ iCountSdk } = await import("./iCount"));
});

describe("iCount SDK", () => {
  describe("newState / parseState", () => {
    it("round-trips a workspaceId through state", () => {
      const state = iCountSdk.newState(42);
      const parsed = iCountSdk.parseState(state);
      expect(parsed?.workspaceId).toBe(42);
      expect(parsed?.nonce.length).toBeGreaterThan(8);
    });

    it("rejects malformed state", () => {
      expect(iCountSdk.parseState("")).toBeNull();
      expect(iCountSdk.parseState("abc")).toBeNull();
      expect(iCountSdk.parseState("0.nonce")).toBeNull();
      expect(iCountSdk.parseState("-1.nonce")).toBeNull();
    });
  });

  describe("signCallback / verifyCallback", () => {
    it("verifies a properly-signed payload", () => {
      const state = iCountSdk.newState(7);
      const sig = iCountSdk.signCallback(state, 7, "sub_123");
      expect(iCountSdk.verifyCallback(state, 7, "sub_123", sig)).toBe(true);
    });

    it("rejects a forged signature", () => {
      const state = iCountSdk.newState(7);
      const goodSig = iCountSdk.signCallback(state, 7, "sub_123");
      // tweak one char
      const badSig = goodSig.slice(0, -1) + (goodSig.endsWith("0") ? "1" : "0");
      expect(iCountSdk.verifyCallback(state, 7, "sub_123", badSig)).toBe(false);
    });

    it("rejects a workspace mismatch", () => {
      const state = iCountSdk.newState(7);
      const sig = iCountSdk.signCallback(state, 7, "sub_123");
      expect(iCountSdk.verifyCallback(state, 8, "sub_123", sig)).toBe(false);
    });

    it("rejects a subscription-id mismatch", () => {
      const state = iCountSdk.newState(7);
      const sig = iCountSdk.signCallback(state, 7, "sub_123");
      expect(iCountSdk.verifyCallback(state, 7, "sub_999", sig)).toBe(false);
    });

    it("constant-time-rejects different-length signatures", () => {
      const state = iCountSdk.newState(7);
      expect(iCountSdk.verifyCallback(state, 7, "sub_123", "short")).toBe(false);
    });
  });

  describe("buildPaymentPageUrl", () => {
    it("constructs a valid URL with all required iCount params", () => {
      const url = iCountSdk.buildPaymentPageUrl({
        amount: 4200,
        description: "מנוי SPARK Quality · Premium · שנתי",
        email: "agent@example.com",
        name: "דנה כהן",
        phone: "0501234567",
        taxId: "315678123",
        successUrl: "https://app.example.com/billing/success",
        failureUrl: "https://app.example.com/billing/failed",
        callbackUrl: "https://app.example.com/api/icount/callback",
        workspaceId: 11,
        state: "11.abcdef",
      });
      const u = new URL(url);
      expect(u.hostname).toMatch(/icount/);
      expect(u.searchParams.get("sum")).toBe("4200");
      expect(u.searchParams.get("currency")).toBe("ILS");
      expect(u.searchParams.get("hp")).toBe("1"); // standing order, not charge
      expect(u.searchParams.get("cf1")).toBe("11");
      expect(u.searchParams.get("cf2")).toBe("11.abcdef");
      expect(u.searchParams.get("vat_id")).toBe("315678123");
      expect(u.searchParams.get("notify_url")).toContain("/api/icount/callback");
    });
  });
});
