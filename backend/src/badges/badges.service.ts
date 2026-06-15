import { Injectable, Logger } from '@nestjs/common';
import { Transaction } from '@mysten/sui/transactions';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { GasService, AdminTxResult } from '../sui/gas.service';

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Badge categories — mirrors constants in arktion::badges Move module.
 * Values are the on-chain u8 category codes.
 */
export const BadgeCategory = {
  READING_ACHIEVEMENT: 0,
  COMMUNITY: 1,
  SERIES_LORE: 2,
  CREATOR: 3,
  CONTRIBUTOR: 4,
} as const;
export type BadgeCategory = (typeof BadgeCategory)[keyof typeof BadgeCategory];

/**
 * Reading Achievement badge types (category = READING_ACHIEVEMENT).
 * series_id must be empty for these badges.
 */
export const ReadingBadgeType = {
  FIRST_CHAPTER: 0,
  BINGE_READER: 1,
  SERIES_COMPLETIONIST: 2,
  MARATHON_READER: 3,
  OG_READER: 4,
} as const;
export type ReadingBadgeType =
  (typeof ReadingBadgeType)[keyof typeof ReadingBadgeType];

/**
 * Contributor badge types (category = CONTRIBUTOR).
 * series_id must be empty for these badges.
 * SUBMISSION_APPROVED = 0 matches CONTRIBUTOR_SUBMISSION_APPROVED in submission.move.
 */
export const ContributorBadgeType = {
  SUBMISSION_APPROVED: 0,
  TRANSLATION_BOUNTY_CREATOR: 1,
  FANFICTION_PATRON: 2,
} as const;
export type ContributorBadgeType =
  (typeof ContributorBadgeType)[keyof typeof ContributorBadgeType];

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface MintBadgeParams {
  userId: string;
  walletAddress: string;
  category: BadgeCategory;
  badgeType: number;
  /** Empty string for all non-Series-Lore categories (enforced by Move contract). */
  seriesKey: string;
  tier: number;
  /** Postgres UUID for the Series row. Null for non-Series-Lore badges. */
  seriesDbId?: string;
}

export interface MintBadgeResult {
  suiObjectId: string;
  txDigest: string;
  alreadyMinted: boolean;
}

export interface BadgeDto {
  id: string;
  suiObjectId: string;
  category: number;
  badgeType: number;
  seriesId: string | null;
  tier: number;
  metadataBlobId: string;
  awardedAt: Date;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly gas: GasService,
  ) {}

  /**
   * Mint a soul-bound badge for a user.
   *
   * Idempotency:
   *   - Postgres mirror checked first (fast path).
   *   - Move contract enforces composite-key idempotency (EBadgeAlreadyMinted)
   *     as the authoritative backstop.
   *
   * Phase 1: metadata_blob_id is always b"" (empty bytes). Batch 4 backfills
   * real Walrus BlobIds.
   *
   * Returns { alreadyMinted: true } without a chain call if the Postgres
   * mirror already has the badge — the common case when milestones trigger
   * badges that were previously awarded.
   */
  async mint(params: MintBadgeParams): Promise<MintBadgeResult> {
    const {
      userId,
      walletAddress,
      category,
      badgeType,
      seriesKey,
      tier,
      seriesDbId,
    } = params;

    const existing = await this.prisma.badgeEarned.findFirst({
      where: {
        userId,
        category,
        badgeType,
        seriesId: seriesDbId ?? null,
      },
    });

    if (existing) {
      this.logger.debug(
        `Badge already minted: userId=${userId} cat=${category} type=${badgeType}`,
      );
      return {
        suiObjectId: existing.suiObjectId,
        txDigest: '',
        alreadyMinted: true,
      };
    }

    // ── 2. On-chain mint ─────────────────────────────────────────────────────
    this.logger.log(
      `Minting badge: userId=${userId} cat=${category} type=${badgeType} series="${seriesKey}"`,
    );

    const tx = new Transaction();
    tx.moveCall({
      target: `${this.sui.packageId}::badges::mint`,
      arguments: [
        tx.object(this.sui.adminCapId),
        tx.object(this.sui.badgeRegistryId),
        tx.pure.address(walletAddress),
        tx.pure.u8(category),
        tx.pure.u8(badgeType),
        tx.pure.string(seriesKey),
        tx.pure.u8(tier),
        // Phase 1: empty bytes. Batch 4 uploads badge art to Walrus first.
        tx.pure.vector('u8', []),
      ],
    });

    const result = await this.gas.executeAsAdmin(tx);
    const txDigest = result.Transaction!.digest;
    const suiObjectId = this.findCreatedBadge(result);

    // ── 3. Postgres mirror ───────────────────────────────────────────────────
    await this.prisma.badgeEarned.create({
      data: {
        userId,
        suiObjectId,
        category,
        badgeType,
        seriesId: seriesDbId ?? null,
        tier,
        metadataBlobId: '', // Phase 1 placeholder; backfilled in Batch 4
      },
    });

    this.logger.log(`Badge minted: objectId=${suiObjectId} tx=${txDigest}`);

    return { suiObjectId, txDigest, alreadyMinted: false };
  }

  /** List all badges earned by a user, from the Postgres mirror. */
  async getMyBadges(userId: string): Promise<BadgeDto[]> {
    const badges = await this.prisma.badgeEarned.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
    });

    return badges.map((b) => ({
      id: b.id,
      suiObjectId: b.suiObjectId,
      category: b.category,
      badgeType: b.badgeType,
      seriesId: b.seriesId,
      tier: b.tier,
      metadataBlobId: b.metadataBlobId,
      awardedAt: b.awardedAt,
    }));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Extracts the ArktionBadge object ID from a successful mint transaction.
   * Mirrors the findCreated pattern in bootstrap.service.ts.
   */
  private findCreatedBadge(result: AdminTxResult): string {
    const tx = result.Transaction!;
    const objectTypes = tx.objectTypes ?? {};

    const objectId = tx.effects.changedObjects
      .filter((c) => c.idOperation === 'Created')
      .map((c) => c.objectId)
      .find((id) => objectTypes[id]?.endsWith('::badges::ArktionBadge'));

    if (!objectId) {
      this.logger.error('Badge mint PTB did not produce an ArktionBadge', {
        result,
      });
      throw new Error(
        'Badge mint failed: ArktionBadge not found in transaction result',
      );
    }
    return objectId;
  }
}
