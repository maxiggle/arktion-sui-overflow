import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, getMyPassport, takePassportSnapshot, type PassportResponse, type SnapshotResult } from '../lib/api';

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

  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  async function handleSnapshot() {
    setIsSnapshotting(true);
    setSnapshotError(null);
    setSnapshotResult(null);
    try {
      const result = await takePassportSnapshot();
      setSnapshotResult(result);
      void refetch(); // refresh passport to show updated identityBlobId
    } catch (err) {
      setSnapshotError((err as Error).message);
    } finally {
      setIsSnapshotting(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My passport</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSnapshot}
            disabled={isSnapshotting || isPending}
            className="rounded bg-teal-600 px-4 py-2 text-sm hover:bg-teal-500 disabled:opacity-50"
          >
            {isSnapshotting ? 'Exporting…' : '📸 Walrus Snapshot'}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {isPending && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error.message}</p>}

      {data?.walletAddress && (
        <div className="mb-4 flex justify-center">
          <img
            src={`${API_BASE_URL}/passport/${data.walletAddress}/image.svg`}
            alt="Passport NFT"
            width={240}
            height={240}
            className="rounded-xl shadow-lg shadow-indigo-900/40"
          />
        </div>
      )}

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
            {data.identityBlobId ? (
              <a
                href={data.identityBlobUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 underline"
              >
                {data.identityBlobId}
              </a>
            ) : (
              <span className="text-slate-500">not yet exported</span>
            )}
          </Row>
          <Row label="Last synced">{new Date(data.lastSyncedAt).toLocaleString()}</Row>
        </div>
      )}

      {/* Snapshot result */}
      {snapshotResult && (
        <div className="mt-4 rounded border border-teal-700 bg-teal-950/40 p-4 text-sm">
          <p className="mb-2 font-semibold text-teal-300">✅ Reading history exported to Walrus</p>
          <div className="space-y-1 text-slate-300">
            <p><span className="text-slate-500">Records:</span> {snapshotResult.recordCount}</p>
            <p><span className="text-slate-500">Snapshot at:</span> {new Date(snapshotResult.snapshotAt).toLocaleString()}</p>
            <p>
              <span className="text-slate-500">Blob ID:</span>{' '}
              <span className="font-mono text-xs break-all">{snapshotResult.blobId}</span>
            </p>
            <p>
              <a
                href={snapshotResult.walrusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:text-teal-300 underline"
              >
                View on Walrus ↗
              </a>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              On-chain anchoring via passport::set_blob_id is deferred to user-signed PTBs (Batch 4).
              The BlobId is stored in Postgres and your data is live on Walrus now.
            </p>
          </div>
        </div>
      )}

      {snapshotError && (
        <div className="mt-4 rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          Snapshot failed: {snapshotError}
        </div>
      )}
    </section>
  );
}
