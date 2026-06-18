import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { SeriesDto } from '../series/series.service';
import type { CreateSeriesDto } from './dto/create-series.dto';
import type { UpdateSeriesDto } from './dto/update-series.dto';
import type { ApplyCreatorDto } from './dto/apply-creator.dto';
import type { CreateChapterDto } from './dto/create-chapter.dto';

export interface CreatorProfileDto {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string;
  seriesCount: number;
  createdAt: string;
}

export interface CreatorApplicationStatusDto {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string | null;
}

export interface CreatorChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string | null;
  pageCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface EarningsTipDto {
  id: string;
  amountUsdc: string;
  seriesTitle: string;
  senderDisplayName: string | null;
  createdAt: string;
}

export interface CreatorEarningsDto {
  totalUsdcReceived: string;
  recentTips: EarningsTipDto[];
}

@Injectable()
export class CreatorService {
  private readonly walrusAggregator: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly aiService: AiService,
  ) {
    this.walrusAggregator = this.config.get<string>(
      'WALRUS_AGGREGATOR_URL',
      'https://aggregator.walrus-testnet.walrus.space',
    );
  }

  private resolveCoverUrl(raw: string | null): string | null {
    if (!raw) return null;
    if (raw.includes('://')) return raw;
    return `${this.walrusAggregator}/v1/blobs/${raw}`;
  }

  async apply(
    userId: string,
    dto: ApplyCreatorDto,
  ): Promise<CreatorApplicationStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creatorStatus: true },
    });

    if (user?.creatorStatus === 'APPROVED') {
      throw new ConflictException('You are already an approved creator');
    }
    if (user?.creatorStatus === 'PENDING') {
      throw new ConflictException('Your application is already under review');
    }

    const [application] = await this.prisma.$transaction([
      this.prisma.creatorApplication.upsert({
        where: { userId },
        create: {
          userId,
          pitch: dto.pitch,
          cadence: dto.cadence,
          tooling: dto.tooling,
          portfolioUrl: dto.portfolioUrl ?? null,
        },
        update: {
          pitch: dto.pitch,
          cadence: dto.cadence,
          tooling: dto.tooling,
          portfolioUrl: dto.portfolioUrl ?? null,
          submittedAt: new Date(),
          reviewedAt: null,
        },
      }),

      this.prisma.user.update({
        where: { id: userId },
        data: {
          creatorStatus: 'APPROVED',
          creatorApplication: {
            update: { reviewedAt: new Date() },
          },
        },
      }),
    ]);

    return {
      status: 'APPROVED',
      submittedAt: application.submittedAt.toISOString(),
    };
  }

  async getApplicationStatus(
    userId: string,
  ): Promise<CreatorApplicationStatusDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        creatorStatus: true,
        creatorApplication: { select: { submittedAt: true } },
      },
    });

    return {
      status: user?.creatorStatus ?? 'NONE',
      submittedAt: user?.creatorApplication?.submittedAt?.toISOString() ?? null,
    };
  }

  async getOwnSeries(userId: string): Promise<SeriesDto[]> {
    const series = await this.prisma.series.findMany({
      where: { creatorId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
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
    return series.map((s) => ({
      ...s,
      coverUrl: this.resolveCoverUrl(s.coverUrl),
    }));
  }

  async createSeries(userId: string, dto: CreateSeriesDto): Promise<SeriesDto> {
    const series = await this.prisma.series.create({
      data: {
        externalId: randomUUID(),
        title: dto.title,
        formatType: dto.formatType,
        sourceLanguage: dto.sourceLanguage,
        description: dto.description ?? null,
        coverUrl: dto.coverUrl ?? null,
        status: dto.status ?? 'ongoing',
        creatorId: userId,
      },
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
    return { ...series, coverUrl: this.resolveCoverUrl(series.coverUrl) };
  }

  async updateSeries(
    userId: string,
    seriesId: string,
    dto: UpdateSeriesDto,
  ): Promise<SeriesDto> {
    await this.assertOwnership(userId, seriesId);

    const series = await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.formatType !== undefined && { formatType: dto.formatType }),
        ...(dto.sourceLanguage !== undefined && {
          sourceLanguage: dto.sourceLanguage,
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
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
    return { ...series, coverUrl: this.resolveCoverUrl(series.coverUrl) };
  }

  async getPublicProfile(creatorId: string): Promise<CreatorProfileDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: creatorId, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        walletAddress: true,
        createdAt: true,
        _count: { select: { createdSeries: { where: { deletedAt: null } } } },
      },
    });

    if (!user) throw new NotFoundException(`Creator ${creatorId} not found`);

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      walletAddress: user.walletAddress,
      seriesCount: user._count.createdSeries,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getPublicSeries(creatorId: string): Promise<SeriesDto[]> {
    const exists = await this.prisma.user.findFirst({
      where: { id: creatorId, deletedAt: null },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Creator ${creatorId} not found`);

    return this.getOwnSeries(creatorId);
  }

  async getSeriesChapters(
    userId: string,
    seriesId: string,
  ): Promise<CreatorChapterDto[]> {
    await this.assertOwnership(userId, seriesId);

    const chapters = await this.prisma.chapter.findMany({
      where: { seriesId, deletedAt: null },
      orderBy: { chapterNumber: 'asc' },
      select: {
        id: true,
        seriesId: true,
        chapterNumber: true,
        title: true,
        pageCount: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return chapters.map((c) => ({
      ...c,
      publishedAt: c.publishedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async createChapter(
    userId: string,
    seriesId: string,
    dto: CreateChapterDto,
  ): Promise<CreatorChapterDto> {
    await this.assertOwnership(userId, seriesId);

    const series = await this.prisma.series.findFirst({
      where: { id: seriesId },
      select: { formatType: true },
    });

    const isNovel = series?.formatType === 0;

    // Validate and narrow to concrete types before entering the transaction.
    // TypeScript cannot narrow across async lambda boundaries, so we do it here.
    if (isNovel) {
      if (!dto.contentUrl) {
        throw new ConflictException('Novel chapters require a contentUrl');
      }
    } else if (!dto.pages?.length) {
      throw new ConflictException(
        'Image chapters require at least one page URL',
      );
    }

    const novelContentUrl: string = dto.contentUrl ?? '';
    const imageUrls: string[] = dto.pages ?? [];

    let chapter: {
      id: string;
      seriesId: string;
      chapterNumber: number;
      title: string | null;
      pageCount: number;
      publishedAt: Date | null;
      createdAt: Date;
    };

    try {
      chapter = await this.prisma.$transaction(async (tx) => {
        return tx.chapter.create({
          data: {
            seriesId,
            chapterNumber: dto.chapterNumber,
            title: dto.title ?? null,
            language: 'en',
            pageCount: isNovel ? 1 : imageUrls.length,
            publishedAt: new Date(),
            pages: {
              create: isNovel
                ? [
                    {
                      pageNumber: 1,
                      contentUrl: novelContentUrl,
                      imageUrl: null,
                    },
                  ]
                : imageUrls.map((url, idx) => ({
                    pageNumber: idx + 1,
                    imageUrl: url,
                    contentUrl: null,
                  })),
            },
          },
          select: {
            id: true,
            seriesId: true,
            chapterNumber: true,
            title: true,
            pageCount: true,
            publishedAt: true,
            createdAt: true,
          },
        });
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Chapter ${dto.chapterNumber} already exists in this series`,
        );
      }
      throw err;
    }

    const result = {
      ...chapter,
      publishedAt: chapter.publishedAt?.toISOString() ?? null,
      createdAt: chapter.createdAt.toISOString(),
    };

    // Index chapter content in MemWal for the AI writing assistant.
    // Fire-and-forget — never blocks the response.
    if (isNovel && dto.content) {
      void this.aiService.rememberChapterAsync(
        seriesId,
        chapter.chapterNumber,
        chapter.title,
        dto.content,
      );
    }

    return result;
  }

  async getEarnings(userId: string): Promise<CreatorEarningsDto> {
    const tips = await this.prisma.tipTransaction.findMany({
      where: { receiverId: userId, status: 1 },
      orderBy: { confirmedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        amountUsdc: true,
        createdAt: true,
        series: { select: { title: true } },
        sender: { select: { displayName: true } },
      },
    });

    const total = tips.reduce((sum, t) => sum + t.amountUsdc, BigInt(0));

    return {
      totalUsdcReceived: total.toString(),
      recentTips: tips.map((t) => ({
        id: t.id,
        amountUsdc: t.amountUsdc.toString(),
        seriesTitle: t.series.title,
        senderDisplayName: t.sender.displayName,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  private async assertOwnership(userId: string, seriesId: string) {
    const series = await this.prisma.series.findFirst({
      where: { id: seriesId, deletedAt: null },
      select: { creatorId: true },
    });
    if (!series) throw new NotFoundException(`Series ${seriesId} not found`);
    if (series.creatorId !== userId) {
      throw new ForbiddenException('You do not own this series');
    }
  }
}
