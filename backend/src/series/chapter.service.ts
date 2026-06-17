import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  MangaDexAdapter,
  type MangaDexPage,
} from './adapters/mangadex.adapter';

export interface ChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string | null;
  language: string;
  pageCount: number;
  isLicensed: boolean;
  inkCost: number;
  publishedAt: string | null;
}

export interface PageDto {
  pageNumber: number;
  imageUrl: string | null;
  contentUrl: string | null;
}

/**
 * Phase 1 chapter delivery.
 *
 * - Chapter list: read-through cache. First call per (series, language)
 *   syncs from MangaDex into the `chapters` table; subsequent calls serve
 *   from Postgres unless explicitly refreshed.
 * - Page list: NOT cached. MangaDex at-home URLs are short-lived, so we
 *   re-fetch every time. The page count is cached on the chapter row but
 *   the URLs are not stored.
 *
 * Phase 2 (Comic Studio uploads): chapters with `externalId === null` are
 * uploaded content. Pages live in the `pages` table with R2 URLs. The
 * service routes between the two sources based on whether externalId is set.
 */

/** Re-sync chapter list from MangaDex if cached copy is older than this. */
const CHAPTER_SYNC_TTL_MS = 1000 * 60 * 60 * 6; // 6h

@Injectable()
export class ChapterService {
  private readonly logger = new Logger(ChapterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mangadex: MangaDexAdapter,
  ) {}

  /**
   * Get the chapter list for a series, syncing from MangaDex if stale.
   *
   * @param seriesId Internal series UUID (not externalId).
   * @param language ISO 639-1 translation code (default: en).
   * @param force    Force re-sync even if cache is fresh.
   */
  async getChapters(
    seriesId: string,
    language = 'en',
    force = false,
  ): Promise<ChapterDto[]> {
    const series = await this.prisma.series.findFirst({
      where: { id: seriesId, deletedAt: null },
    });
    if (!series) throw new NotFoundException('Series not found');

    // Creator-published series have no externalId — skip MangaDex entirely.
    if (series.externalId) {
      const isStale =
        !series.chaptersSyncedAt ||
        Date.now() - series.chaptersSyncedAt.getTime() > CHAPTER_SYNC_TTL_MS;

      if (force || isStale) {
        const hasCachedChapters = await this.prisma.chapter.count({
          where: { seriesId, language, deletedAt: null },
        });

        const syncPromise = this.syncFromMangaDex(
          series.id,
          series.externalId,
          language,
        ).catch((err: Error) => {
          this.logger.warn(
            `MangaDex sync failed for series=${seriesId} (${series.externalId}): ${err.message}. Falling back to cache.`,
          );
        });

        if (hasCachedChapters === 0) {
          // No cache yet — must wait so the response isn't empty.
          await syncPromise;
        }
        // Otherwise fire-and-forget: return cached rows immediately, sync updates DB for next call.
      }
    }

    const chapters = await this.prisma.chapter.findMany({
      where: { seriesId, language, deletedAt: null },
      orderBy: { chapterNumber: 'asc' },
    });

    return chapters.map((c) => this.toDto(c));
  }

  /**
   * Fetch the page image URLs for a chapter.
   * For MangaDex-sourced chapters (externalId set), URLs come from a live
   * `at-home/server` call. For Phase 2 uploaded chapters, URLs come from the
   * `pages` table.
   */
  async getPages(chapterId: string, dataSaver = false): Promise<PageDto[]> {
    const chapter = await this.prisma.chapter.findFirst({
      where: { id: chapterId, deletedAt: null },
    });
    if (!chapter) throw new NotFoundException('Chapter not found');

    if (chapter.isLicensed) {
      // Phase 2: gate licensed chapters behind a purchase / subscription.
      // Phase 1 has no licensed content, so we just refuse if the flag was set
      // by accident in seeded data.
      throw new BadRequestException(
        'Licensed chapter access is not enabled in Phase 1.',
      );
    }

    if (chapter.externalId) {
      // MangaDex-sourced — live fetch, never cached.
      const pages: MangaDexPage[] = await this.mangadex.getPages(
        chapter.externalId,
        dataSaver,
      );

      // Opportunistically update pageCount if MangaDex now reports a different
      // number than what we have stored (some entries change after publication).
      if (pages.length !== chapter.pageCount) {
        await this.prisma.chapter
          .update({
            where: { id: chapter.id },
            data: { pageCount: pages.length },
          })
          .catch(() => undefined);
      }

      return pages.map((p) => ({ ...p, contentUrl: null }));
    }

    // Uploaded content — read from Page table.
    const rows = await this.prisma.page.findMany({
      where: { chapterId: chapter.id },
      orderBy: { pageNumber: 'asc' },
    });
    return rows.map((p) => ({
      pageNumber: p.pageNumber,
      imageUrl: p.imageUrl,
      contentUrl: p.contentUrl,
    }));
  }

  /**
   * Pull the chapter feed from MangaDex and upsert into Postgres.
   * Idempotent on (seriesId, language, chapterNumber).
   */
  private async syncFromMangaDex(
    seriesId: string,
    mangaExternalId: string,
    language: string,
  ): Promise<void> {
    this.logger.log(
      `Syncing chapters from MangaDex: series=${seriesId} lang=${language}`,
    );
    const upstream = await this.mangadex.listChapters(
      mangaExternalId,
      language,
    );

    // Upsert in batches to avoid one huge transaction.
    for (const c of upstream) {
      try {
        await this.prisma.chapter.upsert({
          where: {
            seriesId_language_chapterNumber: {
              seriesId,
              language: c.language,
              chapterNumber: c.chapterNumber,
            },
          },
          create: {
            seriesId,
            externalId: c.externalId,
            chapterNumber: c.chapterNumber,
            title: c.title,
            language: c.language,
            pageCount: c.pageCount,
            publishedAt: c.publishedAt,
          },
          update: {
            externalId: c.externalId,
            title: c.title,
            pageCount: c.pageCount,
            publishedAt: c.publishedAt,
          },
        });
      } catch (err) {
        this.logger.warn(
          `Skipping chapter ${c.chapterNumber} of ${mangaExternalId}: ${(err as Error).message}`,
        );
      }
    }

    await this.prisma.series.update({
      where: { id: seriesId },
      data: { chaptersSyncedAt: new Date() },
    });

    this.logger.log(
      `Synced ${upstream.length} chapter rows for series=${seriesId}`,
    );
  }

  private toDto(c: {
    id: string;
    seriesId: string;
    chapterNumber: number;
    title: string | null;
    language: string;
    pageCount: number;
    isLicensed: boolean;
    inkCost: number;
    publishedAt: Date | null;
  }): ChapterDto {
    return {
      id: c.id,
      seriesId: c.seriesId,
      chapterNumber: c.chapterNumber,
      title: c.title,
      language: c.language,
      pageCount: c.pageCount,
      isLicensed: c.isLicensed,
      inkCost: c.inkCost,
      publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    };
  }
}
