import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getInkBalance,
  getInkLedger,
  INK_ACTION_LABELS,
  type InkBalanceDto,
  type InkLedgerPage,
} from '../lib/api';

const LEVEL_NAMES = ['', 'Ink Novice', 'Ink Adept', 'Ink Scholar', 'Ink Sage', 'Ink Master', 'Ink Legend'];

export function InkCard() {
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const balance = useQuery<InkBalanceDto, Error>({
    queryKey: ['ink-balance'],
    queryFn: getInkBalance,
    refetchOnWindowFocus: false,
  });

  const ledger = useQuery<InkLedgerPage, Error>({
    queryKey: ['ink-ledger', page],
    queryFn: () => getInkLedger(page, LIMIT),
    refetchOnWindowFocus: false,
  });

  const totalPages = ledger.data ? Math.ceil(ledger.data.total / LIMIT) : 1;

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">INK Economy</h2>
        <button
          onClick={() => { balance.refetch(); ledger.refetch(); }}
          disabled={balance.isFetching || ledger.isFetching}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {balance.isFetching || ledger.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Balance strip */}
      {balance.isPending && <p className="text-slate-400 text-sm">Loading balance…</p>}
      {balance.error && <p className="text-red-400 text-sm">{balance.error.message}</p>}
      {balance.data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Balance', value: balance.data.balance + ' INK' },
            { label: 'Total Earned', value: balance.data.totalInkEarned + ' INK' },
            { label: 'Level', value: `${balance.data.level} — ${LEVEL_NAMES[balance.data.level] ?? 'Unknown'}` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded bg-slate-900 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 font-mono text-sm text-slate-100">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ledger */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-400">Earn History</h3>
        {ledger.isPending && <p className="text-slate-400 text-sm">Loading ledger…</p>}
        {ledger.error && <p className="text-red-400 text-sm">{ledger.error.message}</p>}
        {ledger.data && ledger.data.data.length === 0 && (
          <p className="text-slate-500 text-sm">No earnings yet.</p>
        )}
        {ledger.data && ledger.data.data.length > 0 && (
          <>
            <div className="overflow-x-auto rounded border border-slate-700">
              <table className="w-full text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Action</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2 text-left">Tx</th>
                    <th className="px-3 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.data.data.map((e) => (
                    <tr key={e.id} className="border-t border-slate-700/60 hover:bg-slate-700/30">
                      <td className="px-3 py-2">{INK_ACTION_LABELS[e.actionType] ?? `Type ${e.actionType}`}</td>
                      <td className="px-3 py-2 text-right font-mono text-emerald-400">+{e.amount}</td>
                      <td className="px-3 py-2 font-mono truncate max-w-[120px]">
                        {e.suiTxDigest
                          ? <a href={`https://suiscan.xyz/testnet/tx/${e.suiTxDigest}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">{e.suiTxDigest.slice(0, 10)}…</a>
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{new Date(e.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
              <span>Page {page} of {totalPages} ({ledger.data.total} entries)</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-slate-600 px-3 py-1 hover:bg-slate-700 disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded border border-slate-600 px-3 py-1 hover:bg-slate-700 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
