export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // LLM model routed through the Forge OpenAI-compatible proxy. Defaults to
  // Claude Sonnet 4.6 (best quality for the report analysis + AI Composer). Can
  // be overridden via LLM_MODEL if the proxy expects a different model id.
  forgeModel: process.env.LLM_MODEL ?? "claude-sonnet-4-6",
  // iCount integration (cloud invoicing + Hosted Checkout). User provides these in Manus Settings -> Secrets.
  // ICOUNT_API_TOKEN replaces the legacy ICOUNT_API_KEY name.
  iCountApiToken: process.env.ICOUNT_API_TOKEN ?? process.env.ICOUNT_API_KEY ?? "",
  iCountApiUser: process.env.ICOUNT_API_USER ?? "",
  iCountCompanyId: process.env.ICOUNT_COMPANY_ID ?? "",
  // Public host iCount uses for Hosted Checkout. The official URL is api.icount.co.il for prod and demo.icount.co.il for sandbox.
  iCountBaseUrl: process.env.ICOUNT_BASE_URL ?? "https://api.icount.co.il/api/v3.php",
  // Make.com webhook URL — the user (SPARK) controls a Make scenario that
  // receives the JSON checkout payload, opens the iCount payment page, and
  // POSTs back to /api/billing/activate when the payment is confirmed. This is
  // the *production* path for taking payments. The legacy direct-iCount
  // integration is kept only as a fallback / debug tool.
  makePaymentWebhookUrl:
    process.env.MAKE_PAYMENT_WEBHOOK_URL ??
    "https://hook.eu1.make.com/35kisdafvvmvnm1dbezy2bg8wridh0hw",
  // Shared secret used to (a) sign the JSON we POST to Make and (b) verify the
  // activation callback Make POSTs back to us. Primary env is
  // MAKE_BILLING_SHARED_SECRET (matches the docs in MAKE_BILLING_CALLBACK.md);
  // legacy MAKE_WEBHOOK_SECRET kept as fallback for older deployments.
  makeWebhookSecret:
    process.env.MAKE_BILLING_SHARED_SECRET ??
    process.env.MAKE_WEBHOOK_SECRET ??
    "spark-quality-make-shared-secret",
  // Stable public origin used to build links inside transactional emails
  // (e.g. the activation success email). MUST be the user-facing domain,
  // never the internal Cloud Run host that webhook callers (Make.com,
  // iCount) hit. Defaults to the published Manus Space domain.
  publicAppUrl:
    (process.env.PUBLIC_APP_URL ?? "https://sparkquality-zqvpyevd.manus.space").replace(/\/+$/, ""),
};
