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
import { ApplyCreatorDto } from './dto/apply-creator.dto';

@Controller('creator')
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  @UseGuards(JwtAuthGuard)
  @Get('series')
  async getOwnSeries(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SeriesDto[]> {
    return this.creatorService.getOwnSeries(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('series')
  async createSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSeriesDto,
  ): Promise<SeriesDto> {
    return this.creatorService.createSeries(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('series/:seriesId')
  async updateSeries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
    @Body() dto: UpdateSeriesDto,
  ): Promise<SeriesDto> {
    return this.creatorService.updateSeries(user.id, seriesId, dto);
  }

  /** POST /api/v1/creator/apply */
  @UseGuards(JwtAuthGuard)
  @Post('apply')
  async applyAsCreator(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyCreatorDto,
  ): Promise<void> {
    return this.creatorService.applyAsCreator(user.id, dto);
  }

  /** GET /api/v1/creator/application/status */
  @UseGuards(JwtAuthGuard)
  @Get('application/status')
  async getApplicationStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' }> {
    return this.creatorService.getApplicationStatus(user.id);
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
