import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  adminLogin,
  adminValidateTotp,
  adminLogout,
  ApiError,
} from '../lib/api';
import {
  clearAdminSession,
  getStoredAdmin,
  setAdminSession,
  type StoredAdmin,
} from '../lib/admin-auth';
import { getHashPath, navigate } from '../lib/hash-route';

interface DecodedRolePayload {
  sub: string;
  role: StoredAdmin['role'];
  type: string;
}

/** Pull `sub` and `role` from the JWT payload without verifying — only used for UI display. */
function decodeJwt(token: string): DecodedRolePayload | null {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as DecodedRolePayload;
  } catch {
    return null;
  }
}

export function AdminLoginCard({
  admin,
}: {
  admin: StoredAdmin | null;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');

  function finishLogin(
    accessToken: string,
    refreshToken: string,
    loginEmail: string,
  ): void {
    const decoded = decodeJwt(accessToken);
    setAdminSession({
      accessToken,
      refreshToken,
      admin: {
        id: decoded?.sub ?? '',
        email: loginEmail,
        role: decoded?.role ?? 'REVIEWER',
      },
    });
    setEmail('');
    setPassword('');
    setPreAuthToken(null);
    setTotpCode('');
    setError('');

    // If the user signed in from the main app, send them to the dashboard.
    if (!getHashPath().startsWith('/admin')) {
      navigate('/admin');
    }
  }

  const login = useMutation({
    mutationFn: adminLogin,
    onSuccess: (data, variables) => {
      if (data.requiresTotp) {
        setPreAuthToken(data.preAuthToken ?? null);
        setError('');
        return;
      }
      if (data.tokens) {
        finishLogin(data.tokens.accessToken, data.tokens.refreshToken, variables.email);
      }
    },
    onError: (e: ApiError) => setError(e.message),
  });

  const totpValidate = useMutation({
    mutationFn: adminValidateTotp,
    onSuccess: (tokens) => {
      finishLogin(tokens.accessToken, tokens.refreshToken, email || getStoredAdmin()?.email || '');
    },
    onError: (e: ApiError) => setError(e.message),
  });

  const logout = useMutation({
    mutationFn: adminLogout,
    onSuccess: () => clearAdminSession(),
    // Even on error, clear local state — token may already be invalid server-side.
    onError: () => clearAdminSession(),
  });

  // ── Logged-in view ──────────────────────────────────────────────────────────
  if (admin) {
    return (
      <section className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-amber-200">Admin session</h2>
            <p className="text-sm text-amber-300/80">
              {admin.email} · <span className="font-mono">{admin.role}</span>
            </p>
          </div>
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="rounded bg-amber-800 px-3 py-1.5 text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {logout.isPending ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </section>
    );
  }

  // ── TOTP step ───────────────────────────────────────────────────────────────
  if (preAuthToken) {
    return (
      <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Admin · two-factor</h2>
        <p className="text-sm text-slate-400">
          Enter the 6-digit code from your authenticator app, or an 8-character backup code.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.trim())}
            placeholder="123456 or backup code"
            className="flex-1 min-w-[200px] rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono text-slate-100 outline-none focus:border-amber-500"
          />
          <button
            onClick={() =>
              totpValidate.mutate({ preAuthToken, code: totpCode })
            }
            disabled={totpValidate.isPending || !totpCode}
            className="rounded bg-amber-700 px-4 py-2 text-sm hover:bg-amber-600 disabled:opacity-50"
          >
            {totpValidate.isPending ? 'Verifying…' : 'Verify'}
          </button>
          <button
            onClick={() => {
              setPreAuthToken(null);
              setTotpCode('');
              setError('');
            }}
            className="rounded bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </section>
    );
  }

  // ── Email + password step ───────────────────────────────────────────────────
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-4">
      <h2 className="text-lg font-semibold">Admin login</h2>
      <p className="text-sm text-slate-400">
        Separate from your user session. Required to review submissions or manage admin users.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username"
          placeholder="admin@arktion.app"
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Password (min 12 chars)"
          className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => login.mutate({ email, password })}
          disabled={login.isPending || !email || !password}
          className="rounded bg-amber-700 px-4 py-2 text-sm hover:bg-amber-600 disabled:opacity-50"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </section>
  );
}
