"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Medal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBadgesStore } from "@/stores/badges.store";
import {
  BadgeCategory,
  BADGE_CATEGORY_LABELS,
  TIER_LABELS,
  getBadgeTypeLabel,
} from "@/lib/types/badges";
import type { BadgeDto } from "@/lib/types/badges";

// ─── Visual config ────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<
  BadgeCategory,
  { bg: string; text: string; border: string }
> = {
  [BadgeCategory.READING_ACHIEVEMENT]: {
    bg: "bg-violet-500/10",
    text: "text-violet-500",
    border: "border-violet-500/20",
  },
  [BadgeCategory.COMMUNITY]: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-500",
    border: "border-emerald-500/20",
  },
  [BadgeCategory.SERIES_LORE]: {
    bg: "bg-amber-500/10",
    text: "text-amber-500",
    border: "border-amber-500/20",
  },
  [BadgeCategory.CREATOR]: {
    bg: "bg-rose-500/10",
    text: "text-rose-500",
    border: "border-rose-500/20",
  },
  [BadgeCategory.CONTRIBUTOR]: {
    bg: "bg-sky-500/10",
    text: "text-sky-500",
    border: "border-sky-500/20",
  },
};

const TIER_GLOW: Record<number, string> = {
  0: "shadow-amber-700/20",
  1: "shadow-slate-400/20",
  2: "shadow-yellow-400/30",
  3: "shadow-cyan-400/30",
};

const TIER_RING: Record<number, string> = {
  0: "ring-amber-700/40",
  1: "ring-slate-400/40",
  2: "ring-yellow-400/50",
  3: "ring-cyan-400/50",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_TABS = [
  { label: "All", value: -1 },
  { label: "Reading", value: BadgeCategory.READING_ACHIEVEMENT },
  { label: "Community", value: BadgeCategory.COMMUNITY },
  { label: "Series Lore", value: BadgeCategory.SERIES_LORE },
  { label: "Creator", value: BadgeCategory.CREATOR },
  { label: "Contributor", value: BadgeCategory.CONTRIBUTOR },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Badge card ───────────────────────────────────────────────────────────────

function BadgeCard({ badge }: { badge: BadgeDto }) {
  const style =
    CATEGORY_STYLES[badge.category as BadgeCategory] ??
    CATEGORY_STYLES[BadgeCategory.READING_ACHIEVEMENT];
  const tierLabel = TIER_LABELS[badge.tier] ?? `Tier ${badge.tier}`;
  const typeLabel = getBadgeTypeLabel(badge.category as BadgeCategory, badge.badgeType);
  const categoryLabel = BADGE_CATEGORY_LABELS[badge.category as BadgeCategory] ?? "Badge";
  const glow = TIER_GLOW[badge.tier] ?? "";
  const ring = TIER_RING[badge.tier] ?? "";

  return (
    <div
      className={`rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-4 shadow-sm ${glow}`}
    >
      {/* Icon */}
      <div className="flex items-start justify-between gap-3">
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center ring-1 ${ring} ${style.bg}`}
        >
          <Medal className={`h-5 w-5 ${style.text}`} strokeWidth={1.5} />
        </div>

        {/* Tier pill */}
        <span
          className={`text-[10px] font-semibold tracking-widest uppercase px-2 py-1 rounded-full ${style.bg} ${style.text}`}
        >
          {tierLabel}
        </span>
      </div>

      {/* Labels */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground leading-snug">
          {typeLabel}
        </p>
        <p className="text-xs text-muted-foreground">{categoryLabel}</p>
        {badge.seriesId && (
          <p className="text-[11px] text-muted-foreground/60 truncate">
            Series: {badge.seriesId.slice(0, 8)}…
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        <span className="text-[11px] text-muted-foreground/60">
          {formatDate(badge.awardedAt)}
        </span>

        {badge.suiObjectId && (
          <a
            href={`https://suiscan.xyz/testnet/object/${badge.suiObjectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 text-[11px] ${style.text} hover:underline`}
          >
            on-chain
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BadgesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card p-5 space-y-4 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-2xl bg-muted" />
            <div className="h-5 w-14 rounded-full bg-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-3 w-14 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BadgesPage() {
  const { badges, isLoading, error, fetchBadges } = useBadgesStore();
  const [activeTab, setActiveTab] = useState<number>(-1);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const countByCategory = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const b of badges) {
      counts[b.category] = (counts[b.category] ?? 0) + 1;
    }
    return counts;
  }, [badges]);

  const visible = useMemo(
    () =>
      activeTab === -1
        ? badges
        : badges.filter((b) => b.category === activeTab),
    [badges, activeTab]
  );

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
          achievements
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            badges
          </h1>
          {!isLoading && badges.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {badges.length} earned
            </p>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {!isLoading && badges.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-6">
          {ALL_TABS.map(({ label, value }) => {
            const count = value === -1 ? badges.length : (countByCategory[value] ?? 0);
            if (value !== -1 && count === 0) return null;
            const active = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={[
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent",
                ].join(" ")}
              >
                {label}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <BadgesSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBadges}>
            Retry
          </Button>
        </div>
      ) : badges.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <Medal
            className="h-10 w-10 text-muted-foreground/20"
            strokeWidth={1}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              No badges yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Earn badges by reading chapters, completing series, and
              contributing to the platform.
            </p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No badges in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}
    </div>
  );
}
