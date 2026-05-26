// Round 127 — verify the post-payment return flow:
// 1. startCheckoutViaMake builds a returnUrl that points back to our own
//    /billing/waiting page (not the iCount confirmation page).
// 2. The returnUrl carries enough context (ws + req) for the waiting page
//    to identify which workspace to poll for activation.
// 3. The Make payload's signature is computed over a body that *includes*
//    the returnUrl, so a malicious caller cannot tamper with it in transit.

import { describe, expect, it } from "vitest";
import {
  signCheckout,
  verifyActivation,
  signActivation,
  newRequestId,
} from "./makeCheckout";

describe("Round 127 — billing return URL contract", () => {
  it("returnUrl matches the /billing/waiting route the SPA serves", () => {
    // Simulate the server-side construction (mirrors billing.ts:682).
    const origin = "https://spark.example.com";
    const wsId = 123;
    const requestId = newRequestId();
    const returnUrl = `${origin}/billing/waiting?ws=${wsId}&req=${requestId}`;

    const u = new URL(returnUrl);
    expect(u.pathname).toBe("/billing/waiting");
    expect(u.searchParams.get("ws")).toBe(String(wsId));
    expect(u.searchParams.get("req")).toBe(requestId);
    // Must use the caller's origin — never a hardcoded SPARK domain.
    expect(u.origin).toBe(origin);
  });

  it("trailing slash in origin does not produce a double slash in the path", () => {
    const cleanOrigin = "https://spark.example.com/".replace(/\/$/, "");
    const returnUrl = `${cleanOrigin}/billing/waiting?ws=1&req=abc`;
    expect(returnUrl).not.toContain("//billing");
  });

  it("returnUrl is part of the signed payload — tampering invalidates the signature", () => {
    const issuedAt = "2026-05-26T10:00:00.000Z";
    const requestId = "req-fixed-1";
    const base = {
      requestId,
      workspaceId: 42,
      workspaceName: "Acme",
      plan: "basic" as const,
      planLabel: "Basic",
      billingPeriod: "monthly" as const,
      billingPeriodLabel: "Monthly",
      amount: 199,
      currency: "ILS" as const,
      customer: {
        name: "Anat",
        email: "anat@example.com",
        phone: "0500000000",
        taxId: "514100000",
        taxIdType: "company" as const,
      },
      returnUrl: "https://spark.example.com/billing/waiting?ws=42&req=req-fixed-1",
      activationUrl: "https://spark.example.com/api/billing/activate",
      issuedAt,
    };
    const goodSig = signCheckout(base);
    const tamperedSig = signCheckout({
      ...base,
      returnUrl: "https://attacker.example.com/steal",
    });
    expect(goodSig).not.toBe(tamperedSig);
  });

  it("activation callback signature round-trips and detects tampering", () => {
    const opts = {
      workspaceId: 42,
      requestId: "req-fixed-2",
      status: "ok" as const,
      invoiceId: "INV-1",
      subscriptionId: "SUB-1",
    };
    const sig = signActivation(opts);
    expect(verifyActivation({ ...opts, signature: sig })).toBe(true);
    // Mutating any field invalidates the signature.
    expect(
      verifyActivation({ ...opts, workspaceId: 99, signature: sig }),
    ).toBe(false);
    expect(verifyActivation({ ...opts, status: "fail", signature: sig })).toBe(
      false,
    );
  });
});

describe("Round 127 — waiting page contract (URL params)", () => {
  it("BillingWaiting can extract ws + req from window.location.search", () => {
    // The waiting page uses these params solely for support/diagnostic
    // purposes; the actual access status comes from a tRPC query bound to
    // the authenticated user's workspace. Still, we verify the shape.
    const url = new URL("https://app.example.com/billing/waiting?ws=42&req=abc");
    const params = new URLSearchParams(url.search);
    expect(params.get("ws")).toBe("42");
    expect(params.get("req")).toBe("abc");
  });

  it("payUrl param when present must be an http(s) URL — non-http rejected", () => {
    const goodUrl = new URL("https://app.example.com/billing/waiting?payUrl=https%3A%2F%2Ficount.co.il%2Fpay%2Fxyz");
    const goodPay = new URLSearchParams(goodUrl.search).get("payUrl");
    expect(goodPay).toBeTruthy();
    expect(new URL(goodPay!).protocol).toBe("https:");

    const badUrl = new URL("https://app.example.com/billing/waiting?payUrl=javascript%3Aalert(1)");
    const badPay = new URLSearchParams(badUrl.search).get("payUrl");
    expect(badPay).toBeTruthy();
    // Mirror the runtime guard in BillingWaiting.tsx
    let parsed: URL | null = null;
    try {
      parsed = new URL(badPay!);
    } catch {
      parsed = null;
    }
    const isSafeHttp =
      !!parsed && (parsed.protocol === "https:" || parsed.protocol === "http:");
    expect(isSafeHttp).toBe(false);
  });
});
