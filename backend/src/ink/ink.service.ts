import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Transaction } from '@mysten/sui/transactions';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { GasService } from '../sui/gas.service';
import { toSkipTake } from '../common/pagination';

/**
 * Maps to the trigger constants in arktion::ink_earning.
 * Keep in sync with the Move module — these values ARE the on-chain enum.
 */
export const InkTrigger = {
  CHAPTER_READ: 0,
  SERIES_COMPLETE: 1,
  SUBMISSION_APPROVED: 2,
} as const;
export type InkTrigger = (typeof InkTrigger)[keyof typeof InkTrigger];

/** Mirrors CHAPTER_READ_AMOUNT / SERIES_COMPLETE_AMOUNT / SUBMISSION_APPROVED_AMOUNT in Move. */
const INK_AMOUNTS: Record<InkTrigger, bigint> = {
  [InkTrigger.CHAPTER_READ]: 10n,
  [InkTrigger.SERIES_COMPLETE]: 100n,
  [InkTrigger.SUBMISSION_APPROVED]: 50n,
};

/**
 * Minimum cumulative INK earned (not spent) to reach each level.
 * Index = level - 1. Source: PRD §5 Reader Levels.
 */
const LEVEL_THRESHOLDS = [0n, 500n, 2000n, 6000n, 15000n, 40000n];

export interface MintEarningResult {
  txDigest: string;
  amount: bigint;
  newBalance: bigint;
  newLevel: number;
}

export interface InkBalanceDto {
  balance: string;
  level: number;
  totalInkEarned: string;
}

export interface InkLedgerEntryDto {
  id: string;
  actionType: number;
  amount: string;
  idempotencyKey: string;
  suiTxDigest: string | null;
  createdAt: Date;
}

