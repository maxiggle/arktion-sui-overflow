import { Injectable, NotFoundException } from '@nestjs/common';
import type { SuiClientTypes } from '@mysten/sui/client';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';

type OnChainPassport = SuiClientTypes.GetObjectResponse<{ json: true }>;

@Injectable()
export class PassportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
  ) {}

  /**
   * Returns the user's passport as it appears in Postgres. This is the fast
   * path — Postgres mirrors the on-chain state and is updated every time we
   * mutate the chain. A weekly cron (Batch 4) reconciles any drift.
   */
  async findByUserId(userId: string) {
    const passport = await this.prisma.passport.findUnique({
      where: { userId },
    });
    if (!passport) {
      throw new NotFoundException('Passport not found');
    }
    return {
      objectId: passport.suiObjectId,
      level: passport.level,
      totalInkEarned: passport.totalInkEarned.toString(),
      chaptersRead: passport.chaptersRead,
      seriesCompleted: passport.seriesCompleted,
      seriesTracked: passport.seriesTracked,
      identityBlobId: passport.identityBlobId,
      lastSyncedAt: passport.lastSyncedAt,
      explorerUrl: this.buildExplorerUrl(passport.suiObjectId),
    };
  }

  /**
   * Fresh read from chain. Slower (~200ms) but authoritative. Use when the
   * caller explicitly needs the latest on-chain state (e.g. right after a
   * mutation).
   */
  async findOnChainByObjectId(objectId: string): Promise<OnChainPassport> {
    try {
      return await this.sui.client.getObject({
        objectId,
        include: { json: true },
      });
    } catch {
      throw new NotFoundException('Passport object not found on chain');
    }
  }

  private buildExplorerUrl(objectId: string): string {
    const network = process.env.SUI_NETWORK ?? 'testnet';
    return `https://suiscan.xyz/${network}/object/${objectId}`;
  }
}
