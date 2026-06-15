import { useQuery } from '@tanstack/react-query';
import { getHealth, type HealthResponse } from '../lib/api';

function Dot({ state }: { state: string }) {
  const up = state === 'up' || state === 'ok';
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${up ? 'bg-emerald-400' : 'bg-red-400'}`}
      title={state}
    />
  );
}

export function HealthCard() {
  const { data, error, isPending, isFetching, refetch } = useQuery<HealthResponse, Error>({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Health check</h2>
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-2">
              <Dot state={data.status} />
              <span className="text-slate-300">status: {data.status}</span>
            </span>
            {Object.entries(data.checks).map(([name, value]) => (
              <span key={name} className="flex items-center gap-2">
                <Dot state={value} />
                <span className="text-slate-300">
                  {name}: {value}
                </span>
              </span>
            ))}
          </div>
          <pre className="overflow-x-auto rounded bg-slate-950 p-4 text-xs text-slate-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
