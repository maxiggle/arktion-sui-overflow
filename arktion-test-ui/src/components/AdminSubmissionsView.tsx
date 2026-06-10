import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  FORMAT_LABELS,
  SUBMISSION_STATUS_LABELS,
  approveSubmission,
  getPendingSubmissions,
  rejectSubmission,
  type SubmissionDto,
} from '../lib/api';

const STATUS_COLORS: Record<number, string> = {
  0: 'text-amber-400',
  1: 'text-emerald-400',
  2: 'text-red-400',
};

export function AdminSubmissionsView() {
  const qc = useQueryClient();

  const pending = useQuery<SubmissionDto[], ApiError>({
    queryKey: ['admin-submissions-pending'],
    queryFn: getPendingSubmissions,
    refetchOnWindowFocus: false,
  });

  const approve = useMutation({
    mutationFn: approveSubmission,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin-submissions-pending'] }),
  });

  const reject = useMutation({
    mutationFn: rejectSubmission,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin-submissions-pending'] }),
  });

  const items = pending.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pending submissions</h2>
          <p className="text-xs text-slate-500">
            Approve mints 50 INK + the Contributor badge to the submitter on
            Sui. Reject is Postgres-only.
          </p>
        </div>
        <button
          onClick={() => pending.refetch()}
          disabled={pending.isFetching}
          className="rounded bg-slate-700 px-3 py-1.5 text-xs hover:bg-slate-600 disabled:opacity-50"
        >
          {pending.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {approve.isSuccess && (
        <div className="rounded border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          Approved — 50 INK + Contributor badge minted on-chain.
        </div>
      )}
      {approve.error && (
        <div className="rounded border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300">
          {approve.error.message}
        </div>
      )}
      {reject.error && (
        <div className="rounded border border-red-700/50 bg-red-950/30 p-3 text-sm text-red-300">
          {reject.error.message}
        </div>
      )}

      {pending.isPending && (
        <p className="text-sm text-slate-400">Loading…</p>
      )}
      {pending.error && (
        <p className="text-sm text-red-400">{pending.error.message}</p>
      )}
      {!pending.isPending && items.length === 0 && (
        <div className="rounded border border-slate-700 bg-slate-900 p-6 text-center">
          <p className="text-sm text-slate-500">
            No submissions waiting for review. 🎉
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Format</th>
                <th className="px-3 py-2 text-left">URL</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Submitted</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className="border-t border-slate-700/60 hover:bg-slate-700/30"
                >
                  <td className="px-3 py-2 max-w-[200px] truncate text-slate-200">
                    {s.title}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {FORMAT_LABELS[s.formatType] ?? s.formatType}
                  </td>
                  <td className="px-3 py-2 max-w-[180px] truncate">
                    <a
                      href={s.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline text-xs font-mono"
                    >
                      {s.externalUrl.replace(/^https?:\/\//, '')}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {s.suggestedSource}
                  </td>
                  <td
                    className={`px-3 py-2 ${STATUS_COLORS[s.status] ?? 'text-slate-400'}`}
                  >
                    {SUBMISSION_STATUS_LABELS[s.status]}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {s.status === 0 && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => approve.mutate(s.id)}
                          disabled={approve.isPending}
                          className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600 disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reject.mutate(s.id)}
                          disabled={reject.isPending}
                          className="rounded bg-red-800 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
