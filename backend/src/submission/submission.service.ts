import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Transaction } from '@mysten/sui/transactions';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { GasService } from '../sui/gas.service';
import { InkTrigger } from '../ink/ink.service';
import { BadgeCategory, ContributorBadgeType } from '../badges/badges.service';

import { Prisma } from '../../generated/prisma/client';

import { CreateSubmissionDto } from './dto/create-submission.dto';
import type {
  SubmissionDto,
  VoteTallyDto,
  CastVoteResponseDto,
} from './dto/submission.dto';

export type { CreateSubmissionDto, SubmissionDto };

export const SubmissionStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;
export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

const DAO = {
  /** Minimum total INK weight across all votes for the outcome to be binding. */
  QUORUM_INK: 500n,
  /**
   * Fraction of approve INK required for a submission to pass.
   * 6000 = 60 %, expressed in basis points (0–10000).
   */
  APPROVAL_BPS: 6000n,
  /** Minimum INK balance required to vote. */
  MIN_INK_TO_VOTE: 1n,
} as const;

type VoteRow = { vote: number; inkWeight: bigint; voterId: string };
type SubmissionRow = Prisma.SubmissionGetPayload<{ include: { votes: true } }>;

@Injectable()
export class SubmissionService {
  private readonly logger = new Logger(SubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly gas: GasService,
  ) {}

  private buildTally(votes: VoteRow[], votingEndsAt: Date): VoteTallyDto {
    let approveInk = 0n;
    let rejectInk = 0n;
    let approveCount = 0;
    let rejectCount = 0;

    for (const v of votes) {
      if (v.vote === 1) {
        approveInk += v.inkWeight;
        approveCount++;
      } else {
        rejectInk += v.inkWeight;
        rejectCount++;
      }
    }

    const totalInk = approveInk + rejectInk;
    const quorumMet = totalInk >= DAO.QUORUM_INK;

    const approvalPct =
      totalInk === 0n
        ? 0
        : Math.round(Number((approveInk * 1000n) / totalInk)) / 10;

    const approveBps = totalInk === 0n ? 0n : (approveInk * 10000n) / totalInk;
    const finalisable =
      quorumMet &&
      (approveBps >= DAO.APPROVAL_BPS ||
        approveBps < 10000n - DAO.APPROVAL_BPS);

    return {
      approveCount,
      rejectCount,
      approveInk: approveInk.toString(),
      rejectInk: rejectInk.toString(),
      totalInk: totalInk.toString(),
      approvalPct,
      quorumMet,
      finalisable,
      expired: new Date() > votingEndsAt,
    };
  }

  private toDto(row: SubmissionRow, callerId?: string): SubmissionDto {
    const tally = this.buildTally(row.votes, row.votingEndsAt);
    const myVote =
      callerId != null
        ? ((row.votes.find((v) => v.voterId === callerId)?.vote ?? null) as
            | 1
            | 0
            | null)
        : null;

    return {
      id: row.id,
      title: row.title,
      formatType: row.formatType,
      externalUrl: row.externalUrl,
      suggestedSource: row.suggestedSource,
      status: row.status,
      rewardClaimed: row.rewardClaimed,
      reviewedAt: row.reviewedAt,
      createdAt: row.createdAt,
      votingEndsAt: row.votingEndsAt,
      votes: tally,
      myVote,
    };
  }

