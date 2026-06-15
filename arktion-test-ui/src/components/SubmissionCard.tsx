import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSubmission,
  getMySubmissions,
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  FORMAT_LABELS,
  SUBMISSION_STATUS_LABELS,
  type SubmissionDto,
} from '../lib/api';

const FORMAT_OPTIONS = [0, 1, 2, 3, 4];

const STATUS_COLORS: Record<number, string> = {
  0: 'text-amber-400',
  1: 'text-emerald-400',
  2: 'text-red-400',
};

function SubmissionRow({
  sub,
  isAdmin,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  sub: SubmissionDto;
  isAdmin: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  return (
    <tr className="border-t border-slate-700/60 hover:bg-slate-700/30">
      <td className="px-3 py-2 max-w-[180px] truncate text-slate-200">{sub.title}</td>
      <td className="px-3 py-2 text-slate-400">{FORMAT_LABELS[sub.formatType] ?? sub.formatType}</td>
      <td className="px-3 py-2">
        <a href={sub.externalUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline text-xs font-mono truncate block max-w-[120px]">{sub.externalUrl.replace(/^https?:\/\//, '')}</a>
      </td>
      <td className={`px-3 py-2 ${STATUS_COLORS[sub.status] ?? 'text-slate-400'}`}>{SUBMISSION_STATUS_LABELS[sub.status]}</td>
      <td className="px-3 py-2 text-xs text-slate-500">{new Date(sub.createdAt).toLocaleDateString()}</td>
      {isAdmin && (
        <td className="px-3 py-2">
          {sub.status === 0 && (
            <div className="flex gap-1.5">
              <button onClick={() => onApprove(sub.id)} disabled={approving} className="rounded bg-emerald-700 px-2 py-1 text-xs hover:bg-emerald-600 disabled:opacity-40">Approve</button>
              <button onClick={() => onReject(sub.id)} disabled={rejecting} className="rounded bg-red-800 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-40">Reject</button>
            </div>
          )}
        </td>
      )}
    </tr>
  );
}

export function SubmissionCard({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'mine' | 'pending'>('mine');

  // Create form
  const [title, setTitle] = useState('');
  const [formatType, setFormatType] = useState(1);
  const [externalUrl, setExternalUrl] = useState('');
  const [suggestedSource, setSuggestedSource] = useState('');
  const [formError, setFormError] = useState('');

  const mine = useQuery<SubmissionDto[], Error>({
    queryKey: ['submissions-mine'],
    queryFn: getMySubmissions,
    refetchOnWindowFocus: false,
  });

  const pending = useQuery<SubmissionDto[], Error>({
    queryKey: ['submissions-pending'],
    queryFn: getPendingSubmissions,
    enabled: isAdmin && tab === 'pending',
    refetchOnWindowFocus: false,
  });

  const create = useMutation({
    mutationFn: createSubmission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions-mine'] });
      setTitle(''); setExternalUrl(''); setSuggestedSource(''); setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const approve = useMutation({
    mutationFn: approveSubmission,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions-pending'] });
      qc.invalidateQueries({ queryKey: ['ink-balance'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });

  const reject = useMutation({
    mutationFn: rejectSubmission,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['submissions-pending'] }),
  });

  function handleCreate() {
    if (!title.trim()) { setFormError('Title required'); return; }
    if (!externalUrl.trim()) { setFormError('URL required'); return; }
    if (!suggestedSource.trim()) { setFormError('Suggested source required'); return; }
    create.mutate({ title: title.trim(), formatType, externalUrl: externalUrl.trim(), suggestedSource: suggestedSource.trim() });
  }

  const tableHeaders = (
    <thead className="bg-slate-900 text-xs text-slate-500 uppercase tracking-wide">
      <tr>
        <th className="px-3 py-2 text-left">Title</th>
        <th className="px-3 py-2 text-left">Format</th>
        <th className="px-3 py-2 text-left">URL</th>
        <th className="px-3 py-2 text-left">Status</th>
        <th className="px-3 py-2 text-left">Date</th>
        {isAdmin && <th className="px-3 py-2 text-left">Actions</th>}
      </tr>
    </thead>
  );

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-5">
      <h2 className="text-lg font-semibold">Series Submissions</h2>

      {/* Submit form */}
      <div className="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Suggest a Series</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Series title" className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
          <select value={formatType} onChange={(e) => setFormatType(Number(e.target.value))} className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100">
            {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
          <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Series URL" className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
          <input value={suggestedSource} onChange={(e) => setSuggestedSource(e.target.value)} placeholder="Suggested source (e.g. MangaDex)" className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCreate} disabled={create.isPending} className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50">
            {create.isPending ? 'Submitting…' : 'Submit'}
          </button>
          {formError && <span className="text-red-400 text-sm">{formError}</span>}
          {create.isSuccess && <span className="text-emerald-400 text-sm">Submitted!</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {(['mine', ...(isAdmin ? ['pending'] : [])] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as 'mine' | 'pending')}
            className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {t === 'mine' ? 'My Submissions' : 'Pending Review'}
          </button>
        ))}
      </div>

      {/* Mine */}
      {tab === 'mine' && (
        <>
          {mine.isPending && <p className="text-slate-400 text-sm">Loading…</p>}
          {mine.error && <p className="text-red-400 text-sm">{mine.error.message}</p>}
          {mine.data && mine.data.length === 0 && <p className="text-slate-500 text-sm">No submissions yet.</p>}
          {mine.data && mine.data.length > 0 && (
            <div className="rounded border border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeaders}
                <tbody>
                  {mine.data.map((s) => (
                    <SubmissionRow key={s.id} sub={s} isAdmin={false} onApprove={() => {}} onReject={() => {}} approving={false} rejecting={false} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Admin: Pending */}
      {tab === 'pending' && isAdmin && (
        <>
          <div className="flex justify-end">
            <button onClick={() => pending.refetch()} disabled={pending.isFetching} className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50">
              {pending.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          {approve.isSuccess && <p className="text-emerald-400 text-sm">Approved — 50 INK + badge minted on-chain.</p>}
          {approve.error && <p className="text-red-400 text-sm">{(approve.error as Error).message}</p>}
          {pending.isPending && <p className="text-slate-400 text-sm">Loading…</p>}
          {pending.error && <p className="text-red-400 text-sm">{pending.error.message}</p>}
          {pending.data && pending.data.length === 0 && <p className="text-slate-500 text-sm">No pending submissions.</p>}
          {pending.data && pending.data.length > 0 && (
            <div className="rounded border border-slate-700 overflow-x-auto">
              <table className="w-full text-sm">
                {tableHeaders}
                <tbody>
                  {pending.data.map((s) => (
                    <SubmissionRow
                      key={s.id}
                      sub={s}
                      isAdmin
                      onApprove={(id) => approve.mutate(id)}
                      onReject={(id) => reject.mutate(id)}
                      approving={approve.isPending}
                      rejecting={reject.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
