"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BookPlus, Pencil, ArrowRight } from "lucide-react";
import { useCreatorStore } from "@/stores/creator.store";
import { FORMAT_LABELS } from "@/lib/types/series";

const STATUS_COLOURS: Record<string, string> = {
  ongoing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  hiatus: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  cancelled: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function StudioPage() {
  const { series, loading, fetchOwnSeries } = useCreatorStore();

  useEffect(() => {
    fetchOwnSeries();
  }, [fetchOwnSeries]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">studio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "loading…" : `${series.length} series`}
          </p>
        </div>
        <Link
          href="/creator/publish/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <BookPlus className="h-3.5 w-3.5" />
          new series
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-border/60 bg-card animate-pulse"
            />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-20 text-center">
          <p className="text-sm text-muted-foreground">
            you haven&apos;t published any series yet
          </p>
          <Link
            href="/creator/publish/new"
            className="mt-2 inline-block text-xs text-primary hover:underline"
          >
            publish your first series →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {series.map((s) => (
            <div
              key={s.id}
              className="flex gap-3 rounded-xl border border-border/60 bg-card p-4"
            >
              {s.coverUrl ? (
                <img
                  src={s.coverUrl}
                  alt={s.title}
                  className="h-16 w-11 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="h-16 w-11 rounded-md bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1 flex flex-col justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {FORMAT_LABELS[s.formatType]}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                      STATUS_COLOURS[s.status] ?? "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {s.status}
                  </span>
                  <Link
                    href={`/creator/publish/${s.id}`}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link to public reader view for first series */}
      {series.length > 0 && (
        <div className="pt-2">
          <Link
            href={`/series/${series[0].id}`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            view reader page for &ldquo;{series[0].title}&rdquo;
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
