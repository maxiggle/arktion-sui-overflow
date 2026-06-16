/**
 * Auth helpers: localStorage wrappers and the Google OAuth redirect URL builder.
 *
 * Full zkLogin flow:
 *   1.  buildGoogleOAuthUrl() — fetch current epoch, generate ephemeral Ed25519
 *       keypair, compute nonce from keypair + maxEpoch + randomness, persist
 *       ephemeral state in sessionStorage, return Google OAuth URL.
 *   2.  Google redirects back to /auth/callback#id_token=<JWT>
 *   3.  Callback page: POST { jwt } to /auth/zklogin/salt → get user salt.
 *   4.  Callback page: POST to Mysten prover with jwt + ephemeral pubkey + salt
 *       → get ZK proof; store proof + salt + sub + aud in sessionStorage.
 *   5.  Callback page: POST { jwt } to /auth/zklogin/complete → session token.
 *   6.  For on-chain ops (USDC tips): backend builds PTB bytes, frontend signs
 *       with signWithZkLogin() from lib/zklogin.ts, backend co-signs as gas
 *       sponsor and submits.
 */

import { apiClient } from "@/lib/api/client";
import { initEphemeralKeypair } from "@/lib/zklogin";

export const SESSION_KEY = "arktion_session";

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
 * Build the Google OAuth URL for zkLogin.
 *
 * Fetches the current Sui epoch from the backend, generates an ephemeral
 * Ed25519 keypair, and derives the nonce from the keypair + maxEpoch so
 * Google embeds it in the returned id_token. The ephemeral state (keypair
 * secret + maxEpoch + randomness) is persisted in sessionStorage so the
 * callback page can read it after the redirect.
 */
export async function buildGoogleOAuthUrl(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");

  const { data } = await apiClient.get<{ epoch: number; maxEpoch: number }>(
    "/auth/epoch",
  );

  const { nonce } = initEphemeralKeypair(data.maxEpoch);

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
