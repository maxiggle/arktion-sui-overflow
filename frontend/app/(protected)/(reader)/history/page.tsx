"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { History, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReadingStore } from "@/stores/reading.store";
import { useSeriesStore } from "@/stores/series.store";
import { READING_STATUS_LABELS, ReadingStatus } from "@/lib/types/reading";
import type { ReadingRecordDto } from "@/lib/types/reading";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ReadingStatus, string> = {
  [ReadingStatus.READING]: "bg-sky-500/10 text-sky-500",
  [ReadingStatus.COMPLETED]: "bg-emerald-500/10 text-emerald-500",
  [ReadingStatus.ON_HOLD]: "bg-amber-500/10 text-amber-500",
  [ReadingStatus.DROPPED]: "bg-rose-500/10 text-rose-500",
  [ReadingStatus.PLAN_TO_READ]: "bg-muted text-muted-foreground",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: new Date(iso).getFullYear() !== new Date().getFullYear()
      ? "numeric"
      : undefined,
  });
}

type Bucket = "Today" | "This week" | "This month" | "Earlier";

function timeBucket(iso: string): Bucket {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3_600_000;
  if (hours < 24) return "Today";
  if (hours < 24 * 7) return "This week";
  if (hours < 24 * 30) return "This month";
  return "Earlier";
}

const BUCKET_ORDER: Bucket[] = ["Today", "This week", "This month", "Earlier"];

// ─── History row ──────────────────────────────────────────────────────────────

function HistoryRow({ record }: { record: ReadingRecordDto }) {
  const { byId } = useSeriesStore();
  const series = byId[record.seriesId];

  const statusStyle =
    STATUS_STYLES[record.status as ReadingStatus] ?? STATUS_STYLES[ReadingStatus.READING];
  const statusLabel =
    READING_STATUS_LABELS[record.status as ReadingStatus] ?? "Unknown";

  return (
    <Link
      href={`/series/${record.seriesId}`}
      className="group flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-accent/40 transition-colors"
    >
      {/* Cover */}
      <div className="relative h-14 w-10 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/40">
        {series?.coverUrl ? (
          <Image
            src={series.coverUrl}
            alt={series.title}
            fill
            className="object-cover"
            sizes="40px"
            unoptimized
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-muted-foreground/30" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug group-hover:text-primary transition-colors">
          {series?.title ?? (
            <span className="text-muted-foreground/50">Loading…</span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${statusStyle}`}
          >
            {statusLabel}
          </span>
          {record.currentChapter > 0 && (
            <span className="text-xs text-muted-foreground">
              ch {record.currentChapter}
            </span>
          )}
        </div>
      </div>

      {/* Time + arrow */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground/60 tabular-nums">
          {relativeTime(record.lastReadAt)}
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity"
          strokeWidth={1.5}
        />
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 animate-pulse"
        >
          <div className="h-14 w-10 rounded-lg bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-48 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { records, isLoading, error, fetchRecords } = useReadingStore();
  const { fetchSeriesForIds } = useSeriesStore();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Backend already orders by lastReadAt desc; just strip plan-to-read entries
  // which have never been actively read and have no meaningful "last read" time.
  const sorted = useMemo(
    () => records.filter((r) => r.status !== ReadingStatus.PLAN_TO_READ),
    [records]
  );

  // Hydrate series metadata for all visible records
  useEffect(() => {
    const ids = sorted.map((r) => r.seriesId);
    if (ids.length > 0) fetchSeriesForIds(ids);
  }, [sorted, fetchSeriesForIds]);

  // Group into buckets
  const grouped = useMemo(() => {
    const map = new Map<Bucket, ReadingRecordDto[]>();
    for (const record of sorted) {
      const bucket = timeBucket(record.lastReadAt);
      const existing = map.get(bucket) ?? [];
      map.set(bucket, [...existing, record]);
    }
    return map;
  }, [sorted]);

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
            activity
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            history
          </h1>
        </div>
        {!isLoading && sorted.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {sorted.length} series
          </p>
        )}
      </div>

      {/* Body */}
      {isLoading ? (
        <HistorySkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchRecords()}>
            Retry
          </Button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <History
            className="h-10 w-10 text-muted-foreground/20"
            strokeWidth={1}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Nothing here yet
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your reading activity will appear here as you read.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/explore">Explore series</Link>
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl space-y-8">
          {BUCKET_ORDER.filter((b) => grouped.has(b)).map((bucket) => (
            <section key={bucket}>
              <h2 className="text-xs font-medium text-muted-foreground/60 tracking-widest uppercase mb-2 px-4">
                {bucket}
              </h2>
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                {grouped.get(bucket)!.map((record) => (
                  <HistoryRow key={record.seriesId} record={record} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
