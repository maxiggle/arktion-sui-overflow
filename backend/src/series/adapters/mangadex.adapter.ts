import { Injectable, Logger } from '@nestjs/common';

import type {
  ContentSourceAdapter,
  SourceChapter,
  SourcePage,
} from './content-source.adapter';

/**
 * MangaDex public API adapter — one implementation of ContentSourceAdapter.
 *
 * Phase 1 reads ONLY — we don't write back to MangaDex. Two methods:
 *   - listChapters(): chapter metadata for a series, used by ChapterService to
 *     populate the `chapters` table.
 *   - getPages(): page image URLs for a chapter, fetched live (the URLs are
 *     short-lived so we don't cache them in Postgres).
 *
 * Docs: https://api.mangadex.org/docs
 * No auth required for these endpoints. Rate limit: ~5 req/s.
 */

const MANGADEX_BASE = 'https://api.mangadex.org';
const USER_AGENT = 'Arktion/1.0 (hackathon demo; contact@arktion.app)';

/** Abort a single MangaDex request if it takes longer than this. */
const FETCH_TIMEOUT_MS = 8_000;

interface MangaDexFeedResponse {
  data: Array<{
    id: string;
    attributes: {
      chapter: string | null;
      title: string | null;
      translatedLanguage: string;
      pages: number;
      publishAt: string | null;
    };
  }>;
  total: number;
}

interface MangaDexAtHomeResponse {
  baseUrl: string;
  chapter: {
    hash: string;
    /** Original-quality filenames. */
    data: string[];
    /** Compressed (data-saver) filenames. */
    dataSaver: string[];
  };
}

@Injectable()
export class MangaDexAdapter implements ContentSourceAdapter {
  private readonly logger = new Logger(MangaDexAdapter.name);

  readonly sourceId = 'mangadex';

  /**
   * Paginated chapter feed for a manga.
   *
   * @param mangaExternalId  MangaDex manga UUID (matches Series.externalId for
   *                         MangaDex-sourced series).
   * @param language         Translation language (default: en).
   * @param limit            Max 500 per MangaDex docs.
   */
  async listChapters(
    mangaExternalId: string,
    language = 'en',
    limit = 500,
  ): Promise<SourceChapter[]> {
    const out: SourceChapter[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const params = new URLSearchParams({
        limit: String(Math.min(limit, 100)), // MangaDex caps per-page at 100
        offset: String(offset),
        'translatedLanguage[]': language,
        'order[chapter]': 'asc',
        'includes[]': 'scanlation_group',
      });
      params.append('contentRating[]', 'safe');
      params.append('contentRating[]', 'suggestive');

      const url = `${MANGADEX_BASE}/manga/${mangaExternalId}/feed?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!res.ok) {
        throw new Error(
          `MangaDex feed ${res.status} ${res.statusText} for manga ${mangaExternalId}`,
        );
      }

      const json = (await res.json()) as MangaDexFeedResponse;
      total = json.total;

      for (const c of json.data) {
        const rawChapter = c.attributes.chapter;
        if (rawChapter === null) continue; // skip "oneshot"-style entries without a chapter number
        const chapterNumber = Number(rawChapter);
        if (!Number.isFinite(chapterNumber)) continue;

        out.push({
          externalId: c.id,
          chapterNumber,
          title: c.attributes.title?.trim() || null,
          language: c.attributes.translatedLanguage,
          pageCount: c.attributes.pages,
          publishedAt: c.attributes.publishAt
            ? new Date(c.attributes.publishAt)
            : null,
        });
      }

      offset += json.data.length;
      if (json.data.length === 0) break; // defensive: avoid infinite loop on a buggy total

      // Rate-limit politeness — MangaDex allows 5 req/s; we stay well under.
      await new Promise((r) => setTimeout(r, 250));
    }

    // MangaDex sometimes returns the same chapter number from multiple scanlation
    // groups. Dedupe by chapterNumber, keeping the earliest publishAt.
    const byNumber = new Map<number, SourceChapter>();
    for (const c of out) {
      const existing = byNumber.get(c.chapterNumber);
      if (
        !existing ||
        (c.publishedAt &&
          existing.publishedAt &&
          c.publishedAt < existing.publishedAt)
      ) {
        byNumber.set(c.chapterNumber, c);
      }
    }
    return [...byNumber.values()].sort(
      (a, b) => a.chapterNumber - b.chapterNumber,
    );
  }

  /**
   * Live page URL fetch for a chapter. URLs are short-lived (MangaDex rotates
   * the at-home server), so we never cache these — call this each time a
   * reader opens a chapter.
   *
   * @param chapterExternalId MangaDex chapter UUID.
   * @param dataSaver         If true, use compressed images (faster, lower quality).
   */
  async getPages(
    chapterExternalId: string,
    dataSaver = false,
  ): Promise<SourcePage[]> {
    const url = `${MANGADEX_BASE}/at-home/server/${chapterExternalId}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(
        `MangaDex at-home ${res.status} ${res.statusText} for chapter ${chapterExternalId}`,
      );
    }

    const json = (await res.json()) as MangaDexAtHomeResponse;
    const { baseUrl, chapter } = json;
    const quality = dataSaver ? 'data-saver' : 'data';
    const files = dataSaver ? chapter.dataSaver : chapter.data;

    return files.map((filename, i) => ({
      pageNumber: i + 1,
      imageUrl: `${baseUrl}/${quality}/${chapter.hash}/${filename}`,
    }));
  }
}
