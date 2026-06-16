import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  // ─── Application ────────────────────────────────────────────────────────────

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
      // Auto-approve for now — admin review queue comes post-launch
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
      status: (user?.creatorStatus ?? 'NONE') as CreatorApplicationStatusDto['status'],
      submittedAt: user?.creatorApplication?.submittedAt?.toISOString() ?? null,
    };
  }

  // ─── Series CRUD ─────────────────────────────────────────────────────────────

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
    return series;
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
    return series;
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
    return series;
  }

  // ─── Public profile ───────────────────────────────────────────────────────────

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

  // ─── Chapters ─────────────────────────────────────────────────────────────────

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
            pageCount: dto.pages.length,
            publishedAt: new Date(),
            pages: {
              create: dto.pages.map((url, idx) => ({
                pageNumber: idx + 1,
                imageUrl: url,
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

    return {
      ...chapter,
      publishedAt: chapter.publishedAt?.toISOString() ?? null,
      createdAt: chapter.createdAt.toISOString(),
    };
  }

  // ─── Earnings ─────────────────────────────────────────────────────────────────

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

  // ─── Helpers ──────────────────────────────────────────────────────────────────

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
