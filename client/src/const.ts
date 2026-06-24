export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => buildAuthUrl("signIn");

// Same flow as login but tells the OAuth portal to default to the signup tab
// (Manus portal accepts type=signUp and pre-selects the registration form).
export const getSignupUrl = () => buildAuthUrl("signUp");

// True when the OAuth portal is configured and produces a real auth URL.
// `buildAuthUrl` degrades to the inert "#" link when VITE_OAUTH_PORTAL_URL is
// missing/invalid (preview / CI / misconfigured build); in that state the
// public marketing & demo pages should hide their login/signup CTAs rather than
// render a button that navigates nowhere. In production (env set) this is true,
// so behaviour is unchanged.
export const isAuthConfigured = () => getLoginUrl() !== "#";

function buildAuthUrl(type: "signIn" | "signUp") {
  try {
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    const appId = import.meta.env.VITE_APP_ID;
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", type);

    return url.toString();
  } catch {
    // OAuth portal not configured (e.g. missing/invalid VITE_OAUTH_PORTAL_URL in
    // a preview / CI / misconfigured build). Degrade to an inert link instead of
    // throwing: a bad login URL must never crash the public marketing & demo
    // pages (every page renders the header, which builds this URL eagerly).
    return "#";
  }
}