  /**
   * Submit a series suggestion.
   *
   * Phase 1 note: Postgres only — no on-chain Submission object.
   * The approve flow calls ink_earning::earn + badges::mint directly (as admin)
   * rather than routing through submission::claim_reward, achieving the same
   * atomicity without needing an on-chain Submission object.
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
      include: { votes: true },
    });

    return this.toDto(submission, userId);
  }

  /**
   * Cast an INK-weighted vote on a pending submission.
   *
   * - Caller must hold ≥ MIN_INK_TO_VOTE INK (earned by reading on-chain).
   * - INK balance is snapshot at cast time — not at finalisation.
   * - One vote per reader. Changing your vote (upsert) is allowed.
   * - After each vote the tally is re-checked; if quorum + decisive threshold
   *   is met the submission auto-finalises.
   */
  async castVote(
    submissionId: string,
    userId: string,
    vote: 0 | 1,
  ): Promise<CastVoteResponseDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { votes: true },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new ConflictException('This submission has already been finalised');
    }

    const now = new Date();
    if (now > submission.votingEndsAt) {
      await this._finalise(submissionId, submission.votes);
      throw new ConflictException(
        'The voting window for this submission has closed',
      );
    }

    const inkRow = await this.prisma.inkBalance.findUnique({
      where: { userId },
    });
    const inkBalance = inkRow?.balance ?? 0n;
    if (inkBalance < DAO.MIN_INK_TO_VOTE) {
      throw new ForbiddenException(
        'You need at least 1 INK to vote. Earn INK by reading chapters on Arktion.',
      );
    }

    await this.prisma.submissionVote.upsert({
      where: { submissionId_voterId: { submissionId, voterId: userId } },
      create: { submissionId, voterId: userId, vote, inkWeight: inkBalance },
      update: { vote, inkWeight: inkBalance },
    });

    const allVotes = (await this.prisma.submissionVote.findMany({
      where: { submissionId },
    })) as VoteRow[];

    const tally = this.buildTally(allVotes, submission.votingEndsAt);
    let autoFinalised = false;

    if (tally.finalisable) {
      const totalBig = BigInt(tally.totalInk);
      const approveBig = BigInt(tally.approveInk);
      const shouldApprove =
        totalBig > 0n && (approveBig * 10000n) / totalBig >= DAO.APPROVAL_BPS;
      await this._finalise(submissionId, allVotes, shouldApprove);
      autoFinalised = true;
    }

    return {
      submissionId,
      vote,
      inkWeight: inkBalance.toString(),
      autoFinalised,
    };
  }

  /** Submissions created by the authenticated user. */
  async getMySubmissions(userId: string): Promise<SubmissionDto[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { submitterId: userId },
      orderBy: { createdAt: 'desc' },
      include: { votes: true },
    });
    return submissions.map((s) => this.toDto(s, userId));
  }

  /** All PENDING submissions — for DAO voters. Includes the caller's own vote. */
  async getForDao(callerId: string): Promise<SubmissionDto[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { status: SubmissionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: { votes: true },
    });
    return submissions.map((s) => this.toDto(s, callerId));
  }

  /** All pending submissions — admin view (no voter context needed). */
  async getPending(): Promise<SubmissionDto[]> {
    const submissions = await this.prisma.submission.findMany({
      where: { status: SubmissionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: { votes: true },
    });
    return submissions.map((s) => this.toDto(s));
  }

  /**
   * Resolve a submission to APPROVED or REJECTED.
   *
   * Called automatically when quorum + decisive threshold is met (`forceApprove`
   * is set by the caller), or lazily when the voting window has expired
   * (`forceApprove` is `undefined` → decide from tally).
   *
   * The status guard at the top prevents double-finalisation under concurrent requests.
   */
  private async _finalise(
    submissionId: string,
    votes: VoteRow[],
    forceApprove?: boolean,
  ): Promise<void> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { submitter: true },
    });

    if (!submission || submission.status !== SubmissionStatus.PENDING) return;

    let approve: boolean;
    if (forceApprove !== undefined) {
      approve = forceApprove;
    } else {
      const tally = this.buildTally(votes, submission.votingEndsAt);
      if (!tally.quorumMet) {
        approve = false;
      } else {
        const totalBig = BigInt(tally.totalInk);
        const approveBig = BigInt(tally.approveInk);
        approve =
          totalBig > 0n && (approveBig * 10000n) / totalBig >= DAO.APPROVAL_BPS;
      }
    }

    if (approve) {
      await this._executeApproval(submission.id, submission.submitter);
    } else {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.REJECTED, reviewedAt: new Date() },
      });
      this.logger.log(`Submission ${submissionId} DAO-rejected`);
    }
  }

  /**
   * Execute the on-chain PTB + Postgres transaction for approval.
   *
   * One PTB calls ink_earning::earn + badges::mint — both succeed or neither
   * does. After the PTB succeeds, Postgres is updated atomically:
   * submission status + InkLedgerEntry + InkBalance + Passport + BadgeEarned.
   */
  private async _executeApproval(
    submissionId: string,
    submitter: { id: string; walletAddress: string },
  ): Promise<void> {
    const idempotencyKey = `ink:${submitter.id}:submission_approved:${submissionId}`;

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
        tx.pure.u8(InkTrigger.SUBMISSION_APPROVED),
        tx.pure.string(idempotencyKey),
      ],
    });

    if (!alreadyHasBadge) {
      tx.moveCall({
        target: `${this.sui.packageId}::badges::mint`,
        arguments: [
          tx.object(this.sui.adminCapId),
          tx.object(this.sui.badgeRegistryId),
          tx.pure.address(submitter.walletAddress),
          tx.pure.u8(BadgeCategory.CONTRIBUTOR),
          tx.pure.u8(ContributorBadgeType.SUBMISSION_APPROVED),
          tx.pure.string(''),
          tx.pure.u8(0),
          tx.pure.vector('u8', []),
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
  }

  async adminApprove(submissionId: string): Promise<SubmissionDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { submitter: true, votes: true },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new ConflictException(
        `Submission is already ${submission.status === SubmissionStatus.APPROVED ? 'approved' : 'rejected'}`,
      );
    }

    await this._executeApproval(submissionId, submission.submitter);

    const updated = await this.prisma.submission.findUniqueOrThrow({
      where: { id: submissionId },
      include: { votes: true },
    });
    return this.toDto(updated);
  }

  async adminReject(submissionId: string): Promise<SubmissionDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { votes: true },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new ConflictException('Submission is not pending');
    }

    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.REJECTED, reviewedAt: new Date() },
      include: { votes: true },
    });
    return this.toDto(updated);
  }
}
