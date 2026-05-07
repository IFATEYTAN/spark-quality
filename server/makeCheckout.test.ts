import { describe, expect, it } from "vitest";
import {
  makeCheckoutSdk,
  signActivation,
  verifyActivation,
  signCheckout,
  newRequestId,
} from "./makeCheckout";

describe("makeCheckout signActivation/verifyActivation", () => {
  const base = {
    workspaceId: 60002,
    requestId: "test-request-001",
    status: "ok" as const,
    invoiceId: "INV-12345",
    subscriptionId: "SUB-67890",
  };

  it("signs and verifies a valid activation payload", () => {
    const sig = signActivation(base);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);

    const ok = verifyActivation({ ...base, signature: sig });
    expect(ok).toBe(true);
  });

  it("rejects a tampered status", () => {
    const sig = signActivation(base);
    const ok = verifyActivation({
      ...base,
      status: "fail",
      signature: sig,
    });
    expect(ok).toBe(false);
  });

  it("rejects a tampered workspaceId", () => {
    const sig = signActivation(base);
    const ok = verifyActivation({
      ...base,
      workspaceId: 99999,
      signature: sig,
    });
    expect(ok).toBe(false);
  });

  it("rejects a wrong signature length", () => {
    const ok = verifyActivation({
      ...base,
      signature: "short",
    });
    expect(ok).toBe(false);
  });

  it("treats missing optional invoice/subscription as empty strings", () => {
    const minimal = {
      workspaceId: 1,
      requestId: "r-1",
      status: "fail" as const,
    };
    const sig = signActivation(minimal);
    const ok = verifyActivation({ ...minimal, signature: sig });
    expect(ok).toBe(true);
  });
});

describe("makeCheckout signCheckout", () => {
  it("produces a deterministic 64-char hex signature", () => {
    const payload = {
      requestId: "r-1",
      workspaceId: 1,
      workspaceName: "Test Agency",
      plan: "pro" as const,
      planLabel: "Pro",
      billingPeriod: "yearly" as const,
      billingPeriodLabel: "שנתי",
      amount: 2508,
      currency: "ILS" as const,
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "0501234567",
        taxId: "123456789",
        taxIdType: "company" as const,
      },
      returnUrl: "https://example.com/billing/waiting",
      activationUrl: "https://example.com/api/billing/activate",
      issuedAt: "2026-05-07T13:30:00.000Z",
    };
    const sig1 = signCheckout(payload);
    const sig2 = signCheckout(payload);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
    expect(sig1).toBe(sig2);
  });
});

describe("makeCheckout newRequestId", () => {
  it("returns a 32-char hex string", () => {
    const id = newRequestId();
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });

  it("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newRequestId()));
    expect(ids.size).toBe(50);
  });
});

describe("makeCheckoutSdk surface", () => {
  it("exposes the helpers we use from billing.ts", () => {
    expect(typeof makeCheckoutSdk.signCheckout).toBe("function");
    expect(typeof makeCheckoutSdk.signActivation).toBe("function");
    expect(typeof makeCheckoutSdk.verifyActivation).toBe("function");
    expect(typeof makeCheckoutSdk.newRequestId).toBe("function");
    expect(typeof makeCheckoutSdk.postToMake).toBe("function");
  });
});
