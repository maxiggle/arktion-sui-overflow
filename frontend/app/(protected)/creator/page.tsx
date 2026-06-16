"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BookPlus, Layers, DollarSign, ArrowRight } from "lucide-react";
import { useCreatorStore } from "@/stores/creator.store";
import { FORMAT_LABELS } from "@/lib/types/series";

export default function CreatorDashboardPage() {
  const { series, loading, fetchOwnSeries } = useCreatorStore();

  useEffect(() => {
    fetchOwnSeries();
  }, [fetchOwnSeries]);

  const recentSeries = series.slice(0, 5);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          your creator overview
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/creator/publish/new"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:bg-accent/40 transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            <BookPlus className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">new series</p>
            <p className="text-xs text-muted-foreground">publish your work</p>
          </div>
        </Link>

        <Link
          href="/creator/studio"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:bg-accent/40 transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-accent transition-colors">
            <Layers className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">studio</p>
            <p className="text-xs text-muted-foreground">manage your series</p>
          </div>
        </Link>

        <Link
          href="/creator/earnings"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-4 hover:bg-accent/40 transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-accent transition-colors">
            <DollarSign className="h-4 w-4" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">earnings</p>
            <p className="text-xs text-muted-foreground">tips & revenue</p>
          </div>
        </Link>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "series", value: loading ? "—" : series.length },
          {
            label: "ongoing",
            value: loading
              ? "—"
              : series.filter((s) => s.status === "ongoing").length,
          },
          {
            label: "completed",
            value: loading
              ? "—"
              : series.filter((s) => s.status === "completed").length,
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent series */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">recent series</h2>
          {series.length > 5 && (
            <Link
              href="/creator/studio"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              view all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl border border-border/60 bg-card animate-pulse"
              />
            ))}
          </div>
        ) : recentSeries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-12 text-center">
            <p className="text-sm text-muted-foreground">no series yet</p>
            <Link
              href="/creator/publish/new"
              className="mt-2 inline-block text-xs text-primary hover:underline"
            >
              publish your first series →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentSeries.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/creator/publish/${s.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 hover:bg-accent/40 transition-colors"
                >
                  {s.coverUrl ? (
                    <img
                      src={s.coverUrl}
                      alt={s.title}
                      className="h-10 w-7 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-7 rounded bg-muted shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {FORMAT_LABELS[s.formatType]} · {s.status}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
