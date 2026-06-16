import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import type { SeriesDto } from '../series/series.service';
import {
  CreatorService,
  type CreatorProfileDto,
  type CreatorApplicationStatusDto,
  type CreatorChapterDto,
  type CreatorEarningsDto,
} from './creator.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreatorGuard } from './guards/creator.guard';
import { WalrusService } from '../walrus/walrus.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('creator')
export class CreatorController {
  constructor(
    private readonly creatorService: CreatorService,
    private readonly walrusService: WalrusService,
  ) {}

  // ─── Application (no CreatorGuard — open to all authenticated users) ────────

  @UseGuards(JwtAuthGuard)
  @Get('application/status')
  async getApplicationStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatorApplicationStatusDto> {
    return this.creatorService.getApplicationStatus(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyCreatorDto,
  ): Promise<CreatorApplicationStatusDto> {
    return this.creatorService.apply(user.id, dto);
  }

  // ─── Creator-only routes (JwtAuthGuard + CreatorGuard) ───────────────────────

  /**
   * POST /api/v1/creator/upload
   * Upload an image to Walrus. Returns { blobId, url }.
   * The url can be stored as a series coverUrl or chapter page.
   */
  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ blobId: string; url: string }> {
    if (!file) throw new BadRequestException('file is required');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'unsupported file type — jpeg, png, webp, or gif only',
      );
    }
    return this.walrusService.uploadBlob(file.buffer);
  }

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Get('series')
  async getOwnSeries(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SeriesDto[]> {
    return this.creatorService.getOwnSeries(user.id);
  }

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Post('series')
  async createSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSeriesDto,
  ): Promise<SeriesDto> {
    return this.creatorService.createSeries(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Patch('series/:seriesId')
  async updateSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @Body() dto: UpdateSeriesDto,
  ): Promise<SeriesDto> {
    return this.creatorService.updateSeries(user.id, seriesId, dto);
  }

  // ─── Chapter management ───────────────────────────────────────────────────────

  /**
   * GET /api/v1/creator/series/:seriesId/chapters
   * List all chapters for one of the creator's series.
   */
  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Get('series/:seriesId/chapters')
  async getSeriesChapters(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
  ): Promise<CreatorChapterDto[]> {
    return this.creatorService.getSeriesChapters(user.id, seriesId);
  }

  /**
   * POST /api/v1/creator/series/:seriesId/chapters
   * Create a chapter with pre-uploaded Walrus page URLs.
   */
  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Post('series/:seriesId/chapters')
  async createChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @Body() dto: CreateChapterDto,
  ): Promise<CreatorChapterDto> {
    return this.creatorService.createChapter(user.id, seriesId, dto);
  }

  /**
   * GET /api/v1/creator/earnings
   * Confirmed tip earnings for the authenticated creator.
   */
  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Get('earnings')
  async getEarnings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatorEarningsDto> {
    return this.creatorService.getEarnings(user.id);
  }

  // ─── Public routes (no auth required) ────────────────────────────────────────

  @Get('profile/:creatorId')
  async getPublicProfile(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<CreatorProfileDto> {
    return this.creatorService.getPublicProfile(creatorId);
  }

  @Get('profile/:creatorId/series')
  async getPublicSeries(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<SeriesDto[]> {
    return this.creatorService.getPublicSeries(creatorId);
  }
}
