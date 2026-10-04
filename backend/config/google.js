const { google } = require("googleapis");

function getGoogleOAuthConfig(env = process.env) {
  const clientId = String(env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(env.GOOGLE_CLIENT_SECRET || "").trim();
  const redirectUri = String(env.GOOGLE_REDIRECT_URI || "").trim();
  const isPlaceholder = (value) => !value || /your_|replace_with|placeholder|changeme|example/i.test(value);

  if ([clientId, clientSecret, redirectUri].some(isPlaceholder)) return null;

  let parsedRedirectUri;
  try {
    parsedRedirectUri = new URL(redirectUri);
  } catch {
    return null;
  }

  const isLocalhost = ["localhost", "127.0.0.1"].includes(parsedRedirectUri.hostname);
  if (parsedRedirectUri.protocol !== "https:" && !isLocalhost) return null;
  if (!parsedRedirectUri.pathname.endsWith("/api/auth/google/meet/callback")) return null;

  return { clientId, clientSecret, redirectUri };
}

function createGoogleOAuthClient(env = process.env) {
  const config = getGoogleOAuthConfig(env);
  if (!config) return null;
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

module.exports = {
  google,
  getGoogleOAuthConfig,
  createGoogleOAuthClient,
};