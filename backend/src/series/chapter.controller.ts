import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';

import { ChapterService, type ChapterDto, type PageDto } from './chapter.service';

/**
 * Chapter and page delivery endpoints.
 *
 * Public — no auth required for the chapter list and page URLs themselves.
 * Reading progress (which fires INK rewards) goes through POST /reading/records
 * in ReadingController and DOES require auth.
 */
@Controller()
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  /** Chapter list for a series, syncing from MangaDex on cache miss. */
  @Get('series/:id/chapters')
  getChapters(
    @Param('id', ParseUUIDPipe) seriesId: string,
    @Query('language', new DefaultValuePipe('en')) language: string,
    @Query('refresh', new DefaultValuePipe(false), ParseBoolPipe)
    refresh: boolean,
  ): Promise<ChapterDto[]> {
    return this.chapterService.getChapters(seriesId, language, refresh);
  }

  /**
   * Page image URLs for a chapter.
   * For MangaDex-sourced chapters the URLs are short-lived and fetched live —
   * callers should NOT cache the response beyond the current reading session.
   */
  @Get('chapters/:id/pages')
  getPages(
    @Param('id', ParseUUIDPipe) chapterId: string,
    @Query('dataSaver', new DefaultValuePipe(false), ParseBoolPipe)
    dataSaver: boolean,
  ): Promise<PageDto[]> {
    return this.chapterService.getPages(chapterId, dataSaver);
  }
}
