/**
 * Auth helpers: localStorage wrappers and the Google OAuth redirect URL builder.
 *
 * Auth flow used here:
 *   1.  Frontend redirects user to Google OAuth with response_type=id_token
 *   2.  Google redirects back to /auth/callback#id_token=<JWT>
 *   3.  Callback page reads the hash, POSTs { jwt } to POST /auth/zklogin/complete
 *   4.  Backend verifies the JWT, derives the Sui address, bootstraps on-chain
 *       identity on first login, and returns { sessionToken, isNewUser, user }
 *   5.  Frontend stores sessionToken in localStorage, redirects based on isNewUser
 */

export const SESSION_KEY = "arktion_session";
export const NONCE_KEY = "arktion_oauth_nonce";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearStoredAuth(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Build the Google OAuth authorization URL and store the nonce in sessionStorage
 * so the callback page can verify it (defence against replay attacks).
 *
 * Prerequisites (Google Cloud Console):
 *   - OAuth 2.0 Client ID → Web application
 *   - Authorised JavaScript origins: http://localhost:3000 (dev)
 *   - Authorised redirect URIs: http://localhost:3000/auth/callback (dev)
 *
 * Frontend env var: NEXT_PUBLIC_GOOGLE_CLIENT_ID
 */
export function buildGoogleOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  const nonce = crypto.randomUUID();
  sessionStorage.setItem(NONCE_KEY, nonce);

  const redirectUri = `${window.location.origin}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Extract the id_token from the URL fragment after Google redirects back.
 * Returns null if the fragment is missing or malformed.
 */
export function extractIdTokenFromHash(hash: string): string | null {
  // hash looks like "#id_token=JWT&token_type=Bearer&..."
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("id_token");
}

/**
 * Extract an OAuth error message from the URL fragment, if present.
 */
export function extractOAuthError(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_description") ?? params.get("error");
}
