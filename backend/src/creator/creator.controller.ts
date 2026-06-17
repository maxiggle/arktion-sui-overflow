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

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

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
import { WalrusService } from '../sui/walrus.service';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/markdown',
  'text/plain',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('creator')
export class CreatorController {
  constructor(
    private readonly creatorService: CreatorService,
    private readonly walrusService: WalrusService,
  ) {}

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

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadFile(
    @UploadedFile() file: MulterFile,
  ): Promise<{ blobId: string; url: string }> {
    if (!file) throw new BadRequestException('file is required');
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'unsupported file type — jpeg, png, webp, or gif only',
      );
    }
    const { blobId } = await this.walrusService.upload(file.buffer);
    return { blobId, url: this.walrusService.getUrl(blobId) };
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

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Get('series/:seriesId/chapters')
  async getSeriesChapters(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
  ): Promise<CreatorChapterDto[]> {
    return this.creatorService.getSeriesChapters(user.id, seriesId);
  }

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Post('series/:seriesId/chapters')
  async createChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @Body() dto: CreateChapterDto,
  ): Promise<CreatorChapterDto> {
    return this.creatorService.createChapter(user.id, seriesId, dto);
  }

  @UseGuards(JwtAuthGuard, CreatorGuard)
  @Get('earnings')
  async getEarnings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreatorEarningsDto> {
    return this.creatorService.getEarnings(user.id);
  }

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
