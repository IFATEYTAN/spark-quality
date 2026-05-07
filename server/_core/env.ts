export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // iCount integration (cloud invoicing + Hosted Checkout). User provides these in Manus Settings -> Secrets.
  // ICOUNT_API_TOKEN replaces the legacy ICOUNT_API_KEY name.
  iCountApiToken: process.env.ICOUNT_API_TOKEN ?? process.env.ICOUNT_API_KEY ?? "",
  iCountApiUser: process.env.ICOUNT_API_USER ?? "",
  iCountCompanyId: process.env.ICOUNT_COMPANY_ID ?? "",
  // Public host iCount uses for Hosted Checkout. The official URL is api.icount.co.il for prod and demo.icount.co.il for sandbox.
  iCountBaseUrl: process.env.ICOUNT_BASE_URL ?? "https://api.icount.co.il/api/v3.php",
};
