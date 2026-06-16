"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Trash2,
  BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReadingStore } from "@/stores/reading.store";
import { useSeriesStore } from "@/stores/series.store";
import {
  ReadingStatus,
  READING_STATUS_LABELS,
} from "@/lib/types/reading";
import type { ReadingRecordDto } from "@/lib/types/reading";
import type { SeriesDto } from "@/lib/types/series";

// ─── Tab definition ───────────────────────────────────────────────────────────

const TABS: Array<{ status: ReadingStatus | "all"; label: string }> = [
  { status: "all", label: "All" },
  { status: ReadingStatus.READING, label: "Reading" },
  { status: ReadingStatus.PLAN_TO_READ, label: "Plan to Read" },
  { status: ReadingStatus.COMPLETED, label: "Completed" },
  { status: ReadingStatus.ON_HOLD, label: "On Hold" },
  { status: ReadingStatus.DROPPED, label: "Dropped" },
];

// ─── Library card ─────────────────────────────────────────────────────────────

function LibraryCard({
  record,
  series,
}: {
  record: ReadingRecordDto;
  series: SeriesDto | undefined;
}) {
  const { upsert, remove } = useReadingStore();
  const [isMutating, setIsMutating] = useState(false);

  const title = series?.title ?? "Loading…";
  const coverUrl = series?.coverUrl ?? null;

  const lastReadDate = new Date(record.lastReadAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function handleStatusChange(value: string) {
    setIsMutating(true);
    try {
      await upsert({
        seriesId: record.seriesId,
        status: Number(value) as ReadingStatus,
        currentChapter: record.currentChapter,
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemove() {
    setIsMutating(true);
    try {
      await remove(record.seriesId);
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="group flex gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-border transition-all shadow-sm shadow-black/5">
      {/* Cover */}
      <Link
        href={`/series/${record.seriesId}`}
        className="shrink-0 w-14 h-20 rounded-lg overflow-hidden border border-border/40 bg-muted flex items-center justify-center"
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            width={56}
            height={80}
            className="object-cover w-full h-full"
          />
        ) : (
          <BookOpen
            className="h-5 w-5 text-muted-foreground/30"
            strokeWidth={1.5}
          />
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/series/${record.seriesId}`}
            className="text-sm font-medium text-foreground/90 hover:text-foreground truncate block transition-colors"
          >
            {title}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">
            ch {record.currentChapter} · last read {lastReadDate}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={String(record.status)}
            onValueChange={handleStatusChange}
            disabled={isMutating}
          >
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(READING_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemove}
            disabled={isMutating}
          >
            {isMutating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Continue arrow */}
      <Link
        href={`/series/${record.seriesId}`}
        className="shrink-0 self-center text-muted-foreground/30 group-hover:text-muted-foreground transition-colors"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border/60 border-dashed bg-muted/10 px-8 py-14 flex flex-col items-center text-center gap-4">
      <div className="h-10 w-10 rounded-full border border-border/60 flex items-center justify-center bg-muted/40">
        <BookMarked
          className="h-5 w-5 text-muted-foreground/40"
          strokeWidth={1.5}
        />
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          Nothing in {label.toLowerCase()} yet
        </p>
        <p className="text-xs text-muted-foreground/60 leading-snug max-w-xs">
          Browse series and add them to your library to track your reading
          progress
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/explore">Explore series</Link>
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<ReadingStatus | "all">("all");

  const { records, isLoading, fetchRecords } = useReadingStore();
  const { byId: seriesById, fetchSeriesForIds } = useSeriesStore();

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    if (records.length > 0) {
      fetchSeriesForIds(records.map((r) => r.seriesId));
    }
  }, [records, fetchSeriesForIds]);

  const visibleRecords = useMemo(
    () =>
      activeTab === "all"
        ? records
        : records.filter((r) => r.status === activeTab),
    [records, activeTab],
  );

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: records.length };
    for (const r of records) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return counts;
  }, [records]);

  const activeTabLabel =
    TABS.find((t) => t.status === activeTab)?.label ?? "All";

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
          your collection
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          library
        </h1>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 flex-wrap mb-6 border-b border-border/60 pb-0">
        {TABS.map(({ status, label }) => {
          const count = countByStatus[status === "all" ? "all" : status] ?? 0;
          const isActive = activeTab === status;
          return (
            <button
              key={String(status)}
              onClick={() => setActiveTab(status)}
              className={[
                "px-3 py-2 text-xs font-medium rounded-t-md border-b-2 transition-colors -mb-px",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
              {count > 0 && (
                <span
                  className={[
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-foreground/10 text-foreground"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-xl border border-border/60 bg-card p-4 animate-pulse"
            >
              <div className="w-14 h-20 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-48 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted/60" />
                <div className="h-7 w-36 rounded bg-muted/40 mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleRecords.length === 0 ? (
        <EmptyState label={activeTabLabel} />
      ) : (
        <div className="space-y-3">
          {visibleRecords.map((record) => (
            <LibraryCard
              key={record.id}
              record={record}
              series={seriesById[record.seriesId]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
