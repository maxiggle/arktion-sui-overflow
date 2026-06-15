import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Transaction } from '@mysten/sui/transactions';
import type { SuiClientTypes } from '@mysten/sui/client';

import { SuiService } from './sui.service';

export type AdminTxResult = SuiClientTypes.TransactionResult<{
  effects: true;
  events: true;
  objectTypes: true;
}>;

/**
 * Wraps every chain mutation. Two responsibilities:
 *
 *   1. Pay gas on behalf of the user via the gas-sponsor keypair, so end users
 *      never need a SUI balance. For Phase 1, NestJS itself is also the
 *      transaction sender for most flows (admin-only operations like minting
 *      INK and badges), so the sponsor and sender are the same keypair.
 *
 *   2. Refuse new transactions when the gas treasury runs low, preventing
 *      cascading failures across every endpoint mid-demo.
 *
 * When user-signed transactions are added later (Week 5+), this service grows
 * a second method that signs as sponsor only and accepts a user signature.
 */
@Injectable()
export class GasService implements OnModuleInit {
  private readonly logger = new Logger(GasService.name);
  private readonly minTreasuryBalance: bigint;

  constructor(
    private readonly sui: SuiService,
    private readonly config: ConfigService,
  ) {
    this.minTreasuryBalance = BigInt(
      this.config.get<number>('GAS_TREASURY_MIN_BALANCE', 10_000_000_000),
    );
  }

  async onModuleInit(): Promise<void> {
    const balance = await this.getTreasuryBalance();
    const balanceInSui = Number(balance) / 1_000_000_000;
    this.logger.log(`Gas treasury balance: ${balanceInSui.toFixed(4)} SUI`);

    if (balance < this.minTreasuryBalance) {
      this.logger.warn(
        `Treasury is below threshold (${Number(this.minTreasuryBalance) / 1_000_000_000} SUI). ` +
          `Refill ${this.sui.gasAddress} before continuing.`,
      );
    }
  }

  /**
   * Sign and execute an admin-built transaction. NestJS holds the AdminCap,
   * so for Phase 1 the admin keypair is both sender and gas payer.
   *
   * Refuses if the gas treasury is below threshold — fail fast rather than
   * letting individual transactions fail with cryptic gas errors.
   */
  async executeAsAdmin(tx: Transaction): Promise<AdminTxResult> {
    await this.assertTreasuryHealthy();

    const result = await this.sui.client.signAndExecuteTransaction({
      signer: this.sui.adminKeypair,
      transaction: tx,
      include: { effects: true, events: true, objectTypes: true },
    });

    if (result.$kind === 'FailedTransaction') {
      const status = result.FailedTransaction.status;
      const errorMsg = !status.success ? status.error.message : 'unknown';
      this.logger.error(`Transaction failed: ${errorMsg}`, {
        digest: result.FailedTransaction.digest,
      });
      throw new Error(`On-chain execution failed: ${errorMsg}`);
    }

    return result;
  }

  /**
   * Build a transaction that the USER must sign (non-custodial flow).
   *
   * Used for USDC tips: the user's zkLogin wallet is the sender and signs
   * the actual coin transfer. The gas-sponsor keypair covers gas so the user
   * needs no SUI balance.
   *
   * Pattern per @mysten/sui/docs/transaction-building/sponsored-transactions.md:
   *   1. Build just the transaction kind (no gas, no sender).
   *   2. Wrap in a sponsored transaction via Transaction.fromKind().
   *   3. Set sender, gas owner, and explicit gas payment coins.
   *   4. Build final bytes that both parties sign.
   *
   * Flow across the stack:
   *   1. Backend calls this → returns base64 bytes to the frontend.
   *   2. Frontend signs bytes with ephemeral key + ZK proof (signWithZkLogin).
   *   3. Frontend POSTs { txBytes, userSignature } to the payment endpoint.
   *   4. Backend calls submitSponsoredTx → gas sponsor co-signs and executes.
   */
  async buildSponsoredBytes(
    tx: Transaction,
    senderAddress: string,
  ): Promise<{ txBytes: string }> {
    await this.assertTreasuryHealthy();

    // Step 1 — extract just the transaction kind, no gas or sender attached.
    const kindBytes = await tx.build({
      client: this.sui.client,
      onlyTransactionKind: true,
    });

    // Step 2 — wrap in a full transaction with sponsor as gas payer.
    const sponsored = Transaction.fromKind(kindBytes);
    sponsored.setSender(senderAddress);
    sponsored.setGasOwner(this.sui.gasAddress);

    // Step 3 — fetch gas coins from the sponsor wallet and set them explicitly.
    // listCoins returns the sponsor's SUI coins; we take the first (largest
    // after automatic merge by the SDK).
    // listCoins returns { objects: Coin[] } per SuiClientTypes.ListCoinsResponse
    const { objects: gasCoins } = await this.sui.client.listCoins({
      owner: this.sui.gasAddress,
    });
    if (gasCoins.length === 0) {
      throw new ServiceUnavailableException('Gas treasury has no SUI coins');
    }
    sponsored.setGasPayment(
      gasCoins.map((c) => ({
        objectId: c.objectId,
        version: c.version,
        digest: c.digest,
      })),
    );

    const bytes = await sponsored.build({ client: this.sui.client });
    return { txBytes: Buffer.from(bytes).toString('base64') };
  }

  /**
   * Co-sign with the gas keypair and execute a user-signed transaction.
   *
   * @param txBytes     Base64 transaction bytes (originally from buildSponsoredBytes).
   * @param userSig     Serialized ZkLoginSignature from the frontend.
   */
  async submitSponsoredTx(
    txBytes: string,
    userSig: string,
  ): Promise<AdminTxResult> {
    await this.assertTreasuryHealthy();

    const txBytesUint8 = Uint8Array.from(Buffer.from(txBytes, 'base64'));
    const sponsorSig = await this.sui.gasKeypair.signTransaction(txBytesUint8);

    const result = await this.sui.client.executeTransaction({
      transaction: txBytesUint8,
      signatures: [userSig, sponsorSig.signature],
      include: { effects: true, events: true, objectTypes: true },
    });

    if (result.$kind === 'FailedTransaction') {
      const status = result.FailedTransaction.status;
      const errorMsg = !status.success ? status.error.message : 'unknown';
      this.logger.error(`Sponsored transaction failed: ${errorMsg}`, {
        digest: result.FailedTransaction.digest,
      });
      throw new Error(`On-chain execution failed: ${errorMsg}`);
    }

    return result;
  }

  async getTreasuryBalance(): Promise<bigint> {
    const { balance } = await this.sui.client.getBalance({
      owner: this.sui.gasAddress,
    });
    return BigInt(balance.coinBalance);
  }

  private async assertTreasuryHealthy(): Promise<void> {
    const balance = await this.getTreasuryBalance();
    if (balance < this.minTreasuryBalance) {
      this.logger.error(
        `Treasury exhausted (${balance} MIST < ${this.minTreasuryBalance} MIST minimum). ` +
          `Refusing new transactions until refilled.`,
      );
      throw new ServiceUnavailableException(
        'Service temporarily unavailable. Please try again shortly.',
      );
    }
  }
}
