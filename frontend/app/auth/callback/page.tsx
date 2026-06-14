"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  getEphemeralState,
  requestZkProof,
  storeZkState,
} from "@/lib/zklogin";

/**
 * OAuth callback — Google redirects here after sign-in.
 *
 * URL fragment: /auth/callback#id_token=<JWT>&token_type=Bearer&...
 *
 * Steps:
 *   1. Extract id_token from URL fragment.
 *   2. Restore ephemeral keypair from sessionStorage.
 *   3. In parallel: complete sign-in with the backend AND request a ZK proof
 *      from Enoki (via backend proxy). Both need the JWT; neither blocks the
 *      other.
 *   4. Store the proof + addressSeed in sessionStorage.
 *   5. Redirect to /onboarding (new user) or /dashboard (returning user).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { completeSignIn } = useAuth();
  const processed = useRef(false);

  async function handleCallback() {
    const hash = window.location.hash;

    const oauthError = extractOAuthError(hash);
    if (oauthError) {
      router.replace(`/sign-in?error=${encodeURIComponent(oauthError)}`);
      return;
    }

    const idToken = extractIdToken(hash);
    if (!idToken) {
      router.replace("/sign-in?error=no_token");
      return;
    }

    const ephemeral = getEphemeralState();
    if (!ephemeral) {
      router.replace("/sign-in?error=session_expired");
      return;
    }

    try {
      // Run sign-in and ZK proof in parallel — both only need the JWT.
      // Backend calls Enoki for the wallet address during completeSignIn;
      // the ZKP call also goes to Enoki via our backend proxy.
      const [signInResult, proof] = await Promise.all([
        completeSignIn(idToken),
        requestZkProof({
          jwt: idToken,
          keypair: ephemeral.keypair,
          maxEpoch: ephemeral.maxEpoch,
          randomness: ephemeral.randomness,
        }),
      ]);

      storeZkState({
        proof,
        maxEpoch: ephemeral.maxEpoch,
        randomness: ephemeral.randomness,
        keypairSecret: ephemeral.keypair.getSecretKey(),
      });

      router.replace(signInResult.isNewUser ? "/onboarding" : "/dashboard");
    } catch {
      router.replace("/sign-in?error=auth_failed");
    }
  }

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center bg-black px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <span className="block h-7 w-7 rounded-full border-2 border-white/15 border-t-white/80 animate-spin" />
        <div>
          <p className="text-sm text-white/80">completing sign in…</p>
          <p className="mt-1 text-xs text-white/30">
            setting up your arktionpassport
          </p>
        </div>
      </div>
    </div>
  );
}

function extractIdToken(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("id_token");
}

function extractOAuthError(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_description") ?? params.get("error");
}
