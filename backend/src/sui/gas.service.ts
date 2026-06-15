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
