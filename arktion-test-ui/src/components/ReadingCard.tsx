import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyReadingRecords,
  upsertReadingRecord,
  deleteReadingRecord,
  READING_STATUS_LABELS,
  FORMAT_LABELS,
  type ReadingRecordDto,
} from '../lib/api';

const STATUS_OPTIONS = [0, 1, 2, 3, 4];

const STATUS_COLORS: Record<number, string> = {
  0: 'text-emerald-400',
  1: 'text-blue-400',
  2: 'text-amber-400',
  3: 'text-red-400',
  4: 'text-slate-400',
};

export function ReadingCard({ prefillSeriesId }: { prefillSeriesId?: string }) {
  const qc = useQueryClient();

  // Form state
  const [seriesId, setSeriesId] = useState(prefillSeriesId ?? '');
  const [status, setStatus] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [formError, setFormError] = useState('');

  const { data: records, isPending, isFetching, refetch, error } = useQuery<ReadingRecordDto[], Error>({
    queryKey: ['reading-records'],
    queryFn: () => getMyReadingRecords(),
    refetchOnWindowFocus: false,
  });

  const upsert = useMutation({
    mutationFn: upsertReadingRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reading-records'] });
      qc.invalidateQueries({ queryKey: ['ink-balance'] });
      qc.invalidateQueries({ queryKey: ['ink-ledger'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
      qc.invalidateQueries({ queryKey: ['passport'] });
      setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const del = useMutation({
    mutationFn: deleteReadingRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reading-records'] });
    },
  });

  function handleUpsert() {
    if (!seriesId.trim()) { setFormError('Series ID is required'); return; }
    upsert.mutate({ seriesId: seriesId.trim(), status, currentChapter: chapter });
  }

  // Sync prefill whenever SeriesCard passes a new ID
  if (prefillSeriesId && prefillSeriesId !== seriesId) {
    setSeriesId(prefillSeriesId);
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reading List</h2>
        <button onClick={() => refetch()} disabled={isFetching} className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50">
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Upsert form */}
      <div className="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Track / Update Series</p>
        <p className="text-xs text-slate-500">Copy a Series ID from the browser above, paste it here.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={seriesId}
            onChange={(e) => setSeriesId(e.target.value)}
            placeholder="Series UUID"
            className="col-span-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 font-mono"
          />
          <select
            value={status}
            onChange={(e) => setStatus(Number(e.target.value))}
            className="rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{READING_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={chapter}
            onChange={(e) => setChapter(Math.max(0, Number(e.target.value)))}
            placeholder="Current chapter"
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleUpsert}
            disabled={upsert.isPending}
            className="rounded bg-indigo-600 px-3 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {upsert.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
        {formError && <p className="text-red-400 text-sm">{formError}</p>}
        {upsert.isSuccess && <p className="text-emerald-400 text-sm">Saved! INK milestones may have fired.</p>}
      </div>

      {/* Records list */}
      {isPending && <p className="text-slate-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {records && records.length === 0 && <p className="text-slate-500 text-sm">Nothing tracked yet.</p>}
      {records && records.length > 0 && (
        <div className="rounded border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Series ID</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Chapter</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-slate-700/60 hover:bg-slate-700/30">
                  <td className="px-3 py-2 font-mono text-xs text-slate-400">{r.seriesId.slice(0, 12)}…</td>
                  <td className={`px-3 py-2 ${STATUS_COLORS[r.status] ?? ''}`}>{READING_STATUS_LABELS[r.status]}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.currentChapter}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{new Date(r.lastReadAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => del.mutate(r.seriesId)}
                      disabled={del.isPending}
                      className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
