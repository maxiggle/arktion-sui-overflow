/**
 * Contract for a read-only external content source (MangaDex today, others
 * later). ChapterService depends on this abstraction — never on a concrete
 * adapter — so adding a source is a new class bound to CONTENT_SOURCE_ADAPTER,
 * not an edit to the consumer.
 */

export interface SourceChapter {
  /** Source-side chapter id — stored as Chapter.externalId. */
  externalId: string;
  /** Numeric chapter; may be fractional (e.g. 1.5 for side stories). */
  chapterNumber: number;
  title: string | null;
  /** Translation language. ISO 639-1. */
  language: string;
  pageCount: number;
  publishedAt: Date | null;
}

export interface SourcePage {
  pageNumber: number;
  imageUrl: string;
}

export interface ContentSourceAdapter {
  /** Stable identifier for this source — the selection key for a registry. */
  readonly sourceId: string;

  /** Chapter metadata for a series, keyed by the source-side series id. */
  listChapters(
    seriesExternalId: string,
    language?: string,
    limit?: number,
  ): Promise<SourceChapter[]>;

  /** Live page image URLs for a chapter, keyed by the source-side chapter id. */
  getPages(
    chapterExternalId: string,
    dataSaver?: boolean,
  ): Promise<SourcePage[]>;
}

/** DI token for the active content-source adapter. */
export const CONTENT_SOURCE_ADAPTER = Symbol('CONTENT_SOURCE_ADAPTER');
