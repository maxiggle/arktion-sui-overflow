import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { toSkipTake } from '../common/pagination';

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
  private readonly walrusAggregator: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.walrusAggregator = this.config.get<string>(
      'WALRUS_AGGREGATOR_URL',
      'https://aggregator.walrus-testnet.walrus.space',
    );
  }

  /**
   * Normalise a stored cover value to a full URL.
   *
   * Older records saved a raw Walrus blobId (no scheme) instead of the full
   * aggregator URL. Detect by the absence of "://" and construct the URL so
   * the client always receives a usable image URL.
   */
  private resolveCoverUrl(raw: string | null): string | null {
    if (!raw) return null;
    if (raw.includes('://')) return raw;
    return `${this.walrusAggregator}/v1/blobs/${raw}`;
  }

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
    const { skip, take } = toSkipTake(page, limit);

    const where = {
      deletedAt: null,
      // Draft series are never visible on the public explore page.
      // If a specific non-draft status is requested, honour it; otherwise exclude drafts.
      status: status && status !== 'draft' ? status : { not: 'draft' },
      ...(formatType !== undefined && { formatType }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
    };

    const [series, total] = await Promise.all([
      this.prisma.series.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
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

    return {
      data: series.map((s) => ({
        ...s,
        coverUrl: this.resolveCoverUrl(s.coverUrl),
      })),
      total,
      page,
      limit,
    };
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
    return { ...series, coverUrl: this.resolveCoverUrl(series.coverUrl) };
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
    return { ...series, coverUrl: this.resolveCoverUrl(series.coverUrl) };
  }
}
