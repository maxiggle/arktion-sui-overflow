"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSeriesStore } from "@/stores/series.store";
import { useReadingStore } from "@/stores/reading.store";
import { useAuth } from "@/contexts/auth-context";
import { ReadingStatus } from "@/lib/types/reading";
import type { PageDto, ChapterDto } from "@/lib/types/series";

// ─── Page image ───────────────────────────────────────────────────────────────

function MangaPage({
  page,
  maxWidth,
  isPriority,
}: {
  page: PageDto;
  maxWidth: number;
  isPriority: boolean;
}) {
  const [errored, setErrored] = useState(false);

  if (!page.imageUrl) return null;

  if (errored) {
    return (
      <div className="w-full flex items-center justify-center bg-muted/30 border-y border-border/20 py-16">
        <div className="flex flex-col items-center gap-2 text-muted-foreground/60">
          <AlertCircle className="h-6 w-6" strokeWidth={1.5} />
          <span className="text-xs">Page {page.pageNumber} failed to load</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={page.imageUrl}
      alt={`Page ${page.pageNumber}`}
      width={maxWidth}
      height={Math.round(maxWidth * 1.42)}
      className="w-full h-auto block"
      sizes={`${maxWidth}px`}
      onError={() => setErrored(true)}
      priority={isPriority}
      unoptimized
    />
  );
}

// ─── Guest banner ─────────────────────────────────────────────────────────────

function GuestBanner({ seriesId }: { seriesId: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-white/60">
      <span>Sign in to earn INK and track your progress</span>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={`/sign-in?next=/series/${seriesId}`}
          className="text-white/90 hover:text-white underline underline-offset-2 transition-colors"
        >
          Sign in
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/30 hover:text-white/60 transition-colors"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

function ReaderTopBar({
  seriesId,
  seriesTitle,
  chapter,
  prevChapter,
  nextChapter,
  isWide,
  onToggleWide,
  showTip,
}: {
  seriesId: string;
  seriesTitle: string | null;
  chapter: ChapterDto | null;
  prevChapter: ChapterDto | null;
  nextChapter: ChapterDto | null;
  isWide: boolean;
  onToggleWide: () => void;
  showTip: boolean;
}) {
  const router = useRouter();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between gap-4 px-4 bg-background/95 backdrop-blur border-b border-border/60">
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href={`/series/${seriesId}`}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="Back to series"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Link>
        <div className="min-w-0">
          {seriesTitle && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {seriesTitle}
            </p>
          )}
          <p className="text-xs font-medium text-foreground truncate">
            {chapter
              ? chapter.title ?? `Chapter ${chapter.chapterNumber}`
              : "Loading…"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {showTip && (
          <Link
            href={`/tip/${seriesId}`}
            className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Tip creator"
          >
            <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Tip</span>
          </Link>
        )}
        <button
          onClick={onToggleWide}
          aria-label={isWide ? "narrow view" : "wide view"}
          className="hidden sm:inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          {isWide ? (
            <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          disabled={!prevChapter}
          onClick={() =>
            prevChapter &&
            router.push(`/read/${seriesId}/${prevChapter.id}`)
          }
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">Prev</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          disabled={!nextChapter}
          onClick={() =>
            nextChapter &&
            router.push(`/read/${seriesId}/${nextChapter.id}`)
          }
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

// ─── Bottom chapter nav ───────────────────────────────────────────────────────

function ReaderBottomNav({
  seriesId,
  prevChapter,
  nextChapter,
  showTip,
}: {
  seriesId: string;
  prevChapter: ChapterDto | null;
  nextChapter: ChapterDto | null;
  showTip: boolean;
}) {
  return (
    <div className="mt-10 mb-16 px-4 flex flex-col items-center gap-6">
      {showTip && (
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-6 py-5 flex flex-col items-center gap-3 text-center">
          <Heart className="h-6 w-6 text-pink-400" strokeWidth={1.5} />
          <p className="text-sm font-medium text-white/90">Enjoying this series?</p>
          <p className="text-xs text-white/50">Send the creator a USDC tip directly on-chain.</p>
          <Button asChild size="sm" className="bg-white text-black hover:bg-white/90 rounded-xl px-6">
            <Link href={`/tip/${seriesId}`}>
              Tip creator
            </Link>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        {prevChapter ? (
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href={`/read/${seriesId}/${prevChapter.id}`}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
              Ch {prevChapter.chapterNumber}
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled className="border-white/20 text-white/30">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            No previous
          </Button>
        )}

        <Button asChild variant="ghost" size="sm">
          <Link href={`/series/${seriesId}`} className="text-white/40 text-xs hover:text-white/70">
            Series
          </Link>
        </Button>

        {nextChapter ? (
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href={`/read/${seriesId}/${nextChapter.id}`}>
              Ch {nextChapter.chapterNumber}
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled className="border-white/20 text-white/30">
            No next
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChapterReaderPage() {
  const { seriesId, chapterId } = useParams<{
    seriesId: string;
    chapterId: string;
  }>();

  const [isWide, setIsWide] = useState(false);

  const {
    pages,
    pagesLoading,
    pagesError,
    chapters,
    byId: seriesById,
    fetchPages,
    fetchChapters,
    fetchSeriesById,
  } = useSeriesStore();

  const { user } = useAuth();
  const { upsert } = useReadingStore();
  const progressRecorded = useRef(false);

  useEffect(() => {
    progressRecorded.current = false;
    fetchPages(chapterId);
    fetchChapters(seriesId);
    if (!seriesById[seriesId]) {
      fetchSeriesById(seriesId);
    }
  }, [seriesId, chapterId, fetchPages, fetchChapters, fetchSeriesById, seriesById]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [chapters],
  );

  const currentChapter = useMemo(
    () => chapters.find((c) => c.id === chapterId) ?? null,
    [chapters, chapterId],
  );

  const currentIdx = useMemo(
    () => sortedChapters.findIndex((c) => c.id === chapterId),
    [sortedChapters, chapterId],
  );

  const prevChapter = currentIdx > 0 ? sortedChapters[currentIdx - 1] : null;
  const nextChapter =
    currentIdx >= 0 && currentIdx < sortedChapters.length - 1
      ? sortedChapters[currentIdx + 1]
      : null;

  const series = seriesById[seriesId] ?? null;

  // Only show the tip button when the series has a creator and it isn't the logged-in user.
  const showTip = !!user && !!series?.creatorId && series.creatorId !== user.id;

  // Record reading progress only for authenticated users — guests read freely but earn nothing.
  useEffect(() => {
    if (
      !user ||
      progressRecorded.current ||
      pagesLoading ||
      pages.length === 0 ||
      !currentChapter
    ) {
      return;
    }
    progressRecorded.current = true;
    upsert({
      seriesId,
      status: ReadingStatus.READING,
      currentChapter: currentChapter.chapterNumber,
    }).catch(() => {
      // Non-critical — reading progress will sync on next successful upsert.
    });
  }, [user, pagesLoading, pages.length, currentChapter, seriesId, upsert]);

  const maxContentWidth = isWide ? 1200 : 800;

  return (
    <div className="min-h-screen bg-black text-white">
      <ReaderTopBar
        seriesId={seriesId}
        seriesTitle={series?.title ?? null}
        chapter={currentChapter}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
        isWide={isWide}
        onToggleWide={() => setIsWide((w) => !w)}
        showTip={showTip}
      />

      {/* Fixed top bar is 48px (h-12). Guest banner sits immediately below it. */}
      <div className="pt-12">
        {!user && <GuestBanner seriesId={seriesId} />}

        {pagesLoading && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-white/30" />
          </div>
        )}

        {pagesError && !pagesLoading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white/60">
            <AlertCircle className="h-8 w-8" strokeWidth={1.5} />
            <p className="text-sm">Failed to load chapter pages.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPages(chapterId)}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Retry
            </Button>
          </div>
        )}

        {!pagesLoading && !pagesError && pages.length > 0 && (
          <div
            className="mx-auto"
            style={{ maxWidth: maxContentWidth }}
          >
            {pages.map((page) => (
              <MangaPage
                key={page.pageNumber}
                page={page}
                maxWidth={maxContentWidth}
                isPriority={page.pageNumber <= 3}
              />
            ))}
          </div>
        )}

        {!pagesLoading && !pagesError && pages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-white/60">
            <p className="text-sm">No pages found for this chapter.</p>
            <Button asChild variant="outline" size="sm" className="text-white border-white/20 hover:bg-white/10">
              <Link href={`/series/${seriesId}`}>Back to series</Link>
            </Button>
          </div>
        )}

        <ReaderBottomNav
          seriesId={seriesId}
          prevChapter={prevChapter}
          nextChapter={nextChapter}
          showTip={showTip}
        />
      </div>
    </div>
  );
}
