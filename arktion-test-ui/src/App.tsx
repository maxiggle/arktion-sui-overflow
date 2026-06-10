import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT } from './lib/api';
import { getSessionToken } from './lib/auth-storage';
import {
  ADMIN_AUTH_CHANGED_EVENT,
  getAdminToken,
  getStoredAdmin,
  type StoredAdmin,
} from './lib/admin-auth';
import { navigate, useHashPath } from './lib/hash-route';
import { HealthCard } from './components/HealthCard';
import { AuthCard } from './components/AuthCard';
import { ProfileCard } from './components/ProfileCard';
import { PassportCard } from './components/PassportCard';
import { SessionDebugCard } from './components/SessionDebugCard';
import { InkCard } from './components/InkCard';
import { BadgesCard } from './components/BadgesCard';
import { SeriesCard } from './components/SeriesCard';
import { ReadingCard } from './components/ReadingCard';
import { JournalCard } from './components/JournalCard';
import { SubmissionCard } from './components/SubmissionCard';
import { ReaderCard } from './components/ReaderCard';
import { AdminDashboard } from './components/AdminDashboard';
import type { SeriesDto } from './lib/api';

function App() {
  const [token, setToken] = useState<string | null>(getSessionToken());
  const [admin, setAdmin] = useState<StoredAdmin | null>(getStoredAdmin());
  const [selectedSeries, setSelectedSeries] = useState<SeriesDto | null>(null);
  const path = useHashPath();

  useEffect(() => {
    const syncUser = () => setToken(getSessionToken());
    const syncAdmin = () => setAdmin(getAdminToken() ? getStoredAdmin() : null);
    window.addEventListener(AUTH_CHANGED_EVENT, syncUser);
    window.addEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAdmin);
    window.addEventListener('storage', syncUser);
    window.addEventListener('storage', syncAdmin);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncUser);
      window.removeEventListener(ADMIN_AUTH_CHANGED_EVENT, syncAdmin);
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('storage', syncAdmin);
    };
  }, []);

  // Route: admin dashboard lives at /#/admin.
  if (path.startsWith('/admin')) {
    return <AdminDashboard admin={admin} />;
  }

  const authed = !!token;
  const isAdmin = !!admin;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Arktion API test UI</h1>
            <p className="text-sm text-slate-400">
              Exercises the backend at{' '}
              <span className="font-mono">
                {import.meta.env.VITE_API_BASE_URL}
              </span>
              {isAdmin && (
                <span className="ml-3 rounded bg-amber-800 px-2 py-0.5 text-xs font-medium text-amber-200">
                  Admin · {admin.role}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="rounded border border-amber-700/60 bg-amber-950/40 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-900/40 whitespace-nowrap"
            title={isAdmin ? 'Open admin dashboard' : 'Admin sign-in'}
          >
            {isAdmin ? 'Admin dashboard →' : 'Admin login →'}
          </button>
        </header>

        <HealthCard />
        <AuthCard token={token} />

        {/* Always visible — series browser is public */}
        <SeriesCard onSelectSeries={(s) => setSelectedSeries(s)} />

        {/* Reader is public — sign-in only required to track progress + earn INK */}
        <ReaderCard series={selectedSeries} authed={authed} />

        {authed && <ProfileCard />}
        {authed && <PassportCard />}
        {authed && <InkCard />}
        {authed && <BadgesCard />}
        {authed && <ReadingCard prefillSeriesId={selectedSeries?.id ?? ''} />}
        {authed && <JournalCard />}
        {authed && <SubmissionCard isAdmin={isAdmin} />}

        <SessionDebugCard token={token} />
      </div>
    </div>
  );
}

export default App;
