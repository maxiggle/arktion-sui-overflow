import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT } from './lib/api';
import { getSessionToken } from './lib/auth-storage';
import { HealthCard } from './components/HealthCard';
import { AuthCard } from './components/AuthCard';
import { ProfileCard } from './components/ProfileCard';
import { PassportCard } from './components/PassportCard';
import { SessionDebugCard } from './components/SessionDebugCard';

function App() {
  const [token, setToken] = useState<string | null>(getSessionToken());

  // Single source of truth is localStorage; re-read it whenever auth changes
  // (sign-in, logout, or a 401 that cleared the session) or another tab updates it.
  useEffect(() => {
    const sync = () => setToken(getSessionToken());
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const authed = !!token;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <h1 className="text-2xl font-bold">Arktion API test UI</h1>
          <p className="text-sm text-slate-400">
            Exercises the backend at{' '}
            <span className="font-mono">{import.meta.env.VITE_API_BASE_URL}</span>
          </p>
        </header>

        <HealthCard />
        <AuthCard token={token} />

        {authed && <ProfileCard />}
        {authed && <PassportCard />}

        <SessionDebugCard token={token} />
      </div>
    </div>
  );
}

export default App;
