import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import type { SeriesDto } from '../series/series.service';
import type { CreateSeriesDto } from './dto/create-series.dto';
import type { UpdateSeriesDto } from './dto/update-series.dto';

export interface CreatorProfileDto {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string;
  seriesCount: number;
  createdAt: string;
}

@Injectable()
export class CreatorService {
  constructor(private readonly prisma: PrismaService) {}

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
