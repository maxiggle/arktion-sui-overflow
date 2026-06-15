import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  FORMAT_LABELS,
  getChapterPages,
  getChapters,
  upsertReadingRecord,
  type ChapterDto,
  type PageDto,
  type SeriesDto,
} from '../lib/api';

const FORMAT_NOVEL = 0;
const FORMAT_MANGA = 1;
const FORMAT_MANHWA = 2;
const FORMAT_MANHUA = 3;
const FORMAT_WEBTOON = 4;

type ReadingMode = 'vertical' | 'paginated-ltr' | 'paginated-rtl';

function readingModeFor(formatType: number): ReadingMode {
  if (formatType === FORMAT_MANHWA || formatType === FORMAT_WEBTOON)
    return 'vertical';
  if (formatType === FORMAT_MANGA) return 'paginated-rtl';
  return 'paginated-ltr'; // manhua, novels (novels not supported but fall through)
}

export function ReaderCard({
  series,
  authed,
}: {
  series: SeriesDto | null;
  authed: boolean;
}) {
  const qc = useQueryClient();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  // Reset reader state when the user picks a different series.
  useEffect(() => {
    setActiveChapterId(null);
    setPageIndex(0);
  }, [series?.id]);

  const chaptersQ = useQuery<ChapterDto[], ApiError>({
    queryKey: ['chapters', series?.id],
    queryFn: () => getChapters(series!.id, 'en'),
    enabled: !!series,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const pagesQ = useQuery<PageDto[], ApiError>({
    queryKey: ['chapter-pages', activeChapterId],
    queryFn: () => getChapterPages(activeChapterId!, false),
    enabled: !!activeChapterId,
    // MangaDex at-home URLs are short-lived — don't reuse beyond the session.
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const markRead = useMutation({
    mutationFn: ({
      seriesId,
      chapterNumber,
    }: {
      seriesId: string;
      chapterNumber: number;
    }) =>
      upsertReadingRecord({
        seriesId,
        status: 0, // READING
        currentChapter: Math.max(1, Math.floor(chapterNumber)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reading-records'] });
      qc.invalidateQueries({ queryKey: ['ink-balance'] });
      qc.invalidateQueries({ queryKey: ['badges'] });
    },
  });

  const activeChapter = useMemo(
    () => chaptersQ.data?.find((c) => c.id === activeChapterId) ?? null,
    [chaptersQ.data, activeChapterId],
  );

  const mode: ReadingMode = series
    ? readingModeFor(series.formatType)
    : 'vertical';

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!series) {
    return (
      <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <h2 className="text-lg font-semibold">Reader</h2>
        <p className="mt-2 text-sm text-slate-400">
          Pick a series from the browser above to start reading.
        </p>
      </section>
    );
  }

  if (series.formatType === FORMAT_NOVEL) {
    return (
      <section className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <h2 className="text-lg font-semibold">Reader · {series.title}</h2>
        <p className="mt-2 text-sm text-slate-400">
          Novel format isn't supported in Phase 1 — MangaDex doesn't host novel
          text. Text Studio (Phase 2) will bring novels online.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Reader · <span className="text-indigo-300">{series.title}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {FORMAT_LABELS[series.formatType]} · mode:{' '}
            <span className="font-mono">{mode}</span>
          </p>
        </div>
        <button
          onClick={() => chaptersQ.refetch()}
          disabled={chaptersQ.isFetching}
          className="rounded bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600 disabled:opacity-50"
        >
          {chaptersQ.isFetching ? 'Loading…' : 'Refresh chapters'}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[220px,1fr]">
        {/* Chapter list */}
        <aside className="rounded border border-slate-700 bg-slate-900 max-h-[420px] overflow-y-auto">
          {chaptersQ.isPending && (
            <p className="p-3 text-sm text-slate-400">Loading chapters…</p>
          )}
          {chaptersQ.error && (
            <p className="p-3 text-sm text-red-400">
              {chaptersQ.error.message}
            </p>
          )}
          {chaptersQ.data && chaptersQ.data.length === 0 && (
            <p className="p-3 text-sm text-slate-500">
              No English chapters indexed yet for this series.
            </p>
          )}
          {chaptersQ.data && chaptersQ.data.length > 0 && (
            <ul className="divide-y divide-slate-700/60">
              {chaptersQ.data.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setActiveChapterId(c.id);
                      setPageIndex(0);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800/80 ${
                      activeChapterId === c.id
                        ? 'bg-indigo-900/40 text-indigo-200'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="font-mono text-xs text-slate-500">
                      Ch {c.chapterNumber}
                    </span>{' '}
                    {c.title ?? <span className="text-slate-500">—</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Pages viewport */}
        <div className="rounded border border-slate-700 bg-slate-900 min-h-[420px] flex flex-col">
          {!activeChapter && (
            <p className="m-auto text-sm text-slate-500">
              Select a chapter to start reading.
            </p>
          )}

          {activeChapter && pagesQ.isPending && (
            <p className="m-auto text-sm text-slate-400">Loading pages…</p>
          )}
          {activeChapter && pagesQ.error && (
            <p className="m-auto text-sm text-red-400">
              {pagesQ.error.message}
            </p>
          )}

          {activeChapter && pagesQ.data && pagesQ.data.length === 0 && (
            <p className="m-auto text-sm text-slate-500">
              No pages returned for this chapter.
            </p>
          )}

          {activeChapter && pagesQ.data && pagesQ.data.length > 0 && (
            <PagesViewer
              mode={mode}
              pages={pagesQ.data}
              pageIndex={pageIndex}
              setPageIndex={setPageIndex}
            />
          )}

          {/* Mark-as-read footer */}
          {activeChapter && pagesQ.data && pagesQ.data.length > 0 && (
            <div className="border-t border-slate-700 px-3 py-2 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {mode === 'vertical'
                  ? 'Scroll to end, then mark complete.'
                  : `Page ${pageIndex + 1} of ${pagesQ.data.length}`}
              </p>
              <button
                disabled={!authed || markRead.isPending}
                onClick={() =>
                  markRead.mutate({
                    seriesId: series.id,
                    chapterNumber: activeChapter.chapterNumber,
                  })
                }
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs hover:bg-emerald-600 disabled:opacity-40"
                title={!authed ? 'Sign in to track reading' : 'Mark chapter complete'}
              >
                {markRead.isPending
                  ? 'Saving…'
                  : markRead.isSuccess
                    ? '✓ Marked read'
                    : `Mark Ch ${activeChapter.chapterNumber} read`}
              </button>
            </div>
          )}
        </div>
      </div>

      {!authed && (
        <p className="text-xs text-amber-400">
          Sign in with Google to track reading progress and earn INK on chapter
          milestones.
        </p>
      )}
    </section>
  );
}

// ─── Pages viewer ────────────────────────────────────────────────────────────

function PagesViewer({
  mode,
  pages,
  pageIndex,
  setPageIndex,
}: {
  mode: ReadingMode;
  pages: PageDto[];
  pageIndex: number;
  setPageIndex: (i: number) => void;
}) {
  if (mode === 'vertical') {
    return (
      <div className="max-h-[520px] overflow-y-auto bg-black">
        {pages.map((p) => (
          <img
            key={p.pageNumber}
            src={p.imageUrl}
            alt={`Page ${p.pageNumber}`}
            loading="lazy"
            className="w-full h-auto block"
            referrerPolicy="no-referrer"
          />
        ))}
      </div>
    );
  }

  const current = pages[pageIndex] ?? pages[0];
  const goPrev = () => setPageIndex(Math.max(0, pageIndex - 1));
  const goNext = () => setPageIndex(Math.min(pages.length - 1, pageIndex + 1));

  // For RTL manga, the right side of the viewport advances backward (earlier
  // page) and the left side advances forward (next page). For LTR manhua it's
  // the opposite. Swap the click handlers.
  const onLeftClick = mode === 'paginated-rtl' ? goNext : goPrev;
  const onRightClick = mode === 'paginated-rtl' ? goPrev : goNext;

  return (
    <div className="relative bg-black flex items-center justify-center min-h-[420px] max-h-[520px]">
      <img
        src={current.imageUrl}
        alt={`Page ${current.pageNumber}`}
        className="max-h-[520px] w-auto object-contain"
        referrerPolicy="no-referrer"
      />
      <button
        aria-label="Tap left"
        onClick={onLeftClick}
        className="absolute inset-y-0 left-0 w-1/2 cursor-w-resize hover:bg-white/5"
      />
      <button
        aria-label="Tap right"
        onClick={onRightClick}
        className="absolute inset-y-0 right-0 w-1/2 cursor-e-resize hover:bg-white/5"
      />
      {mode === 'paginated-rtl' && (
        <span className="absolute top-2 right-2 rounded bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          Read right → left
        </span>
      )}
    </div>
  );
}
