import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Walrus blob storage integration.
 *
 * Walrus is Sui's decentralised blob storage protocol. NestJS uploads data
 * off-chain and receives a cryptographic BlobId (32-byte Blake2b hash,
 * base64url-encoded). That BlobId is anchored in the relevant on-chain object
 * so the content is discoverable and verifiable on-chain.
 *
 * Phase 1 uses:
 *   - Reading history snapshots  → passport.identity_snapshot_blob_id
 *   - Badge metadata             → ArktionBadge.metadata_blob_id
 *
 * On-chain anchoring of the passport BlobId requires the user to sign the
 * transaction (they own the passport object). This is deferred to when
 * user-signed PTBs are available (Batch 4). For Phase 1 the BlobId is stored
 * in Postgres and returned to the client — the data is on Walrus and the
 * frontend can display the Walrus URL immediately.
 */
@Injectable()
export class WalrusService {
  private readonly logger = new Logger(WalrusService.name);
  private readonly publisherUrl: string;
  private readonly aggregatorUrl: string;

  /** Number of Walrus epochs to store the blob. One epoch ≈ 1 day on testnet. */
  private readonly EPOCHS = 5;

  constructor(private readonly config: ConfigService) {
    this.publisherUrl = this.config.get<string>(
      'WALRUS_PUBLISHER_URL',
      'https://publisher.walrus-testnet.walrus.space',
    );
    this.aggregatorUrl = this.config.get<string>(
      'WALRUS_AGGREGATOR_URL',
      'https://aggregator.walrus-testnet.walrus.space',
    );
  }

  /**
   * Upload arbitrary data to Walrus.
   *
   * Returns:
   *   - `blobId`      — base64url-encoded 32-byte BlobId (store in Postgres,
   *                     pass to the frontend as the Walrus reference)
   *   - `blobIdBytes` — raw 32 bytes as number[] (pass to Move contracts as
   *                     vector<u8> via bcs.vector(bcs.u8()).serialize())
   *   - `isNew`       — true if Walrus created a new blob, false if identical
   *                     content was already certified
   */
  async upload(
    data: Buffer | string,
  ): Promise<{ blobId: string; blobIdBytes: number[]; isNew: boolean }> {
    const body = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const url = `${this.publisherUrl}/v1/blobs?epochs=${this.EPOCHS}`;

    this.logger.debug(`Uploading ${body.byteLength} bytes to Walrus: ${url}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(body),
      });
    } catch (err: unknown) {
      const cause = err instanceof Error ? (err.cause ?? err) : err;
      const detail = cause instanceof Error ? cause.message : String(cause);
      this.logger.error(`Walrus publisher unreachable: ${url} — ${detail}`);
      throw new Error(
        `Walrus upload network error: cannot reach ${url}. Check WALRUS_PUBLISHER_URL and that the Walrus testnet is up. Detail: ${detail}`,
        { cause: err instanceof Error ? err : undefined },
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Walrus upload failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ''}`,
      );
    }

    const json = (await response.json()) as WalrusUploadResponse;

    let blobId: string;
    let isNew: boolean;

    if ('newlyCreated' in json && json.newlyCreated) {
      blobId = json.newlyCreated.blobObject.blobId;
      isNew = true;
    } else if ('alreadyCertified' in json && json.alreadyCertified) {
      blobId = json.alreadyCertified.blobId;
      isNew = false;
    } else {
      throw new Error(
        `Unexpected Walrus response shape: ${JSON.stringify(json)}`,
      );
    }

    const blobIdBytes = this.blobIdToBytes(blobId);

    this.logger.log(
      `Walrus upload complete: blobId=${blobId} isNew=${isNew} bytes=${body.byteLength}`,
    );

    return { blobId, blobIdBytes, isNew };
  }

  /**
   * Download a blob from Walrus by its BlobId.
   * Returns the raw response Buffer.
   */
  async download(blobId: string): Promise<Buffer> {
    const url = `${this.aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Walrus download failed: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Returns the public Walrus aggregator URL for a given BlobId.
   * Shareable with clients directly — no auth required.
   */
  getUrl(blobId: string): string {
    return `${this.aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`;
  }

  /**
   * Decode a base64url BlobId into a raw 32-byte number array suitable for
   * passing to Move contracts as vector<u8>.
   */
  blobIdToBytes(blobId: string): number[] {
    const base64 = blobId.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    const bytes = Buffer.from(padded, 'base64');
    if (bytes.length !== 32) {
      throw new Error(
        `Invalid Walrus BlobId: expected 32 bytes, got ${bytes.length}`,
      );
    }
    return Array.from(bytes);
  }
}

interface WalrusBlobObject {
  id: string;
  blobId: string;
  storedEpoch: number;
  certifiedEpoch?: number;
  size: number;
}

interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: WalrusBlobObject;
    resourceOperation: unknown;
    cost: number;
  };
  alreadyCertified?: {
    blobId: string;
    event: unknown;
    endEpoch: number;
  };
}
