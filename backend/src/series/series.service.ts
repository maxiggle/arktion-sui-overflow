import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export const FormatType = {
  NOVEL: 0,
  MANGA: 1,
  MANHWA: 2,
  MANHUA: 3,
  WEBTOON: 4,
} as const;
export type FormatType = (typeof FormatType)[keyof typeof FormatType];

export interface SeriesDto {
  id: string;
  externalId: string;
  title: string;
  formatType: number;
  sourceLanguage: string;
  coverUrl: string | null;
  description: string | null;
  status: string;
  createdAt: Date;
  creatorId: string | null;
}

export interface SeriesPage {
  data: SeriesDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Paginated series list with optional filters.
   * Reads Postgres only — no MangaDex runtime dependency.
   * The series table is populated by scripts/seed-series.ts before the demo.
   */
  async findAll(params: {
    formatType?: number;
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<SeriesPage> {
    const { formatType, status, search, page, limit } = params;
    const skip = (page - 1) * limit;

    const where = {
      deletedAt: null,
      ...(formatType !== undefined && { formatType }),
      ...(status && { status }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [series, total] = await Promise.all([
      this.prisma.series.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          externalId: true,
          title: true,
          formatType: true,
          sourceLanguage: true,
          coverUrl: true,
          description: true,
          status: true,
          createdAt: true,
          creatorId: true,
        },
      }),
      this.prisma.series.count({ where }),
    ]);

    return { data: series, total, page, limit };
  }

  /** Find series by its Postgres UUID. Throws 404 if not found or soft-deleted. */
  async findById(id: string): Promise<SeriesDto> {
    const series = await this.prisma.series.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        externalId: true,
        title: true,
        formatType: true,
        sourceLanguage: true,
        coverUrl: true,
        description: true,
        status: true,
        createdAt: true,
        creatorId: true,
      },
    });

    if (!series) throw new NotFoundException(`Series ${id} not found`);
    return series;
  }

  /** Find series by MangaDex (or other external platform) ID. */
  async findByExternalId(externalId: string): Promise<SeriesDto> {
    const series = await this.prisma.series.findFirst({
      where: { externalId, deletedAt: null },
      select: {
        id: true,
        externalId: true,
        title: true,
        formatType: true,
        sourceLanguage: true,
        coverUrl: true,
        description: true,
        status: true,
        createdAt: true,
        creatorId: true,
      },
    });

    if (!series)
      throw new NotFoundException(
        `Series with externalId=${externalId} not found`,
      );
    return series;
  }
}
