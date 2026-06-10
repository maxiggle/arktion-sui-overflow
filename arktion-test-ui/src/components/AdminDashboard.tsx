import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ApiError, adminLogout } from '../lib/api';
import {
  clearAdminSession,
  type StoredAdmin,
} from '../lib/admin-auth';
import { navigate } from '../lib/hash-route';
import { AdminLoginCard } from './AdminLoginCard';
import { AdminUsersCard } from './AdminUsersCard';
import { AdminSubmissionsView } from './AdminSubmissionsView';

type Tab = 'submissions' | 'users' | 'overview';

const TABS: Array<{ id: Tab; label: string; superAdminOnly?: boolean }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'users', label: 'Admin users', superAdminOnly: true },
];

export function AdminDashboard({ admin }: { admin: StoredAdmin | null }) {
  const [tab, setTab] = useState<Tab>('overview');

  const logout = useMutation({
    mutationFn: adminLogout,
    onSuccess: () => {
      clearAdminSession();
      navigate('/');
    },
    // Even if the server call fails (e.g. token already invalid), drop local state.
    onError: () => {
      clearAdminSession();
      navigate('/');
    },
  });

  // ── Not signed in: show login card and a back link ───────────────────────────
  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
          <AdminHeader admin={null} onLogout={() => undefined} loggingOut={false} />
          <AdminLoginCard admin={null} />
          <p className="text-sm text-slate-500">
            Don't have an admin account yet? Bootstrap one from the backend:{' '}
            <span className="font-mono">
              pnpm bootstrap:admin you@example.com YourSecret123!
            </span>
          </p>
        </div>
      </div>
    );
  }

  const visibleTabs = TABS.filter(
    (t) => !t.superAdminOnly || admin.role === 'SUPER_ADMIN',
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <AdminHeader
          admin={admin}
          onLogout={() => logout.mutate()}
          loggingOut={logout.isPending}
        />

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-slate-700">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && <OverviewPanel admin={admin} setTab={setTab} />}
        {tab === 'submissions' && (
          <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <AdminSubmissionsView />
          </section>
        )}
        {tab === 'users' && admin.role === 'SUPER_ADMIN' && (
          <AdminUsersCard self={admin} />
        )}
        {tab === 'users' && admin.role !== 'SUPER_ADMIN' && (
          <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <p className="text-sm text-slate-400">
              SUPER_ADMIN role required.
            </p>
          </section>
        )}

        {logout.error && (
          <p className="text-sm text-red-400">
            {(logout.error as ApiError).message}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function AdminHeader({
  admin,
  onLogout,
  loggingOut,
}: {
  admin: StoredAdmin | null;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Arktion · Admin</h1>
          {admin && (
            <span className="rounded bg-amber-800 px-2 py-0.5 text-xs font-medium text-amber-200">
              {admin.role}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {admin
            ? `Signed in as ${admin.email}`
            : 'Sign in to review submissions and manage admin users.'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="rounded border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
        >
          ← Back to app
        </button>
        {admin && (
          <button
            onClick={onLogout}
            disabled={loggingOut}
            className="rounded bg-amber-800 px-3 py-1.5 text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        )}
      </div>
    </header>
  );
}

// ─── Overview panel ──────────────────────────────────────────────────────────

function OverviewPanel({
  admin,
  setTab,
}: {
  admin: StoredAdmin;
  setTab: (t: Tab) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <button
        onClick={() => setTab('submissions')}
        className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-left hover:border-amber-700 transition-colors"
      >
        <h3 className="text-base font-semibold text-amber-300">
          Review submissions →
        </h3>
        <p className="text-sm text-slate-400 mt-2">
          Approve or reject community series suggestions. Approval mints 50 INK
          and the Contributor badge to the submitter via a single PTB.
        </p>
        <p className="text-xs text-slate-500 mt-3 font-mono">
          MODERATOR+ required
        </p>
      </button>

      {admin.role === 'SUPER_ADMIN' && (
        <button
          onClick={() => setTab('users')}
          className="rounded-lg border border-slate-700 bg-slate-800 p-6 text-left hover:border-amber-700 transition-colors"
        >
          <h3 className="text-base font-semibold text-amber-300">
            Manage admins →
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            Create new admin users, change roles, deactivate accounts.
          </p>
          <p className="text-xs text-slate-500 mt-3 font-mono">
            SUPER_ADMIN only
          </p>
        </button>
      )}

      <div className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-6 md:col-span-2">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Coming next
        </h3>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-400 list-disc list-inside">
          <li>Audit log viewer (admin_action_logs)</li>
          <li>Gas treasury balance + low-balance alerts</li>
          <li>INK earning ledger search</li>
          <li>Content reports queue (Phase 2)</li>
        </ul>
      </div>
    </div>
  );
}