export interface InkLedgerPage {
  data: InkLedgerEntryDto[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InkService {
  private readonly logger = new Logger(InkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly gas: GasService,
  ) {}

  /**
   * Mint INK for a qualifying platform action.
   *
   * Idempotency pattern:
   *   1. Check InkLedgerEntry for a completed record (suiTxDigest non-null).
   *      If found, return cached result — no chain call.
   *   2. Call ink_earning::earn on-chain with idempotencyKey.
   *      The contract aborts if the key was already processed, so even if
   *      Postgres missed recording a prior success, the chain prevents
   *      double-minting.
   *   3. Write InkLedgerEntry + update InkBalance + update Passport in a
   *      single Prisma transaction.
   *
   * Idempotency key format is the caller's responsibility.
   * Recommended: `ink:{userId}:{triggerName}:{contextSuffix}`
   * e.g. `ink:abc123:chapter_read:seriesXYZ:chapter1`
   */
  async mintEarning(params: {
    userId: string;
    walletAddress: string;
    triggerType: InkTrigger;
    idempotencyKey: string;
  }): Promise<MintEarningResult> {
    const { userId, walletAddress, triggerType, idempotencyKey } = params;

    const existing = await this.prisma.inkLedgerEntry.findUnique({
      where: { idempotencyKey },
    });
    if (existing?.suiTxDigest) {
      this.logger.debug(`INK earn already recorded: ${idempotencyKey}`);
      const balance = await this.prisma.inkBalance.findUnique({
        where: { userId },
      });
      const passport = await this.prisma.passport.findUnique({
        where: { userId },
      });
      return {
        txDigest: existing.suiTxDigest,
        amount: existing.amount,
        newBalance: balance?.balance ?? 0n,
        newLevel: this.calculateLevel(passport?.totalInkEarned ?? 0n),
      };
    }

    this.logger.log(
      `Minting INK: userId=${userId} trigger=${triggerType} key=${idempotencyKey}`,
    );

    const tx = new Transaction();
    tx.moveCall({
      target: `${this.sui.packageId}::ink_earning::earn`,
      arguments: [
        tx.object(this.sui.adminCapId),
        tx.object(this.sui.inkTreasuryCapId),
        tx.object(this.sui.earningRegistryId),
        tx.pure.address(walletAddress),
        tx.pure.u8(triggerType),
        tx.pure.string(idempotencyKey),
      ],
    });

    let txDigest: string;
    try {
      const result = await this.gas.executeAsAdmin(tx);
      txDigest = result.Transaction!.digest;
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (message.includes('EDuplicateIdempotencyKey')) {
        this.logger.warn(
          `Chain idempotency key collision for ${idempotencyKey}. ` +
            `Postgres mirror out of sync — skipping Postgres write.`,
        );
        throw new ConflictException(
          'INK already minted for this action. No double-mint occurred.',
        );
      }
      throw err;
    }

    const amount = INK_AMOUNTS[triggerType];

    await this.prisma.$transaction([
      this.prisma.inkLedgerEntry.upsert({
        where: { idempotencyKey },
        create: {
          userId,
          actionType: triggerType,
          amount,
          idempotencyKey,
          suiTxDigest: txDigest,
        },
        update: { suiTxDigest: txDigest },
      }),
      this.prisma.inkBalance.upsert({
        where: { userId },
        create: { userId, balance: amount, lastUpdatedAt: new Date() },
        update: {
          balance: { increment: amount },
          lastUpdatedAt: new Date(),
        },
      }),
      this.prisma.passport.update({
        where: { userId },
        data: { totalInkEarned: { increment: amount } },
      }),
    ]);

    const [updatedPassport, updatedBalance] = await Promise.all([
      this.prisma.passport.findUnique({
        where: { userId },
        select: { totalInkEarned: true },
      }),
      this.prisma.inkBalance.findUnique({
        where: { userId },
        select: { balance: true },
      }),
    ]);

    const newLevel = this.calculateLevel(updatedPassport?.totalInkEarned ?? 0n);

    this.logger.log(
      `INK minted: +${amount} → userId=${userId} newLevel=${newLevel} tx=${txDigest}`,
    );

    return {
      txDigest,
      amount,
      newBalance: updatedBalance?.balance ?? amount,
      newLevel,
    };
  }

  /**
   * Fast balance read from the Postgres mirror.
   * For a fresh on-chain read, callers should fetch the Passport object directly.
   */
  async getBalance(userId: string): Promise<InkBalanceDto> {
    const [balance, passport] = await Promise.all([
      this.prisma.inkBalance.findUnique({ where: { userId } }),
      this.prisma.passport.findUnique({
        where: { userId },
        select: { totalInkEarned: true, level: true },
      }),
    ]);

    return {
      balance: (balance?.balance ?? 0n).toString(),
      level: passport?.level ?? 1,
      totalInkEarned: (passport?.totalInkEarned ?? 0n).toString(),
    };
  }

  /** Paginated INK ledger — all earning events for a user, newest first. */
  async getLedger(
    userId: string,
    page: number,
    limit: number,
  ): Promise<InkLedgerPage> {
    const { skip, take } = toSkipTake(page, limit);

    const [entries, total] = await Promise.all([
      this.prisma.inkLedgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.inkLedgerEntry.count({ where: { userId } }),
    ]);

    return {
      data: entries.map((e) => ({
        id: e.id,
        actionType: e.actionType,
        amount: e.amount.toString(),
        idempotencyKey: e.idempotencyKey,
        suiTxDigest: e.suiTxDigest,
        createdAt: e.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Derives reader level from lifetime INK earned.
   * Level is based on INK EARNED (not spent) — prevents pay-to-win dynamics.
   * PRD §5: levels 1–6 at 0 / 500 / 2000 / 6000 / 15000 / 40000 INK.
   */
  calculateLevel(totalInkEarned: bigint): number {
    let level = 1;
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      if (totalInkEarned >= LEVEL_THRESHOLDS[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    return level;
  }
}
