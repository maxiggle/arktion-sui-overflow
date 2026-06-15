import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SuiClientTypes } from '@mysten/sui/client';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { WalrusService } from '../sui/walrus.service';

type OnChainPassport = SuiClientTypes.GetObjectResponse<{ json: true }>;

export interface SnapshotResult {
  blobId: string;
  walrusUrl: string;
  /** ISO timestamp of when this snapshot was taken. */
  snapshotAt: string;
  /** Number of reading records included in the snapshot. */
  recordCount: number;
  /**
   * True if the on-chain passport has been updated with the BlobId.
   * Phase 1: always false — on-chain anchoring requires user-signed PTBs
   * (Batch 4). The BlobId is stored in Postgres and returned to the client.
   */
  onChainAnchored: boolean;
}

@Injectable()
export class PassportService {
  private readonly logger = new Logger(PassportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
    private readonly walrus: WalrusService,
  ) {}

  /**
   * Look up a passport by the user's Sui wallet address.
   * Used by the public image endpoint — no auth required.
   * Returns null if not found (caller decides how to respond).
   */
  async findByWalletAddress(walletAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
      include: { passport: true },
    });
    return user?.passport ?? null;
  }

  /**
   * Returns the user's passport as it appears in Postgres. This is the fast
   * path — Postgres mirrors the on-chain state and is updated every time we
   * mutate the chain. A weekly cron (Batch 4) reconciles any drift.
   */
  async findByUserId(userId: string, walletAddress = '') {
    const passport = await this.prisma.passport.findUnique({
      where: { userId },
    });
    if (!passport) {
      throw new NotFoundException('Passport not found');
    }
    const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1';
    return {
      objectId: passport.suiObjectId,
      level: passport.level,
      totalInkEarned: passport.totalInkEarned.toString(),
      chaptersRead: passport.chaptersRead,
      seriesCompleted: passport.seriesCompleted,
      seriesTracked: passport.seriesTracked,
      identityBlobId: passport.identityBlobId,
      identityBlobUrl: passport.identityBlobId
        ? this.walrus.getUrl(passport.identityBlobId)
        : null,
      lastSyncedAt: passport.lastSyncedAt,
      explorerUrl: this.buildExplorerUrl(passport.suiObjectId),
      walletAddress,
      imageUrl: walletAddress
        ? `${apiBase}/passport/${walletAddress}/image.svg`
        : null,
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

  /**
   * Export the user's full reading history as a JSON blob on Walrus.
   *
   * The snapshot includes:
   *   - Passport stats at time of export
   *   - All reading records (seriesId, status, currentChapter, timestamps)
   *   - All journal entries (external series the user tracks off-platform)
   *
   * Phase 1: BlobId stored in Postgres only. On-chain anchoring via
   * `passport::set_blob_id` is deferred to Batch 4 (requires user-signed PTB
   * since the passport is owned by the user's wallet, not the admin).
   */
  async takeSnapshot(userId: string): Promise<SnapshotResult> {
    const passport = await this.prisma.passport.findUnique({
      where: { userId },
    });
    if (!passport) {
      throw new NotFoundException('Passport not found');
    }

    const [readingRecords, journalEntries] = await Promise.all([
      this.prisma.readingRecord.findMany({
        where: { userId },
        orderBy: { lastReadAt: 'desc' },
        select: {
          seriesId: true,
          status: true,
          currentChapter: true,
          lastReadAt: true,
          completedAt: true,
          createdAt: true,
          series: { select: { title: true } },
        },
      }),
      this.prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          externalTitle: true,
          formatType: true,
          externalUrl: true,
          totalChapters: true,
          currentChapter: true,
          notes: true,
          createdAt: true,
        },
      }),
    ]);

    const snapshotAt = new Date().toISOString();

    const payload = {
      version: 1,
      snapshotAt,
      passport: {
        suiObjectId: passport.suiObjectId,
        level: passport.level,
        totalInkEarned: passport.totalInkEarned.toString(),
        chaptersRead: passport.chaptersRead,
        seriesCompleted: passport.seriesCompleted,
        seriesTracked: passport.seriesTracked,
      },
      readingRecords: readingRecords.map((r) => ({
        seriesId: r.seriesId,
        seriesTitle: r.series.title,
        status: r.status,
        currentChapter: r.currentChapter,
        lastReadAt: r.lastReadAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      journalEntries: journalEntries.map((e) => ({
        externalTitle: e.externalTitle,
        formatType: e.formatType,
        externalUrl: e.externalUrl,
        totalChapters: e.totalChapters,
        currentChapter: e.currentChapter,
        notes: e.notes,
        createdAt: e.createdAt.toISOString(),
      })),
    };

    const json = JSON.stringify(payload, null, 2);

    this.logger.log(
      `Taking Walrus snapshot for userId=${userId}: ` +
        `${readingRecords.length} records, ${journalEntries.length} journal entries`,
    );

    const { blobId } = await this.walrus.upload(json);

    // Store in Postgres so the frontend can surface it immediately and
    // subsequent passport reads include the URL.
    await this.prisma.passport.update({
      where: { userId },
      data: { identityBlobId: blobId },
    });

    this.logger.log(
      `Walrus snapshot stored: userId=${userId} blobId=${blobId}`,
    );

    return {
      blobId,
      walrusUrl: this.walrus.getUrl(blobId),
      snapshotAt,
      recordCount: readingRecords.length,
      onChainAnchored: false,
    };
  }

  private buildExplorerUrl(objectId: string): string {
    const network = process.env.SUI_NETWORK ?? 'testnet';
    return `https://suiscan.xyz/${network}/object/${objectId}`;
  }
}
