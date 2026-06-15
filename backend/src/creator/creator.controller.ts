import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import type { SeriesDto } from '../series/series.service';
import { CreatorService, CreatorProfileDto } from './creator.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

@Controller('creator')
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  /**
   * GET /api/v1/creator/series
   * Returns all series owned by the authenticated creator.
   */
  @UseGuards(JwtAuthGuard)
  @Get('series')
  async getOwnSeries(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SeriesDto[]> {
    return this.creatorService.getOwnSeries(user.id);
  }

  /**
   * POST /api/v1/creator/series
   * Create a new series. The authenticated user becomes the creator.
   */
  @UseGuards(JwtAuthGuard)
  @Post('series')
  async createSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSeriesDto,
  ): Promise<SeriesDto> {
    return this.creatorService.createSeries(user.id, dto);
  }

  /**
   * PATCH /api/v1/creator/series/:seriesId
   * Update a series. Only the owning creator may call this.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('series/:seriesId')
  async updateSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @Body() dto: UpdateSeriesDto,
  ): Promise<SeriesDto> {
    return this.creatorService.updateSeries(user.id, seriesId, dto);
  }

  /**
   * GET /api/v1/creator/profile/:creatorId
   * Public creator profile — no auth required.
   */
  @Get('profile/:creatorId')
  async getPublicProfile(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<CreatorProfileDto> {
    return this.creatorService.getPublicProfile(creatorId);
  }

  /**
   * GET /api/v1/creator/profile/:creatorId/series
   * Public list of a creator's series — no auth required.
   */
  @Get('profile/:creatorId/series')
  async getPublicSeries(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<SeriesDto[]> {
    return this.creatorService.getPublicSeries(creatorId);
  }
}
