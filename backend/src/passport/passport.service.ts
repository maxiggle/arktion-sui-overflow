import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SuiClientTypes } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';
import { GasService } from '../sui/gas.service';
import { WalrusService } from '../sui/walrus.service';

/**
 * BCS layout of the message the admin signs — MUST byte-match the Move
 * `StatsAttestation` struct in passport.move (field order is the wire contract).
 *   passport_id (32 raw bytes) | chapters_read | series_completed |
 *   series_tracked | total_ink_earned   (each u64, little-endian)
 */
const StatsAttestation = bcs.struct('StatsAttestation', {
  passport_id: bcs.Address,
  chapters_read: bcs.u64(),
  series_completed: bcs.u64(),
  series_tracked: bcs.u64(),
  total_ink_earned: bcs.u64(),
});

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
    private readonly gas: GasService,
    private readonly walrus: WalrusService,
  ) {}

  /**
   * Build the gasless, user-signed transaction that pushes the user's current
   * Postgres stats onto their on-chain passport.
   *
   * The admin signs the stat payload (Ed25519) so the values are trustworthy;
   * the user signs the transaction (they own the passport); the gas sponsor
   * covers gas. Returns base64 tx bytes for the frontend to sign with zkLogin
   * and POST back to /passport/sync/submit.
   */
  async buildSyncTransaction(
    userId: string,
    walletAddress: string,
  ): Promise<{ txBytes: string }> {
    const passport = await this.prisma.passport.findUnique({
      where: { userId },
    });
    if (!passport) throw new NotFoundException('Passport not found');

    // Admin attestation over the exact totals being written.
    const message = StatsAttestation.serialize({
      passport_id: passport.suiObjectId,
      chapters_read: passport.chaptersRead,
      series_completed: passport.seriesCompleted,
      series_tracked: passport.seriesTracked,
      total_ink_earned: passport.totalInkEarned,
    }).toBytes();
    const signature = await this.sui.adminKeypair.sign(message);

    const tx = new Transaction();
    tx.moveCall({
      target: `${this.sui.packageId}::passport::update_stats_attested`,
      arguments: [
        tx.object(this.sui.passportConfigId),
        tx.object(passport.suiObjectId),
        tx.pure.u64(passport.chaptersRead),
        tx.pure.u64(passport.seriesCompleted),
        tx.pure.u64(passport.seriesTracked),
        tx.pure.u64(passport.totalInkEarned),
        tx.pure.vector('u8', Array.from(signature)),
      ],
    });

    return this.gas.buildSponsoredBytes(tx, walletAddress);
  }

  /**
   * Submit the user-signed sync transaction. The gas sponsor co-signs and
   * executes; on success the Postgres `lastSyncedAt` is bumped.
   */
  async submitSyncTransaction(
    userId: string,
    txBytes: string,
    userSignature: string,
  ): Promise<{ txDigest: string }> {
    const result = await this.gas.submitSponsoredTx(txBytes, userSignature);
    const txDigest = result.Transaction!.digest;

    await this.prisma.passport.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(
      `Passport synced on-chain: userId=${userId} digest=${txDigest}`,
    );
    return { txDigest };
  }

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
  async findByUserId(
    userId: string,
    walletAddress = '',
    apiBase = process.env.API_BASE_URL ?? 'http://localhost:3000/api/v1',
  ) {
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
