import { useEffect, useState } from 'react';
import { AUTH_CHANGED_EVENT } from './lib/api';
import { getSessionToken, getStoredUser } from './lib/auth-storage';
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

// Admin wallet comes from the env — same address that holds the AdminCap.
const ADMIN_WALLET = import.meta.env.VITE_ADMIN_WALLET_ADDRESS as string | undefined;

function App() {
  const [token, setToken] = useState<string | null>(getSessionToken());
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');

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
  const user = getStoredUser();
  const isAdmin = !!(ADMIN_WALLET && user?.walletAddress === ADMIN_WALLET);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header>
          <h1 className="text-2xl font-bold">Arktion API test UI</h1>
          <p className="text-sm text-slate-400">
            Exercises the backend at{' '}
            <span className="font-mono">{import.meta.env.VITE_API_BASE_URL}</span>
            {isAdmin && <span className="ml-3 rounded bg-amber-800 px-2 py-0.5 text-xs font-medium text-amber-200">Admin</span>}
          </p>
        </header>

        <HealthCard />
        <AuthCard token={token} />

        {/* Always visible — series browser is public */}
        <SeriesCard onSelectSeries={(id) => setSelectedSeriesId(id)} />

        {authed && <ProfileCard />}
        {authed && <PassportCard />}
        {authed && <InkCard />}
        {authed && <BadgesCard />}
        {authed && <ReadingCard prefillSeriesId={selectedSeriesId} />}
        {authed && <JournalCard />}
        {authed && <SubmissionCard isAdmin={isAdmin} />}

        <SessionDebugCard token={token} />
      </div>
    </div>
  );
}

export default App;
