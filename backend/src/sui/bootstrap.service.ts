import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Transaction } from '@mysten/sui/transactions';
import { SuiTransactionBlockResponse } from '@mysten/sui/client';

import { SuiService } from './sui.service';
import { GasService } from './gas.service';

export interface BootstrapResult {
  passportObjectId: string;
  libraryObjectId: string;
  journalObjectId: string;
  digest: string;
}

/**
 * On-chain identity bootstrap. Called exactly once per user, the first time
 * they sign in with Google.
 *
 * Builds a single PTB that does three Move calls atomically:
 *   1. passport::mint           → creates the ArktionPassport
 *   2. reading_history::create_library → creates UserLibrary
 *   3. journal::create_journal  → creates UserJournal
 *
 * All three objects are transferred to the user's wallet address. Gas is paid
 * by the admin keypair (Phase 1 simplification).
 *
 * If the PTB fails, the whole thing rolls back. If it succeeds, we extract the
 * three new object IDs from `result.objectChanges` and return them so the
 * caller can persist them to Postgres.
 */
@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly sui: SuiService,
    private readonly gas: GasService,
  ) {}

  async execute(walletAddress: string): Promise<BootstrapResult> {
    this.logger.log(`Bootstrapping on-chain identity for ${walletAddress}`);

    const tx = new Transaction();

    // 1. Mint passport
    tx.moveCall({
      target: `${this.sui.packageId}::passport::mint`,
      arguments: [
        tx.object(this.sui.adminCapId),
        tx.pure.address(walletAddress),
      ],
    });

    // 2. Create reading library
    tx.moveCall({
      target: `${this.sui.packageId}::reading_history::create_library`,
      arguments: [
        tx.object(this.sui.adminCapId),
        tx.pure.address(walletAddress),
      ],
    });

    // 3. Create journal
    tx.moveCall({
      target: `${this.sui.packageId}::journal::create_journal`,
      arguments: [
        tx.object(this.sui.adminCapId),
        tx.pure.address(walletAddress),
      ],
    });

    const result = await this.gas.executeAsAdmin(tx);

    const passportObjectId = this.findCreated(
      result,
      '::passport::ArktionPassport',
    );
    const libraryObjectId = this.findCreated(
      result,
      '::reading_history::UserLibrary',
    );
    const journalObjectId = this.findCreated(result, '::journal::UserJournal');

    this.logger.log(
      `Bootstrap complete for ${walletAddress}: ` +
        `passport=${passportObjectId}, library=${libraryObjectId}, journal=${journalObjectId}`,
    );

    return {
      passportObjectId,
      libraryObjectId,
      journalObjectId,
      digest: result.digest,
    };
  }

  private findCreated(
    result: SuiTransactionBlockResponse,
    typeSuffix: string,
  ): string {
    const change = result.objectChanges?.find(
      (c) => c.type === 'created' && c.objectType.endsWith(typeSuffix),
    );
    if (!change || change.type !== 'created') {
      this.logger.error(`Bootstrap PTB did not create ${typeSuffix}`, {
        result,
      });
      throw new InternalServerErrorException(
        `Bootstrap failed: missing ${typeSuffix} in transaction result`,
      );
    }
    return change.objectId;
  }
}
