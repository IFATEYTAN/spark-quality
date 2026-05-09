/**
 * Make.com Webhook Checkout integration.
 *
 * Replaces direct iCount-hosted-page integration. Flow:
 *
 *   1. Client clicks a plan CTA in /pricing or /onboarding.
 *   2. tRPC `billing.startCheckoutViaMake` builds a JSON payload (workspace,
 *      plan, period, amount, customer info, taxId, returnUrl, requestId,
 *      signature) and POSTs it to the user's Make webhook URL.
 *   3. Make scenario (controlled by SPARK staff) opens an iCount payment page
 *      with the right amount/customer/standing-order setup and returns a
 *      payment URL (or just acknowledges receipt and emails it to the user).
 *   4. After the payer completes payment, the Make scenario POSTs to
 *      `/api/billing/activate` on this server. The route validates the HMAC,
 *      flips the workspace to `subscriptionStatus=active` and sets
 *      `subscriptionEndsAt` according to the chosen period.
 *
 * SPARK staff retain full control on Make over which scenario runs, what the
 * iCount page looks like, and which products are charged — without us touching
 * iCount API tokens directly.
 */
import crypto from "node:crypto";
import { ENV } from "./_core/env";

export interface MakeCheckoutPayload {
  /** Stable identifier so Make can retry without double-charging. */
  requestId: string;
  workspaceId: number;
  workspaceName: string;
  plan: "basic" | "pro" | "premium";
  planLabel: string;
  billingPeriod: "monthly" | "yearly";
  billingPeriodLabel: string;
  /** Amount the customer should be charged, in ILS. */
  amount: number;
  currency: "ILS";
  /** Customer details, prefilled from the workspace. */
  customer: {
    name: string;
    email: string;
    phone: string;
    taxId: string;
    taxIdType: "company" | "individual";
  };
  /** Where the user should be returned after payment (frontend route). */
  returnUrl: string;
  /** Pre-built activation callback URL Make is expected to POST to. */
  activationUrl: string;
  /** ISO timestamp at which the request was issued. */
  issuedAt: string;
  /** HMAC signature of the canonical payload, keyed by MAKE_WEBHOOK_SECRET. */
  signature: string;
}

/**
 * Build the canonical string we sign. Sorted keys, JSON-stable. The signature
 * field itself is excluded from the signed body.
 */
function canonicalize(input: Omit<MakeCheckoutPayload, "signature">): string {
  return JSON.stringify({
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    plan: input.plan,
    billingPeriod: input.billingPeriod,
    amount: input.amount,
    currency: input.currency,
    customer: {
      name: input.customer.name,
      email: input.customer.email,
      phone: input.customer.phone,
      taxId: input.customer.taxId,
      taxIdType: input.customer.taxIdType,
    },
    returnUrl: input.returnUrl,
    activationUrl: input.activationUrl,
    issuedAt: input.issuedAt,
  });
}

export function signCheckout(input: Omit<MakeCheckoutPayload, "signature">): string {
  return crypto
    .createHmac("sha256", ENV.makeWebhookSecret)
    .update(canonicalize(input))
    .digest("hex");
}

/**
 * Verify the signature on an incoming activation callback. Make is expected to
 * include the same `requestId` and `workspaceId` it received, plus its own
 * payment confirmation fields. We sign a small canonical string so the same
 * helper works for both directions.
 */
export function signActivation(opts: {
  workspaceId: number;
  requestId: string;
  status: "ok" | "fail";
  invoiceId?: string;
  subscriptionId?: string;
}): string {
  const data = [
    String(opts.workspaceId),
    opts.requestId,
    opts.status,
    opts.invoiceId ?? "",
    opts.subscriptionId ?? "",
  ].join("|");
  return crypto
    .createHmac("sha256", ENV.makeWebhookSecret)
    .update(data)
    .digest("hex");
}

export function verifyActivation(opts: {
  workspaceId: number;
  requestId: string;
  status: "ok" | "fail";
  invoiceId?: string;
  subscriptionId?: string;
  signature: string;
}): boolean {
  const expected = signActivation(opts);
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generate a request id (UUID-like). Used both as a Make idempotency key and
 * as the secret material that ties an activation callback back to a request.
 */
export function newRequestId(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Post the JSON payload to Make. Returns the raw HTTP status + response text
 * so the caller can decide how loud to be about non-2xx responses. Make
 * webhooks return 200 with body "Accepted" by default.
 *
 * If the Make scenario is configured to return a JSON body containing a
 * `paymentUrl` / `payment_url` / `url` field (or even a bare URL string), we
 * surface it as `paymentUrl` so the client can open the iCount checkout in a
 * new tab. When no URL is present we still report success and the user is
 * told a payment link will arrive by email (legacy flow).
 */
export async function postToMake(payload: MakeCheckoutPayload): Promise<{
  ok: boolean;
  status: number;
  body: string;
  paymentUrl?: string;
}> {
  if (!ENV.makePaymentWebhookUrl) {
    throw new Error("MAKE_PAYMENT_WEBHOOK_URL is not configured");
  }
  const res = await fetch(ENV.makePaymentWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Spark-Signature": payload.signature,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body, paymentUrl: extractPaymentUrl(body) };
}

/**
 * Extract a payment URL from a Make webhook response body. Tolerates:
 *   - Empty / non-JSON bodies (returns undefined)
 *   - JSON with `{ paymentUrl: "..." }` / `payment_url` / `url`
 *   - Nested `{ data: { paymentUrl: "..." } }` (a common Make pattern)
 *   - A bare URL string (no JSON envelope)
 * Validates the value is an http(s) URL before returning it.
 */
export function extractPaymentUrl(body: string): string | undefined {
  if (!body) return undefined;
  const trimmed = body.trim();
  if (!trimmed) return undefined;

  const isHttpUrl = (val: unknown): val is string => {
    if (typeof val !== "string") return false;
    try {
      const u = new URL(val);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  };

  // Bare URL response
  if (isHttpUrl(trimmed)) return trimmed;

  // JSON response
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const candidates = [
        obj.paymentUrl,
        obj.payment_url,
        obj.url,
        obj.checkoutUrl,
        obj.checkout_url,
        obj.hostedUrl,
      ];
      for (const c of candidates) {
        if (isHttpUrl(c)) return c;
      }
      const data = obj.data;
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        const nested = [
          d.paymentUrl,
          d.payment_url,
          d.url,
          d.checkoutUrl,
          d.checkout_url,
        ];
        for (const c of nested) {
          if (isHttpUrl(c)) return c;
        }
      }
    }
  } catch {
    // not JSON — fall through
  }
  return undefined;
}

export const makeCheckoutSdk = {
  canonicalize,
  signCheckout,
  signActivation,
  verifyActivation,
  newRequestId,
  postToMake,
  extractPaymentUrl,
};
