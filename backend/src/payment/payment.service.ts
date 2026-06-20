import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Transaction } from '@mysten/sui/transactions';
import type { SuiClientTypes } from '@mysten/sui/client';

import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';

/** Minimum tip: 0.01 USDC (10_000 micro-USDC). Prevents dust transactions. */
const MIN_TIP_USDC = 10_000n;

/** Prisma raises P2002 when a unique constraint (here, idempotency_key) is violated. */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

/** TipTransaction.status values. */
export const TipStatus = {
  PENDING: 0,
  CONFIRMED: 1,
  FAILED: 2,
} as const;

export interface BuildTipResult {
  tipTransactionId: string;
  txBytes: string;
}

export interface ConfirmTipResult {
  txDigest: string;
}

type TipTxResult = SuiClientTypes.TransactionResult<{
  effects: true;
  events: true;
  objectTypes: true;
}>;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sui: SuiService,
  ) {}

  async buildTipTransaction(params: {
    senderId: string;
    seriesId: string;
    amountUsdc: bigint;
    idempotencyKey: string;
  }): Promise<BuildTipResult> {
    const { senderId, seriesId, amountUsdc, idempotencyKey } = params;

    if (amountUsdc < MIN_TIP_USDC) {
      throw new BadRequestException(
        `Minimum tip is ${MIN_TIP_USDC} micro-USDC (0.01 USDC).`,
      );
    }

    // Idempotent retry: a repeated key may only rebuild a still-pending tip
    // with identical parameters. Anything else is a client error.
    const existing = await this.prisma.tipTransaction.findUnique({
      where: { idempotencyKey },
      select: {
        id: true,
        senderId: true,
        seriesId: true,
        amountUsdc: true,
        status: true,
      },
    });
    if (existing) {
      const sameParams =
        existing.senderId === senderId &&
        existing.seriesId === seriesId &&
        existing.amountUsdc === amountUsdc;
      if (!sameParams) {
        throw new ConflictException(
          'Idempotency key already used with different tip parameters.',
        );
      }
      if (existing.status !== TipStatus.PENDING) {
        throw new ConflictException(
          'A tip with this idempotency key has already been processed.',
        );
      }
    }

    const [sender, series] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: senderId },
        select: { walletAddress: true },
      }),
      this.prisma.series.findUnique({
        where: { id: seriesId },
        select: {
          id: true,
          title: true,
          creatorId: true,
          creator: { select: { id: true, walletAddress: true } },
        },
      }),
    ]);

    if (!sender) throw new NotFoundException('Sender not found');
    if (!series) throw new NotFoundException('Series not found');
    if (!series.creator || !series.creatorId) {
      throw new BadRequestException(
        'This series has no registered creator to receive tips.',
      );
    }
    if (series.creatorId === senderId) {
      throw new BadRequestException('Cannot tip your own series.');
    }

    const { balance: usdcBalance } = await this.sui.client.getBalance({
      owner: sender.walletAddress,
      coinType: this.sui.usdcCoinType,
    });
    const totalBalance = BigInt(usdcBalance.balance);

    if (totalBalance < amountUsdc) {
      throw new BadRequestException(
        `Insufficient USDC balance. Have ${totalBalance} micro-USDC, need ${amountUsdc}.`,
      );
    }

    const tx = new Transaction();
    tx.setSender(sender.walletAddress);

    tx.moveCall({
      target: '0x2::balance::send_funds',
      typeArguments: [this.sui.usdcCoinType],
      arguments: [
        tx.balance({ type: this.sui.usdcCoinType, balance: amountUsdc }),
        tx.pure.address(series.creator.walletAddress),
      ],
    });

    const bytes = await tx.build({ client: this.sui.client });
    const txBytes = Buffer.from(bytes).toString('base64');

    // Pending retry — reuse the original row, return freshly built bytes.
    if (existing) {
      return { tipTransactionId: existing.id, txBytes };
    }

    let tipTx: { id: string };
    try {
      tipTx = await this.prisma.tipTransaction.create({
        data: {
          senderId,
          receiverId: series.creator.id,
          seriesId,
          amountUsdc,
          idempotencyKey,
          status: TipStatus.PENDING,
        },
        select: { id: true },
      });
    } catch (err) {
      // A concurrent request with the same key won the unique constraint —
      // return that row instead of failing the retry.
      if (isUniqueConstraintError(err)) {
        const raced = await this.prisma.tipTransaction.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        });
        if (raced) return { tipTransactionId: raced.id, txBytes };
      }
      throw err;
    }

    this.logger.log(
      `Tip built (gasless): sender=${senderId} series=${seriesId} ` +
        `amount=${amountUsdc} tip=${tipTx.id}`,
    );

    return { tipTransactionId: tipTx.id, txBytes };
  }

  /**
   * Submit the user-signed gasless tip transaction.
   *
   * Single signature only — no gas-sponsor co-signature required.
   */
  async confirmTip(params: {
    senderId: string;
    tipTransactionId: string;
    txBytes: string;
    userSignature: string;
  }): Promise<ConfirmTipResult> {
    const { senderId, tipTransactionId, txBytes, userSignature } = params;

    const tipTx = await this.prisma.tipTransaction.findUnique({
      where: { id: tipTransactionId },
    });

    if (!tipTx) throw new NotFoundException('Tip transaction not found');
    if (tipTx.senderId !== senderId) {
      throw new BadRequestException(
        'Tip transaction does not belong to sender',
      );
    }
    if (tipTx.status !== TipStatus.PENDING) {
      throw new UnprocessableEntityException(
        `Tip is already ${tipTx.status === TipStatus.CONFIRMED ? 'confirmed' : 'failed'}.`,
      );
    }

    let txDigest: string;
    try {
      const result: TipTxResult = await this.sui.client.executeTransaction({
        transaction: Uint8Array.from(Buffer.from(txBytes, 'base64')),
        signatures: [userSignature],
        include: { effects: true, events: true, objectTypes: true },
      });

      if (result.$kind === 'FailedTransaction') {
        const status = result.FailedTransaction.status;
        const msg = !status.success ? status.error.message : 'unknown';
        throw new Error(`On-chain execution failed: ${msg}`);
      }

      txDigest = result.Transaction.digest;
    } catch (err) {
      await this.prisma.tipTransaction.update({
        where: { id: tipTransactionId },
        data: { status: TipStatus.FAILED },
      });

      if (err instanceof UnprocessableEntityException) throw err;

      const raw = err instanceof Error ? err.message : String(err);
      const msg = decodeURIComponent(raw);
      if (
        msg.includes('Groth16') ||
        msg.includes('user signature') ||
        msg.includes('Signature is not valid')
      ) {
        throw new UnprocessableEntityException(
          'zkLogin signature invalid — sign out and sign back in to refresh your session.',
        );
      }
      throw new UnprocessableEntityException(`Transaction failed: ${msg}`);
    }

    const confirmedAt = new Date();
    const { amountUsdc, receiverId } = tipTx;

    await this.prisma.$transaction([
      this.prisma.tipTransaction.update({
        where: { id: tipTransactionId },
        data: {
          status: TipStatus.CONFIRMED,
          suiTxDigest: txDigest,
          confirmedAt,
        },
      }),
      this.prisma.userUsdcBalance.upsert({
        where: { userId: senderId },
        create: { userId: senderId, balance: 0n, lastSyncedAt: confirmedAt },
        update: {
          balance: { decrement: amountUsdc },
          lastSyncedAt: confirmedAt,
        },
      }),
      this.prisma.userUsdcBalance.upsert({
        where: { userId: receiverId },
        create: {
          userId: receiverId,
          balance: amountUsdc,
          lastSyncedAt: confirmedAt,
        },
        update: {
          balance: { increment: amountUsdc },
          lastSyncedAt: confirmedAt,
        },
      }),
    ]);

    this.logger.log(
      `Tip confirmed: id=${tipTransactionId} digest=${txDigest} ` +
        `amount=${amountUsdc} sender=${senderId} receiver=${receiverId}`,
    );

    return { txDigest };
  }

  /** Live USDC balance for a user, read directly from the chain. */
  async getUsdcBalance(
    userId: string,
  ): Promise<{ balance: string; usdcCoinType: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const { balance } = await this.sui.client.getBalance({
      owner: user.walletAddress,
      coinType: this.sui.usdcCoinType,
    });

    return { balance: balance.balance, usdcCoinType: this.sui.usdcCoinType };
  }

  /**
   * Build a gasless USDC transfer to any Sui address.
   * The caller must sign the returned txBytes with their zkLogin key and
   * POST the signature to POST /payment/send/submit.
   */
  async buildSendTransaction(params: {
    senderId: string;
    recipientAddress: string;
    amountUsdc: bigint;
  }): Promise<{ txBytes: string }> {
    const { senderId, recipientAddress, amountUsdc } = params;

    if (amountUsdc < MIN_TIP_USDC) {
      throw new BadRequestException(
        `Minimum send is ${MIN_TIP_USDC} micro-USDC (0.01 USDC).`,
      );
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { walletAddress: true },
    });
    if (!sender) throw new NotFoundException('User not found');

    const { balance: usdcBalance } = await this.sui.client.getBalance({
      owner: sender.walletAddress,
      coinType: this.sui.usdcCoinType,
    });

    if (BigInt(usdcBalance.balance) < amountUsdc) {
      throw new BadRequestException(
        `Insufficient USDC. Have ${usdcBalance.balance} micro-USDC, need ${amountUsdc}.`,
      );
    }

    const tx = new Transaction();
    tx.setSender(sender.walletAddress);

    tx.moveCall({
      target: '0x2::balance::send_funds',
      typeArguments: [this.sui.usdcCoinType],
      arguments: [
        tx.balance({ type: this.sui.usdcCoinType, balance: amountUsdc }),
        tx.pure.address(recipientAddress),
      ],
    });

    const bytes = await tx.build({ client: this.sui.client });
    return { txBytes: Buffer.from(bytes).toString('base64') };
  }

  /** Submit a user-signed gasless USDC send transaction. */
  async submitSend(params: {
    txBytes: string;
    userSignature: string;
  }): Promise<{ txDigest: string }> {
    this.logger.log('submitSend called', {
      txBytesLength: params.txBytes.length,
      signatureLength: params.userSignature.length,
      signaturePrefix: params.userSignature.slice(0, 6),
    });

    let result: TipTxResult;
    try {
      result = await this.sui.client.executeTransaction({
        transaction: Uint8Array.from(Buffer.from(params.txBytes, 'base64')),
        signatures: [params.userSignature],
        include: { effects: true, events: true, objectTypes: true },
      });
    } catch (err) {
      // RpcError shape: { message, code, meta }
      const rpcCode = err?.code ?? 'n/a';
      const rpcMeta = err?.meta ?? {};
      const rawMsg = err instanceof Error ? err.message : String(err);
      this.logger.error('submitSend gRPC error', {
        rpcCode,
        rpcMeta,
        rawMessage: rawMsg,
        decodedMessage: decodeURIComponent(rawMsg),
        signatureLength: params.userSignature.length,
        // first 6 chars of a zkLogin sig in base64 should be "BQNNM…" (0x05 flag)
        signaturePrefix: params.userSignature.slice(0, 12),
        txBytesLength: params.txBytes.length,
      });
      const raw = err instanceof Error ? err.message : String(err);
      const msg = decodeURIComponent(raw);
      if (
        msg.includes('Groth16') ||
        msg.includes('user signature') ||
        msg.includes('Signature is not valid')
      ) {
        throw new UnprocessableEntityException(
          'zkLogin signature invalid — sign out and sign back in to refresh your session.',
        );
      }
      throw new UnprocessableEntityException(`Transaction failed: ${msg}`);
    }

    if (result.$kind === 'FailedTransaction') {
      const status = result.FailedTransaction.status;
      const msg = !status.success ? status.error.message : 'unknown';
      throw new UnprocessableEntityException(
        `On-chain execution failed: ${msg}`,
      );
    }

    this.logger.log(`Send confirmed: digest=${result.Transaction.digest}`);
    return { txDigest: result.Transaction.digest };
  }

  /** Paginated tip history for a user (sent or received). */
  async getTipHistory(
    userId: string,
    direction: 'sent' | 'received',
    page: number,
    limit: number,
  ) {
    const where =
      direction === 'sent' ? { senderId: userId } : { receiverId: userId };
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      this.prisma.tipTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          amountUsdc: true,
          status: true,
          suiTxDigest: true,
          confirmedAt: true,
          createdAt: true,
          series: { select: { id: true, title: true } },
          sender: { select: { id: true, displayName: true, avatarUrl: true } },
          receiver: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.tipTransaction.count({ where }),
    ]);

    return {
      data: tips.map((t) => ({
        ...t,
        amountUsdc: t.amountUsdc.toString(),
      })),
      total,
      page,
      limit,
    };
  }
}
