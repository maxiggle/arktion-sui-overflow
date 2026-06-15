import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ApiError, completeZkLogin, logout, notifyAuthChanged } from '../lib/api';
import { clearSession, getStoredUser, setSession } from '../lib/auth-storage';
import {
  beginZkLogin,
  clearEphemeralState,
  clearOAuthHash,
  readIdTokenFromHash,
} from '../lib/zklogin';

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="break-all font-mono text-sm text-slate-200">{value ?? '—'}</div>
    </div>
  );
}

export function AuthCard({ token }: { token: string | null }) {
  const [signInError, setSignInError] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  const exchange = useMutation({
    mutationFn: (jwt: string) => completeZkLogin(jwt),
    onSuccess: (res) => {
      setSession(res.sessionToken, res.user);
      clearEphemeralState();
      clearOAuthHash();
      notifyAuthChanged();
    },
    onError: (err) => {
      setSignInError(err instanceof ApiError ? err.message : String(err));
      clearOAuthHash();
    },
  });

  // On return from the Google OAuth redirect, pull the id_token out of the URL
  // fragment and exchange it for a backend session token. Guarded so React's
  // StrictMode double-mount doesn't fire the exchange twice.
  useEffect(() => {
    if (token || exchangeStarted.current) return;
    const idToken = readIdTokenFromHash();
    if (idToken) {
      exchangeStarted.current = true;
      exchange.mutate(idToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    // Even if the call fails (e.g. already-expired token), clear local state.
    onSettled: () => {
      clearSession();
      notifyAuthChanged();
    },
  });

  async function handleSignIn() {
    setSignInError(null);
    try {
      await beginZkLogin();
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : String(err));
    }
  }

  const user = getStoredUser();

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h2 className="mb-3 text-lg font-semibold">Sign in</h2>

      {token && user ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Wallet address" value={user.walletAddress} />
            <Field label="Email" value={user.email} />
            <Field label="Display name" value={user.displayName} />
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={exchange.isPending}
            className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {exchange.isPending ? 'Completing sign-in…' : 'Sign in with Google (zkLogin)'}
          </button>
          {signInError && <p className="text-red-400">{signInError}</p>}
        </div>
      )}
    </section>
  );
}
