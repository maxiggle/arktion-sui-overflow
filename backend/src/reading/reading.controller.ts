import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { ReadingService, ReadingStatus } from './reading.service';
import { UpsertReadingRecordDto } from './dto/upsert-reading-record.dto';
import type { ReadingRecordDto } from './dto/reading-record.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

class UpsertBodyDto {
  @IsUUID()
  seriesId!: string;

  @IsEnum(ReadingStatus)
  @Type(() => Number)
  status!: ReadingStatus;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentChapter!: number;
}

class RecordsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;
}

@Controller('reading')
@UseGuards(JwtAuthGuard)
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  /**
   * POST /api/v1/reading/records
   *
   * Add or update a series in the user's reading library.
   * Milestone INK rewards and badges fire asynchronously after the response.
   */
  @Post('records')
  async upsertRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertBodyDto,
  ): Promise<ReadingRecordDto> {
    return this.readingService.upsertRecord(user.id, user.walletAddress, {
      seriesId: dto.seriesId,
      status: dto.status,
      currentChapter: dto.currentChapter,
    });
  }

  /**
   * GET /api/v1/reading/records?status=0
   *
   * All reading records for the authenticated user. Optionally filter by status.
   */
  @Get('records')
  async getRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RecordsQueryDto,
  ): Promise<ReadingRecordDto[]> {
    return this.readingService.getRecords(user.id, query.status);
  }

  /**
   * GET /api/v1/reading/records/:seriesId
   *
   * A single reading record for the given series UUID.
   */
  @Get('records/:seriesId')
  async getRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
  ): Promise<ReadingRecordDto> {
    return this.readingService.getRecord(user.id, seriesId);
  }

  /**
   * DELETE /api/v1/reading/records/:seriesId
   *
   * Remove a series from the user's library. Hard delete.
   */
  @Delete('records/:seriesId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('seriesId', ParseUUIDPipe) seriesId: string,
  ): Promise<void> {
    return this.readingService.deleteRecord(user.id, seriesId);
  }
}
