import { getSessionToken } from '../lib/auth-storage';

// Display-only decode of the JWT payload. We never verify or trust this for
// auth decisions — the backend is the only thing that verifies the session.
function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function SessionDebugCard({ token }: { token: string | null }) {
  const current = token ?? getSessionToken();
  const payload = current ? decodePayload(current) : null;
  const sessionId =
    payload && (payload.sessionId ?? payload.sid ?? payload.jti);

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h2 className="mb-3 text-lg font-semibold">Raw session info</h2>

      {!current && <p className="text-slate-400">No session token.</p>}

      {current && (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Session token</div>
            <div className="break-all font-mono text-slate-200">
              {current.slice(0, 20)}…
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Session ID</div>
            <div className="break-all font-mono text-slate-200">
              {sessionId != null ? String(sessionId) : '—'}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
              Decoded JWT payload (unverified)
            </div>
            <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-xs text-slate-300">
              {payload ? JSON.stringify(payload, null, 2) : 'Token is not a decodable JWT.'}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
