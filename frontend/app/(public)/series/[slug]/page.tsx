"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  BookMarked,
  ChevronRight,
  Loader2,
  Plus,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSeriesStore } from "@/stores/series.store";
import { useReadingStore } from "@/stores/reading.store";
import { useAuth } from "@/contexts/auth-context";
import { FORMAT_LABELS } from "@/lib/types/series";
import {
  ReadingStatus,
  READING_STATUS_LABELS,
} from "@/lib/types/reading";
import type { ChapterDto } from "@/lib/types/series";
import type { ReadingRecordDto } from "@/lib/types/reading";

// ─── Chapter row ──────────────────────────────────────────────────────────────

function ChapterRow({
  chapter,
  seriesId,
  isAuthenticated,
}: {
  chapter: ChapterDto;
  seriesId: string;
  isAuthenticated: boolean;
}) {
  const publishedDate = chapter.publishedAt
    ? new Date(chapter.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const href = isAuthenticated
    ? `/read/${seriesId}/${chapter.id}`
    : "/sign-in";

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4 hover:border-border hover:bg-accent/40 transition-all"
    >
      <span className="text-sm font-mono text-muted-foreground/60 w-8 shrink-0">
        {chapter.chapterNumber}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground truncate transition-colors">
          {chapter.title ?? `Chapter ${chapter.chapterNumber}`}
        </p>
        {publishedDate && (
          <p className="text-xs text-muted-foreground mt-0.5">{publishedDate}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground/60">
          {chapter.pageCount} pages
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
          strokeWidth={1.5}
        />
      </div>
    </Link>
  );
}

// ─── Library button ───────────────────────────────────────────────────────────

function LibraryButton({
  seriesId,
  record,
  firstChapterNumber,
}: {
  seriesId: string;
  record: ReadingRecordDto | undefined;
  firstChapterNumber: number;
}) {
  const { upsert, remove } = useReadingStore();
  const [isMutating, setIsMutating] = useState(false);

  async function handleAddToLibrary() {
    setIsMutating(true);
    try {
      await upsert({
        seriesId,
        status: ReadingStatus.PLAN_TO_READ,
        currentChapter: firstChapterNumber,
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function handleStatusChange(value: string) {
    setIsMutating(true);
    try {
      await upsert({
        seriesId,
        status: Number(value) as ReadingStatus,
        currentChapter: record?.currentChapter ?? firstChapterNumber,
      });
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemove() {
    setIsMutating(true);
    try {
      await remove(seriesId);
    } finally {
      setIsMutating(false);
    }
  }

  if (!record) {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={handleAddToLibrary}
        disabled={isMutating}
      >
        {isMutating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Add to library
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Check className="h-4 w-4 text-green-500 shrink-0" />
      <Select
        value={String(record.status)}
        onValueChange={handleStatusChange}
        disabled={isMutating}
      >
        <SelectTrigger className="h-10 w-40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(READING_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
        disabled={isMutating}
      >
        Remove
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeriesDetailPage() {
  const params = useParams<{ slug: string }>();
  const seriesId = params.slug;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { current, chapters, detailLoading, detailError, fetchSeriesById, fetchChapters } =
    useSeriesStore();
  const { records, fetchRecord } = useReadingStore();

  useEffect(() => {
    fetchSeriesById(seriesId);
    fetchChapters(seriesId);
  }, [seriesId, fetchSeriesById, fetchChapters]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecord(seriesId);
    }
  }, [isAuthenticated, seriesId, fetchRecord]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [chapters],
  );

  const record = records.find((r) => r.seriesId === seriesId);

  const firstChapter = sortedChapters[0] ?? null;

  const continueChapter = useMemo(() => {
    if (!record || sortedChapters.length === 0) return null;
    return (
      sortedChapters.find((c) => c.chapterNumber >= record.currentChapter) ??
      sortedChapters[sortedChapters.length - 1]
    );
  }, [record, sortedChapters]);

  if (!detailLoading && detailError) {
    notFound();
  }

  if (detailLoading || !current) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-start animate-pulse">
          <div className="space-y-6">
            <div className="h-6 w-20 rounded-full bg-muted" />
            <div className="space-y-3">
              <div className="h-12 w-3/4 rounded-lg bg-muted" />
              <div className="h-4 w-full rounded bg-muted/60" />
              <div className="h-4 w-5/6 rounded bg-muted/60" />
              <div className="h-4 w-4/6 rounded bg-muted/60" />
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-36 rounded-lg bg-muted" />
              <div className="h-11 w-32 rounded-lg bg-muted/60" />
            </div>
          </div>
          <div className="hidden lg:block h-[420px] rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      {/* ── Back ── */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        back to explore
      </Link>

      {/* ── Hero ── */}
      <div className="grid gap-10 lg:grid-cols-[1fr_300px] lg:items-start mb-14">
        {/* Info */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="px-3 py-1.5">
              {FORMAT_LABELS[current.formatType]}
            </Badge>
            {current.status && (
              <Badge variant="secondary" className="px-3 py-1.5 capitalize">
                {current.status}
              </Badge>
            )}
          </div>

          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl leading-tight">
            {current.title}
          </h1>

          {current.description && (
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              {current.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5">
              <BookOpen className="size-4 text-primary" strokeWidth={1.5} />
              {sortedChapters.length} chapter
              {sortedChapters.length !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1.5">
              <BookMarked className="size-4 text-primary" strokeWidth={1.5} />
              {current.sourceLanguage.toUpperCase()}
            </span>
          </div>

          {/* CTAs */}
          {authLoading ? null : !isAuthenticated ? (
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">Sign in to read</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/explore">Back to explore</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {continueChapter ? (
                <Button asChild size="lg">
                  <Link href={`/read/${seriesId}/${continueChapter.id}`}>
                    Continue — ch {continueChapter.chapterNumber}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : firstChapter ? (
                <Button asChild size="lg">
                  <Link href={`/read/${seriesId}/${firstChapter.id}`}>
                    Start reading
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}

              <LibraryButton
                seriesId={seriesId}
                record={record}
                firstChapterNumber={firstChapter?.chapterNumber ?? 1}
              />
            </div>
          )}
        </div>

        {/* Cover */}
        <div className="hidden lg:block">
          <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-border/60 bg-muted shadow-lg shadow-black/10">
            {current.coverUrl ? (
              <Image
                src={current.coverUrl}
                alt={current.title}
                fill
                className="object-cover"
                sizes="300px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen
                  className="h-12 w-12 text-muted-foreground/20"
                  strokeWidth={1}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chapters ── */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground tracking-wide mb-4">
          chapters
          {sortedChapters.length > 0 && (
            <span className="ml-2 text-muted-foreground/50">
              ({sortedChapters.length})
            </span>
          )}
        </h2>

        {sortedChapters.length === 0 ? (
          <div className="rounded-xl border border-border/60 border-dashed bg-muted/10 px-8 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No chapters available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedChapters.map((chapter) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                seriesId={seriesId}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
