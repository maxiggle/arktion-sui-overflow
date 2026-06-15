import { useQuery } from '@tanstack/react-query';
import {
  getMyBadges,
  BADGE_CATEGORY_LABELS,
  BADGE_TYPE_LABELS,
  type BadgeDto,
} from '../lib/api';

const CATEGORY_COLORS: Record<number, string> = {
  0: 'bg-blue-900/50 border-blue-700 text-blue-300',
  1: 'bg-purple-900/50 border-purple-700 text-purple-300',
  2: 'bg-amber-900/50 border-amber-700 text-amber-300',
  3: 'bg-emerald-900/50 border-emerald-700 text-emerald-300',
  4: 'bg-rose-900/50 border-rose-700 text-rose-300',
};

const CATEGORY_ICONS: Record<number, string> = {
  0: '📖', 1: '🤝', 2: '📜', 3: '✍️', 4: '🏆',
};

function BadgeTile({ badge }: { badge: BadgeDto }) {
  const color = CATEGORY_COLORS[badge.category] ?? 'bg-slate-700 border-slate-600 text-slate-300';
  const icon = CATEGORY_ICONS[badge.category] ?? '🎖️';
  const typeLabel = BADGE_TYPE_LABELS[badge.category]?.[badge.badgeType] ?? `Type ${badge.badgeType}`;
  const catLabel = BADGE_CATEGORY_LABELS[badge.category] ?? `Cat ${badge.category}`;

  return (
    <div className={`rounded-lg border p-4 space-y-1.5 ${color}`}>
      <div className="text-2xl">{icon}</div>
      <p className="font-semibold text-sm">{typeLabel}</p>
      <p className="text-xs opacity-70">{catLabel}</p>
      <p className="text-xs opacity-50">{new Date(badge.awardedAt).toLocaleDateString()}</p>
      <a
        href={`https://suiscan.xyz/testnet/object/${badge.suiObjectId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block truncate font-mono text-xs opacity-60 hover:opacity-100 underline"
      >
        {badge.suiObjectId.slice(0, 14)}…
      </a>
    </div>
  );
}

export function BadgesCard() {
  const { data, error, isPending, isFetching, refetch } = useQuery<BadgeDto[], Error>({
    queryKey: ['badges'],
    queryFn: getMyBadges,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Badges</h2>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isPending && <p className="text-slate-400 text-sm">Loading badges…</p>}
      {error && <p className="text-red-400 text-sm">{error.message}</p>}
      {data && data.length === 0 && (
        <p className="text-slate-500 text-sm">No badges earned yet. Start reading to unlock some!</p>
      )}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.map((badge) => (
            <BadgeTile key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </section>
  );
}
