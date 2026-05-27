// Comma- or semicolon-separated list of emails that should automatically
// receive super-admin on login (SPARK staff). Falls back to anathemell@gmail.com
// for backwards compat with the original hardcoded list — set
// SUPER_ADMIN_EMAILS in env to override (recommended in production).
const parseSuperAdminEmails = (raw: string | undefined): Set<string> => {
  const source = raw && raw.trim().length > 0 ? raw : "anathemell@gmail.com";
  return new Set(
    source
      .split(/[,;]/)
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0)
  );
};

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  iCountApiKey: process.env.ICOUNT_API_KEY ?? "",
  iCountCompanyId: process.env.ICOUNT_COMPANY_ID ?? "",
  superAdminEmails: parseSuperAdminEmails(process.env.SUPER_ADMIN_EMAILS),
};
