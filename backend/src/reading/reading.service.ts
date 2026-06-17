import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { InkService, InkTrigger } from '../ink/ink.service';
import {
  BadgesService,
  BadgeCategory,
  ReadingBadgeType,
} from '../badges/badges.service';
import { UpsertReadingRecordDto } from './dto/upsert-reading-record.dto';
import { ReadingRecordDto } from './dto/reading-record.dto';

export type { UpsertReadingRecordDto, ReadingRecordDto };

export enum ReadingStatus {
  READING = 0,
  COMPLETED = 1,
  ON_HOLD = 2,
  DROPPED = 3,
  PLAN_TO_READ = 4,
}

/** Chapter interval that triggers a CHAPTER_READ INK reward. */
const CHAPTER_MILESTONE_INTERVAL = 25;

@Injectable()
export class ReadingService {
  private readonly logger = new Logger(ReadingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inkService: InkService,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * Upsert a reading record for a series.
   *
   * Phase 1 note: this is Postgres-only. The on-chain reading_history::add_or_update_record
   * call requires ctx.sender() == library.owner (the user must sign). Phase 1 does
   * not have user-signed PTBs wired up. The UserLibrary on-chain object exists as
   * an ownership anchor; Postgres is the authoritative data store. On-chain sync
   * is Batch 4 (Walrus snapshot via set_history_blob, which is admin-callable).
   *
   * After updating Postgres, milestone checks fire INK earn transactions and
   * badge mints as needed. These ARE admin-signed PTBs.
   */
  async upsertRecord(
    userId: string,
    walletAddress: string,
    dto: UpsertReadingRecordDto,
  ): Promise<ReadingRecordDto> {
    const series = await this.prisma.series.findFirst({
      where: { id: dto.seriesId, deletedAt: null },
    });
    if (!series) {
      throw new NotFoundException(`Series ${dto.seriesId} not found`);
    }

    if (dto.currentChapter < 0) {
      throw new BadRequestException('currentChapter must be >= 0');
    }

    const existing = await this.prisma.readingRecord.findUnique({
      where: { userId_seriesId: { userId, seriesId: dto.seriesId } },
    });

    const prevChapter = existing?.currentChapter ?? 0;
    const prevStatus = existing?.status ?? null;
    const isNew = !existing;
    const wasCompleted = prevStatus === ReadingStatus.COMPLETED;
    const nowCompleted = dto.status === ReadingStatus.COMPLETED;

    const record = await this.prisma.readingRecord.upsert({
      where: { userId_seriesId: { userId, seriesId: dto.seriesId } },
      create: {
        userId,
        seriesId: dto.seriesId,
        status: dto.status,
        currentChapter: dto.currentChapter,
        lastReadAt: new Date(),
        completedAt: nowCompleted ? new Date() : null,
      },
      update: {
        status: dto.status,
        currentChapter: dto.currentChapter,
        lastReadAt: new Date(),

        ...(!wasCompleted && nowCompleted && { completedAt: new Date() }),
      },
    });

    if (isNew) {
      await this.prisma.passport.update({
        where: { userId },
        data: { seriesTracked: { increment: 1 } },
      });
    }

    this.checkAndFireMilestones({
      userId,
      walletAddress,
      seriesId: dto.seriesId,
      prevChapter,
      newChapter: dto.currentChapter,
      isNew,
      wasCompleted,
      nowCompleted,
    }).catch((err: Error) => {
      this.logger.error(
        `Milestone check failed for userId=${userId} series=${dto.seriesId}: ${err.message}`,
        err.stack,
      );
    });

    return {
      id: record.id,
      seriesId: record.seriesId,
      status: record.status,
      currentChapter: record.currentChapter,
      lastReadAt: record.lastReadAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
    };
  }

  /** All reading records for a user, optionally filtered by status. */
  async getRecords(
    userId: string,
    status?: ReadingStatus,
  ): Promise<ReadingRecordDto[]> {
    const records = await this.prisma.readingRecord.findMany({
      where: {
        userId,
        ...(status !== undefined && { status }),
      },
      orderBy: { lastReadAt: 'desc' },
    });

    return records.map((r) => this.toDto(r));
  }

  /** A single reading record for a specific series. */
  async getRecord(userId: string, seriesId: string): Promise<ReadingRecordDto | null> {
    const record = await this.prisma.readingRecord.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
    });
    return record ? this.toDto(record) : null;
  }

  /**
   * Remove a series from the user's library.
   * Hard delete — reading records are user-controlled data.
   */
  async deleteRecord(userId: string, seriesId: string): Promise<void> {
    const record = await this.prisma.readingRecord.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
    });
    if (!record) {
      throw new NotFoundException(`No reading record for series ${seriesId}`);
    }

    await this.prisma.$transaction([
      this.prisma.readingRecord.delete({
        where: { userId_seriesId: { userId, seriesId } },
      }),
      this.prisma.passport.update({
        where: { userId },
        data: { seriesTracked: { decrement: 1 } },
      }),
    ]);
  }

  /**
   * Determines which INK rewards and badges to fire based on the transition
   * from prevChapter → newChapter, then executes them in sequence.
   *
   * Milestone rules (agreed in session):
   *   - Chapter 1 of a NEW series: CHAPTER_READ reward
   *   - Every 25 chapters crossed in a single update: CHAPTER_READ per milestone
   *   - Status → COMPLETED: SERIES_COMPLETE reward + Series Completionist badge
   */
  private async checkAndFireMilestones(params: {
    userId: string;
    walletAddress: string;
    seriesId: string;
    prevChapter: number;
    newChapter: number;
    isNew: boolean;
    wasCompleted: boolean;
    nowCompleted: boolean;
  }): Promise<void> {
    const {
      userId,
      walletAddress,
      seriesId,
      prevChapter,
      newChapter,
      isNew,
      wasCompleted,
      nowCompleted,
    } = params;

    const rewards: Array<{ key: string; trigger: InkTrigger }> = [];

    if (isNew && newChapter >= 1) {
      rewards.push({
        key: `ink:${userId}:chapter_read:${seriesId}:chapter1`,
        trigger: InkTrigger.CHAPTER_READ,
      });
    }

    const prevMilestone = Math.floor(prevChapter / CHAPTER_MILESTONE_INTERVAL);
    const newMilestone = Math.floor(newChapter / CHAPTER_MILESTONE_INTERVAL);
    for (let m = prevMilestone + 1; m <= newMilestone; m++) {
      const chapterMark = m * CHAPTER_MILESTONE_INTERVAL;
      rewards.push({
        key: `ink:${userId}:chapter_read:${seriesId}:milestone${chapterMark}`,
        trigger: InkTrigger.CHAPTER_READ,
      });
    }

    if (nowCompleted && !wasCompleted) {
      rewards.push({
        key: `ink:${userId}:series_complete:${seriesId}`,
        trigger: InkTrigger.SERIES_COMPLETE,
      });
    }

    for (const reward of rewards) {
      try {
        await this.inkService.mintEarning({
          userId,
          walletAddress,
          triggerType: reward.trigger,
          idempotencyKey: reward.key,
        });
      } catch (err: unknown) {
        const message = (err as Error).message ?? '';
        if (!message.includes('already minted')) {
          throw err;
        }
      }
    }

    if (nowCompleted && !wasCompleted) {
      const passport = await this.prisma.passport.findUnique({
        where: { userId },
        select: { seriesCompleted: true },
      });

      await this.prisma.passport.update({
        where: { userId },
        data: { seriesCompleted: { increment: 1 } },
      });

      await this.badgesService.mint({
        userId,
        walletAddress,
        category: BadgeCategory.READING_ACHIEVEMENT,
        badgeType: ReadingBadgeType.SERIES_COMPLETIONIST,
        seriesKey: '',
        tier: 0,
      });

      await this.prisma.passport.update({
        where: { userId },
        data: { chaptersRead: { increment: newChapter } },
      });

      this.logger.log(
        `Series completed: userId=${userId} series=${seriesId} ` +
          `total_completed=${(passport?.seriesCompleted ?? 0) + 1}`,
      );
    }

    if (isNew && newChapter >= 1) {
      await this.badgesService.mint({
        userId,
        walletAddress,
        category: BadgeCategory.READING_ACHIEVEMENT,
        badgeType: ReadingBadgeType.FIRST_CHAPTER,
        seriesKey: '',
        tier: 0,
      });
    }
  }

  private toDto(record: {
    id: string;
    seriesId: string;
    status: number;
    currentChapter: number;
    lastReadAt: Date;
    completedAt: Date | null;
    createdAt: Date;
  }): ReadingRecordDto {
    return {
      id: record.id,
      seriesId: record.seriesId,
      status: record.status,
      currentChapter: record.currentChapter,
      lastReadAt: record.lastReadAt,
      completedAt: record.completedAt,
      createdAt: record.createdAt,
    };
  }
}
