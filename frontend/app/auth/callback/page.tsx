"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { extractIdTokenFromHash, extractOAuthError } from "@/lib/auth";
import { useAuth } from "@/contexts/auth-context";

/**
 * OAuth callback — Google redirects here after sign-in.
 *
 * URL looks like:
 *   /auth/callback#id_token=<JWT>&token_type=Bearer&...
 *
 * Steps:
 *   1. Read id_token from the URL fragment (only available in the browser)
 *   2. POST { jwt: idToken } to the backend via completeSignIn
 *   3. Backend verifies, bootstraps on-chain identity if new user, returns session
 *   4. Redirect to /onboarding (new user) or /dashboard (returning user)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { completeSignIn } = useAuth();
  // Guard against StrictMode double-invocation
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash;

    // Surface errors from Google (user denied consent, etc.)
    const oauthError = extractOAuthError(hash);
    if (oauthError) {
      router.replace(
        `/sign-in?error=${encodeURIComponent(oauthError)}`,
      );
      return;
    }

    const idToken = extractIdTokenFromHash(hash);
    if (!idToken) {
      router.replace("/sign-in?error=no_token");
      return;
    }

    completeSignIn(idToken)
      .then((result) => {
        router.replace(result.isNewUser ? "/onboarding" : "/dashboard");
      })
      .catch(() => {
        router.replace("/sign-in?error=auth_failed");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center bg-black px-6">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Spinner */}
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
