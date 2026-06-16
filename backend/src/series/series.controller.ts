import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { SeriesService, SeriesDto, SeriesPage } from './series.service';

class SeriesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(4)
  formatType?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /**
   * GET /api/v1/series?formatType=1&status=ongoing&search=Solo&page=1&limit=20
   *
   * Public — no auth required. Readers can browse before signing in.
   */
  @Get()
  async findAll(@Query() query: SeriesQueryDto): Promise<SeriesPage> {
    return this.seriesService.findAll({
      formatType: query.formatType,
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * GET /api/v1/series/:id
   *
   * Fetch a single series by its Postgres UUID.
   */
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<SeriesDto> {
    return this.seriesService.findById(id);
  }
}
