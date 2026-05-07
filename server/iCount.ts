/**
 * iCount Standing Order (הוראת קבע באשראי) integration.
 *
 * Strategy:
 *   1. We POST to iCount API v3 (`api.icount.co.il/api/v3.php/...`) using the
 *      auth tuple `cid` (company id) + `user` + `token` injected as secrets.
 *   2. To open a recurring credit card subscription, we redirect the user to
 *      iCount's hosted "payment page" (קרדיט קבע) that they configured in
 *      their account. We pass the amount, plan name and metadata via signed
 *      query params; iCount calls back our `/api/icount/callback` URL once
 *      the card is captured and the standing order is created.
 *   3. To verify callbacks (no Stripe-style header signature is documented
 *      for hosted-pages — we adopt the safe pattern recommended in the
 *      community SDKs: re-sign the payload with HMAC-SHA256 keyed by the
 *      API token and compare).
 *
 * The contract here is intentionally minimal so we can swap iCount for
 * Tranzila/CardCom later without touching billing.ts.
 */
import crypto from "node:crypto";
import { ENV } from "./_core/env";

export interface CreateClientInput {
  workspaceId: number;
  workspaceName: string;
  taxId: string;
  taxIdType: "company" | "individual";
  contactPhone: string;
  contactEmail: string;
  contactName: string;
}

export interface PaymentPageInput {
  workspaceId: number;
  iCountClientId: string | null;
  amount: number;
  currency: "ILS";
  planLabel: string; // "Base / חודשי"
  periodLabel: "חודשי" | "שנתי";
  /** Absolute URL the user is bounced back to after capture. */
  successUrl: string;
  failureUrl: string;
  /** Server-side webhook URL iCount calls. */
  callbackUrl: string;
  /** Opaque token we generate per-request. Round-tripped to identify the workspace on callback. */
  state: string;
}

export interface PaymentPageResult {
  url: string;
  state: string;
}

export interface CallbackPayload {
  workspaceId: number;
  iCountSubscriptionId: string;
  iCountClientId: string;
  amount: number;
  status: "ok" | "fail";
  rawState: string;
  signature: string;
}

function isConfigured(): boolean {
  return Boolean(ENV.iCountApiToken && ENV.iCountCompanyId);
}

/**
 * Build the hosted payment-page URL for a standing-order capture.
 *
 * iCount-hosted-page params (from `help.icount.co.il/credit-card-processing/create-cc-page/`):
 *   - cid      = company id
 *   - sum      = amount in ILS
 *   - currency = ILS
 *   - desc     = description shown on receipt
 *   - email    = customer email (prefilled)
 *   - name     = customer name (prefilled)
 *   - vat_id   = customer ת״ז / ח.פ
 *   - tel      = phone
 *   - hp       = "1" → standing-order (Hora'at Keva), capture card without charge
 *   - cf{N}    = custom fields (we use cf1=workspaceId, cf2=state)
 *   - ok_url   = success redirect
 *   - err_url  = failure redirect
 *   - notify_url = server-to-server callback
 */
export function buildPaymentPageUrl(opts: {
  amount: number;
  description: string;
  email: string;
  name: string;
  phone: string;
  taxId: string;
  successUrl: string;
  failureUrl: string;
  callbackUrl: string;
  workspaceId: number;
  state: string;
}): string {
  if (!isConfigured()) {
    throw new Error("iCount is not configured (missing ICOUNT_COMPANY_ID / ICOUNT_API_TOKEN)");
  }
  const base = `${ENV.iCountBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(ENV.iCountCompanyId)}`;
  const params = new URLSearchParams({
    sum: String(opts.amount),
    currency: "ILS",
    desc: opts.description,
    email: opts.email,
    name: opts.name,
    tel: opts.phone,
    vat_id: opts.taxId,
    hp: "1",
    cf1: String(opts.workspaceId),
    cf2: opts.state,
    ok_url: opts.successUrl,
    err_url: opts.failureUrl,
    notify_url: opts.callbackUrl,
  });
  return `${base}?${params.toString()}`;
}

/**
 * Compute HMAC-SHA256 over a stable string of the callback payload, keyed by
 * the iCount API token. Used to defeat replay/forgery on `/api/icount/callback`.
 */
export function signCallback(state: string, workspaceId: number, subscriptionId: string): string {
  const data = `${workspaceId}:${state}:${subscriptionId}`;
  return crypto
    .createHmac("sha256", ENV.iCountApiToken || "no-token")
    .update(data)
    .digest("hex");
}

export function verifyCallback(
  state: string,
  workspaceId: number,
  subscriptionId: string,
  signature: string,
): boolean {
  const expected = signCallback(state, workspaceId, subscriptionId);
  // Constant-time compare to prevent timing leaks.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Generate the opaque single-use state token round-tripped through iCount.
 * Embeds workspaceId + a random nonce so we can identify the workspace even
 * if cf1 is dropped by some edge proxy.
 */
export function newState(workspaceId: number): string {
  const nonce = crypto.randomBytes(12).toString("hex");
  return `${workspaceId}.${nonce}`;
}

export function parseState(state: string): { workspaceId: number; nonce: string } | null {
  const [wsRaw, nonce] = state.split(".");
  const ws = Number(wsRaw);
  if (!Number.isFinite(ws) || ws <= 0 || !nonce) return null;
  return { workspaceId: ws, nonce };
}

/**
 * Stub for creating an iCount client (לקוח) record so future invoices are
 * issued against the right entity. The hosted-page already creates one
 * automatically on first capture, so we keep this best-effort and idempotent.
 */
export async function createICountClient(input: CreateClientInput): Promise<string | null> {
  if (!isConfigured()) return null;
  try {
    const url = `https://api.icount.co.il/api/v3.php/client/create_or_update`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cid: ENV.iCountCompanyId,
        user: ENV.iCountApiUser,
        token: ENV.iCountApiToken,
        client_name: input.workspaceName,
        client_type_id: input.taxIdType === "company" ? 1 : 2,
        vat_id: input.taxId,
        phone: input.contactPhone,
        email: input.contactEmail,
        contact_name: input.contactName,
      }),
    });
    if (!res.ok) {
      console.warn("[iCount] createClient HTTP", res.status);
      return null;
    }
    const data = (await res.json()) as { status?: boolean; client_id?: string | number };
    if (!data.status || !data.client_id) {
      console.warn("[iCount] createClient response", data);
      return null;
    }
    return String(data.client_id);
  } catch (err) {
    console.warn("[iCount] createClient error", err);
    return null;
  }
}

export const iCountSdk = {
  isConfigured,
  buildPaymentPageUrl,
  signCallback,
  verifyCallback,
  newState,
  parseState,
  createICountClient,
};
