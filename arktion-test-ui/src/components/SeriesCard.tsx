import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSeries, FORMAT_LABELS, type SeriesDto, type SeriesPage } from '../lib/api';

const STATUS_OPTIONS = ['', 'ongoing', 'completed', 'hiatus', 'dropped'];
const FORMAT_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Novel', value: '0' },
  { label: 'Manga', value: '1' },
  { label: 'Manhwa', value: '2' },
  { label: 'Manhua', value: '3' },
  { label: 'Webtoon', value: '4' },
];

const STATUS_COLORS: Record<string, string> = {
  ongoing: 'text-emerald-400',
  completed: 'text-blue-400',
  hiatus: 'text-amber-400',
  dropped: 'text-red-400',
};

export function SeriesCard({ onSelectSeries }: { onSelectSeries?: (id: string, title: string) => void }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formatType, setFormatType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const LIMIT = 10;

  function applySearch() {
    setDebouncedSearch(search);
    setPage(1);
  }

  const { data, error, isPending, isFetching } = useQuery<SeriesPage, Error>({
    queryKey: ['series', debouncedSearch, formatType, status, page],
    queryFn: () =>
      getSeries({
        search: debouncedSearch || undefined,
        formatType: formatType !== '' ? Number(formatType) : undefined,
        status: status || undefined,
        page,
        limit: LIMIT,
      }),
    refetchOnWindowFocus: false,
  });

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  function copyId(series: SeriesDto) {
    navigator.clipboard.writeText(series.id);
    setCopied(series.id);
    setTimeout(() => setCopied(null), 1500);
    onSelectSeries?.(series.id, series.title);
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Series Browser</h2>
        <span className="text-xs text-slate-500">{data ? `${data.total} total` : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder="Search title…"
          className="flex-1 min-w-[160px] rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
        />
        <button onClick={applySearch} className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500">
          Search
        </button>
        <select
          value={formatType}
          onChange={(e) => { setFormatType(e.target.value); setPage(1); }}
          className="rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        >
          {FORMAT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'Any status'}</option>
          ))}
        </select>
      </div>

      {isPending && <p className="text-slate-400 text-sm">Loading series…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}

      {data && data.data.length === 0 && (
        <p className="text-slate-500 text-sm">No series found. Run the seed script first.</p>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="rounded border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-xs text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Format</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">ID</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((s) => (
                  <tr key={s.id} className="border-t border-slate-700/60 hover:bg-slate-700/30">
                    <td className="px-3 py-2 text-slate-200 max-w-[220px] truncate">{s.title}</td>
                    <td className="px-3 py-2 text-slate-400">{FORMAT_LABELS[s.formatType] ?? s.formatType}</td>
                    <td className={`px-3 py-2 capitalize ${STATUS_COLORS[s.status] ?? 'text-slate-400'}`}>{s.status}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => copyId(s)}
                        title="Copy ID / use in Reading tracker"
                        className="font-mono text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        {copied === s.id ? '✓ copied' : s.id.slice(0, 8) + '…'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>{isFetching ? 'Loading…' : `Page ${page} of ${totalPages}`}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-slate-600 px-3 py-1 hover:bg-slate-700 disabled:opacity-40">Prev</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-slate-600 px-3 py-1 hover:bg-slate-700 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
