"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BookPlus, ArrowRight, BookOpen } from "lucide-react";
import { useCreatorStore } from "@/stores/creator.store";
import { FORMAT_LABELS } from "@/lib/types/series";

export default function PublishPage() {
  const { series, loading, fetchOwnSeries } = useCreatorStore();

  useEffect(() => {
    fetchOwnSeries();
  }, [fetchOwnSeries]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">publish</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            manage your series and chapters
          </p>
        </div>
        <Link
          href="/creator/publish/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <BookPlus className="h-4 w-4" strokeWidth={1.5} />
          new series
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-border/60 bg-card animate-pulse"
            />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" strokeWidth={1} />
          <p className="text-sm text-muted-foreground">no series yet</p>
          <Link
            href="/creator/publish/new"
            className="mt-3 inline-block text-xs text-primary hover:underline"
          >
            publish your first series →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/creator/publish/${s.id}`}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3.5 hover:bg-accent/40 transition-colors group"
              >
                {s.coverUrl ? (
                  <img
                    src={s.coverUrl}
                    alt={s.title}
                    className="h-11 w-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="h-11 w-8 rounded bg-muted shrink-0 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {FORMAT_LABELS[s.formatType]} · {s.status}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
