import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ADMIN_ROLES,
  ApiError,
  activateAdminUser,
  createAdminUser,
  deactivateAdminUser,
  getAdminUsers,
  updateAdminUserRole,
  type AdminRoleStr,
  type AdminUserDto,
} from '../lib/api';
import type { StoredAdmin } from '../lib/admin-auth';

export function AdminUsersCard({ self }: { self: StoredAdmin }) {
  const qc = useQueryClient();
  const isSuper = self.role === 'SUPER_ADMIN';

  const list = useQuery<AdminUserDto[], ApiError>({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
    refetchOnWindowFocus: false,
    enabled: isSuper,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRoleStr>('REVIEWER');
  const [formError, setFormError] = useState('');

  const create = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEmail('');
      setPassword('');
      setRole('REVIEWER');
      setFormError('');
    },
    onError: (e: ApiError) => setFormError(e.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role: r }: { id: string; role: AdminRoleStr }) =>
      updateAdminUserRole(id, r),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deactivate = useMutation({
    mutationFn: deactivateAdminUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const activate = useMutation({
    mutationFn: activateAdminUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  if (!isSuper) {
    return (
      <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <h2 className="text-lg font-semibold">Admin users</h2>
        <p className="mt-2 text-sm text-slate-400">
          You are signed in as <span className="font-mono">{self.role}</span>. Only{' '}
          <span className="font-mono">SUPER_ADMIN</span> can manage admin users.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-5">
      <h2 className="text-lg font-semibold">Admin users</h2>

      {/* Create form */}
      <div className="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Create admin</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@arktion.app"
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 sm:col-span-1"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password (min 12)"
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRoleStr)}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
          >
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!email || !password) {
                setFormError('Email and password required');
                return;
              }
              create.mutate({ email, password, role });
            }}
            disabled={create.isPending}
            className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create admin'}
          </button>
          {formError && <span className="text-sm text-red-400">{formError}</span>}
          {create.isSuccess && (
            <span className="text-sm text-emerald-400">Admin created.</span>
          )}
        </div>
      </div>

      {/* List */}
      {list.isPending && <p className="text-sm text-slate-400">Loading…</p>}
      {list.error && <p className="text-sm text-red-400">{list.error.message}</p>}
      {list.data && list.data.length === 0 && (
        <p className="text-sm text-slate-500">No admin users.</p>
      )}
      {list.data && list.data.length > 0 && (
        <div className="rounded border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Active</th>
                <th className="px-3 py-2 text-left">TOTP</th>
                <th className="px-3 py-2 text-left">Last login</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((u) => {
                const isSelf = u.id === self.id;
                return (
                  <tr
                    key={u.id}
                    className="border-t border-slate-700/60 hover:bg-slate-700/30"
                  >
                    <td className="px-3 py-2 text-slate-200">
                      {u.email}
                      {isSelf && (
                        <span className="ml-2 text-xs text-amber-400">(you)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          changeRole.mutate({
                            id: u.id,
                            role: e.target.value as AdminRoleStr,
                          })
                        }
                        disabled={isSelf || changeRole.isPending}
                        className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-mono text-slate-100 disabled:opacity-40"
                      >
                        {ADMIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          u.isActive ? 'text-emerald-400' : 'text-red-400'
                        }
                      >
                        {u.isActive ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {u.totpEnabled ? 'On' : 'Off'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-3 py-2">
                      {u.isActive ? (
                        <button
                          onClick={() => deactivate.mutate(u.id)}
                          disabled={isSelf || deactivate.isPending}
                          className="rounded bg-red-800 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-40"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => activate.mutate(u.id)}
                          disabled={activate.isPending}
                          className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600 disabled:opacity-40"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
