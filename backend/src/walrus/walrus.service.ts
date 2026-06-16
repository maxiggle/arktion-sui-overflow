import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrus } from '@mysten/walrus';
import { SuiService } from '../sui/sui.service';

@Injectable()
export class WalrusService {
  private readonly logger = new Logger(WalrusService.name);
  private readonly relayUrl: string;
  private readonly aggregatorUrl: string;

  constructor(
    private readonly sui: SuiService,
    private readonly config: ConfigService,
  ) {
    this.relayUrl = this.config.getOrThrow<string>('WALRUS_UPLOAD_RELAY_URL');
    this.aggregatorUrl = this.config.getOrThrow<string>(
      'WALRUS_AGGREGATOR_URL',
    );
  }

  /**
   * Build a fresh WalrusClient for each call.
   *
   * sendTip transfers an owned SUI coin as part of the upload transaction.
   * After that coin is consumed, its on-chain version advances. A singleton
   * client caches the old version and every subsequent upload fails with
   * "Transaction needs to be rebuilt / unavailable for consumption".
   * Creating a new SuiGrpcClient per call is cheap (no network I/O in the
   * constructor) and guarantees the SDK fetches the current coin version.
   */
  private buildClient() {
    return new SuiGrpcClient({
      network: 'testnet',
      baseUrl: 'https://fullnode.testnet.sui.io:443',
    }).$extend(
      walrus({
        uploadRelay: {
          host: this.relayUrl,
          sendTip: { max: 10_000_000 },
        },
      }),
    ).walrus;
  }

  async uploadBlob(buffer: Buffer): Promise<{ blobId: string; url: string }> {
    const epochs = this.config.get<number>('WALRUS_DEFAULT_EPOCHS') ?? 5;
    const blob = new Uint8Array(buffer);

    // Fresh client each attempt so the SDK always reads current object state.
    const MAX_ATTEMPTS = 3;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const client = this.buildClient();
        const { blobId } = await client.writeBlob({
          blob,
          deletable: false,
          epochs,
          signer: this.sui.adminKeypair,
        });
        return { blobId, url: this.getBlobUrl(blobId) };
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS && isStaleObjectError(err)) {
          const delay = 500 * attempt;
          this.logger.warn(
            `Walrus upload attempt ${attempt} failed (stale object), retrying in ${delay}ms…`,
          );
          await sleep(delay);
          continue;
        }
        throw err;
      }
    }

    throw lastErr;
  }

  /**
   * Read a blob directly from Walrus storage nodes via the SDK.
   *
   * For public content prefer serving the aggregator URL — it is a single
   * HTTP GET vs. the ~335 node requests the SDK makes here.
   */
  async readBlob(blobId: string): Promise<Uint8Array> {
    return this.buildClient().readBlob({ blobId });
  }

  /**
   * Check whether a blob is still live on Walrus by probing the aggregator.
   * Returns false when the blob has expired or was never uploaded.
   * Does NOT use the SDK — a HEAD request to the aggregator is sufficient
   * and far cheaper than a full SDK read.
   */
  async blobExists(blobId: string): Promise<boolean> {
    const url = this.getBlobUrl(blobId);
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  getBlobUrl(blobId: string): string {
    return `${this.aggregatorUrl}/v1/blobs/${blobId}`;
  }
}

function isStaleObjectError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return (
    msg.includes('Transaction needs to be rebuilt') ||
    msg.includes('unavailable for consumption') ||
    msg.includes('object version mismatch')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
