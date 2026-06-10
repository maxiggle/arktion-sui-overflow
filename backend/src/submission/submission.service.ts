import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { GasService } from '../sui/gas.service';
import { InkService, InkTrigger } from '../ink/ink.service';
import {
  BadgesService,
  BadgeCategory,
  ContributorBadgeType,
} from '../badges/badges.service';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionDto } from './dto/submission.dto';

export type { CreateSubmissionDto, SubmissionDto };

export const SubmissionStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;
export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly gas: GasService,
    private readonly inkService: InkService,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * Create a series suggestion.
   *
   * Phase 1 note: Postgres only — no on-chain Submission object.
   * The submission::create Move function requires ctx.sender() == submitter
   * (user must sign). User-signed PTBs are Batch 4.
   *
   * The approve flow calls ink_earning::earn + badges::mint directly (as admin)
   * rather than routing through submission::claim_reward, achieving the same
   * atomicity without needing the on-chain Submission object.
   */
  async create(
    userId: string,
    dto: CreateSubmissionDto,
  ): Promise<SubmissionDto> {
    const submission = await this.prisma.submission.create({
      data: {
        submitterId: userId,

        suiObjectId: `pending:${crypto.randomUUID()}`,
        title: dto.title,
        formatType: dto.formatType,
        externalUrl: dto.externalUrl,
        suggestedSource: dto.suggestedSource,
        status: SubmissionStatus.PENDING,
      },
    });

    return this.toDto(submission);
  }

  /** Submissions created by the authenticated user. */
  async getMySubmissions(userId: string): Promise<SubmissionDto[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { submitterId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return submissions.map((submission) => this.toDto(submission));
  }

  /** All pending submissions — admin only. */
  async getPending(): Promise<SubmissionDto[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { status: SubmissionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });
    return submissions.map((submission) => this.toDto(submission));
  }

  /**
   * Approve a submission and atomically disburse the reward.
   *
   * One PTB calls ink_earning::earn + badges::mint — both succeed or neither
   * does. This matches the atomicity semantics of submission::claim_reward in
   * the Move contract, without requiring an on-chain Submission object.
   *
   * After the PTB succeeds, Postgres is updated in a single transaction:
   * submission status + InkLedgerEntry + InkBalance + Passport + BadgeEarned.
   */
  async approve(submissionId: string): Promise<SubmissionDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { submitter: true },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new ConflictException(
        `Submission is already ${submission.status === SubmissionStatus.APPROVED ? 'approved' : 'rejected'}`,
      );
    }

    const submitter = submission.submitter;
    const idempotencyKey = `ink:${submitter.id}:submission_approved:${submissionId}`;

    this.logger.log(
      `Approving submission ${submissionId} for user ${submitter.id}`,
    );

    // Check if this user already has the Contributor badge — the contract
    // enforces (recipient, category, badge_type, series_id) uniqueness and
    // will abort with EBadgeAlreadyMinted on a second mint attempt.
    const alreadyHasBadge = !!(await this.prisma.badgeEarned.findFirst({
      where: {
        userId: submitter.id,
        category: BadgeCategory.CONTRIBUTOR,
        badgeType: ContributorBadgeType.SUBMISSION_APPROVED,
        seriesId: null,
      },
    }));

    const tx = new Transaction();

    tx.moveCall({
      target: `${this.sui.packageId}::ink_earning::earn`,
      arguments: [
        tx.object(this.sui.adminCapId),
        tx.object(this.sui.inkTreasuryCapId),
        tx.object(this.sui.earningRegistryId),
        tx.pure.address(submitter.walletAddress),
        tx.pure(bcs.u8().serialize(InkTrigger.SUBMISSION_APPROVED).toBytes()),
        tx.pure(bcs.string().serialize(idempotencyKey).toBytes()),
      ],
    });

    if (!alreadyHasBadge) {
      tx.moveCall({
        target: `${this.sui.packageId}::badges::mint`,
        arguments: [
          tx.object(this.sui.adminCapId),
          tx.object(this.sui.badgeRegistryId),
          tx.pure.address(submitter.walletAddress),
          tx.pure(bcs.u8().serialize(BadgeCategory.CONTRIBUTOR).toBytes()),
          tx.pure(
            bcs
              .u8()
              .serialize(ContributorBadgeType.SUBMISSION_APPROVED)
              .toBytes(),
          ),
          tx.pure(bcs.string().serialize('').toBytes()),
          tx.pure(bcs.u8().serialize(0).toBytes()),
          tx.pure(bcs.vector(bcs.u8()).serialize([]).toBytes()),
        ],
      });
    }

    const result = await this.gas.executeAsAdmin(tx);
    const txDigest = result.Transaction!.digest;

    const objectTypes = result.Transaction!.objectTypes ?? {};
    const badgeObjectId = result
      .Transaction!.effects.changedObjects.filter(
        (c) => c.idOperation === 'Created',
      )
      .map((c) => c.objectId)
      .find((id) => objectTypes[id]?.endsWith('::badges::ArktionBadge'));

    if (!badgeObjectId) {
      this.logger.warn(
        `Badge object not found in tx ${txDigest} — badge may have been pre-minted`,
      );
    }

    const inkAmount = 50n;

    await this.prisma.$transaction(async (tx) => {
      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.APPROVED,
          rewardClaimed: true,
          reviewedAt: new Date(),
        },
      });

      await tx.inkLedgerEntry.upsert({
        where: { idempotencyKey },
        create: {
          userId: submitter.id,
          actionType: InkTrigger.SUBMISSION_APPROVED,
          amount: inkAmount,
          idempotencyKey,
          suiTxDigest: txDigest,
        },
        update: { suiTxDigest: txDigest },
      });

      await tx.inkBalance.upsert({
        where: { userId: submitter.id },
        create: {
          userId: submitter.id,
          balance: inkAmount,
          lastUpdatedAt: new Date(),
        },
        update: {
          balance: { increment: inkAmount },
          lastUpdatedAt: new Date(),
        },
      });

      await tx.passport.update({
        where: { userId: submitter.id },
        data: { totalInkEarned: { increment: inkAmount } },
      });

      if (badgeObjectId) {
        const existing = await tx.badgeEarned.findFirst({
          where: {
            userId: submitter.id,
            category: BadgeCategory.CONTRIBUTOR,
            badgeType: ContributorBadgeType.SUBMISSION_APPROVED,
            seriesId: null,
          },
        });
        if (!existing) {
          await tx.badgeEarned.create({
            data: {
              userId: submitter.id,
              suiObjectId: badgeObjectId,
              category: BadgeCategory.CONTRIBUTOR,
              badgeType: ContributorBadgeType.SUBMISSION_APPROVED,
              seriesId: null,
              tier: 0,
              metadataBlobId: '',
            },
          });
        }
      }
    });

    this.logger.log(
      `Submission ${submissionId} approved: +50 INK + Contributor badge → ${submitter.walletAddress} tx=${txDigest}`,
    );

    const updated = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
    });
    return this.toDto(updated);
  }

  /** Reject a pending submission. Postgres only — no chain call. */
  async reject(submissionId: string): Promise<SubmissionDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new ConflictException('Submission is not pending');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.REJECTED,
        reviewedAt: new Date(),
      },
    });

    return this.toDto(updated);
  }

  private toDto(submission: {
    id: string;
    title: string;
    formatType: number;
    externalUrl: string;
    suggestedSource: string;
    status: number;
    rewardClaimed: boolean;
    reviewedAt: Date | null;
    createdAt: Date;
  }): SubmissionDto {
    return {
      id: submission.id,
      title: submission.title,
      formatType: submission.formatType,
      externalUrl: submission.externalUrl,
      suggestedSource: submission.suggestedSource,
      status: submission.status,
      rewardClaimed: submission.rewardClaimed,
      reviewedAt: submission.reviewedAt,
      createdAt: submission.createdAt,
    };
  }
}
