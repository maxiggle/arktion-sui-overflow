import { useQuery } from '@tanstack/react-query';
import { getMyPassport, type PassportResponse } from '../lib/api';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-700/60 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="break-all font-mono text-sm text-slate-200">{children}</span>
    </div>
  );
}

export function PassportCard() {
  const { data, error, isPending, isFetching, refetch } = useQuery<PassportResponse, Error>({
    queryKey: ['passport'],
    queryFn: getMyPassport,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My passport</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isPending && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error.message}</p>}

      {data && (
        <div>
          <Row label="Object ID">
            <a
              href={data.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              {data.objectId}
            </a>
          </Row>
          <Row label="Level">{data.level}</Row>
          <Row label="Total INK earned">{data.totalInkEarned}</Row>
          <Row label="Chapters read">{data.chaptersRead}</Row>
          <Row label="Series completed">{data.seriesCompleted}</Row>
          <Row label="Series tracked">{data.seriesTracked}</Row>
          <Row label="Identity Blob ID">
            {data.identityBlobId ?? <span className="text-slate-500">not yet anchored</span>}
          </Row>
          <Row label="Last synced">{new Date(data.lastSyncedAt).toLocaleString()}</Row>
        </div>
      )}
    </section>
  );
}
