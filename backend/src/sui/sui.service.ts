import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

/**
 * Single point of contact with the Sui chain. Every other module that needs
 * to read state or build transactions injects this and uses `.client`.
 *
 * The admin and gas-sponsor keypairs are loaded once at startup. For Phase 1,
 * both env vars point at the same keypair (the wallet that deployed the
 * contracts and holds the AdminCap). They are exposed separately so we can
 * split them at mainnet without refactoring callers.
 */
@Injectable()
export class SuiService implements OnModuleInit {
  private readonly logger = new Logger(SuiService.name);

  readonly client: SuiGrpcClient;
  readonly adminKeypair: Ed25519Keypair;
  readonly gasKeypair: Ed25519Keypair;

  readonly packageId: string;
  readonly adminCapId: string;
  readonly adminRegistryId: string;
  readonly inkTreasuryCapId: string;
  readonly earningRegistryId: string;
  readonly badgeRegistryId: string;

  constructor(private readonly config: ConfigService) {
    this.client = new SuiGrpcClient({
      network: 'testnet',
      baseUrl: 'https://fullnode.testnet.sui.io:443',
    });

    this.adminKeypair = this.loadKeypair('ADMIN_SECRET_KEY');
    this.gasKeypair = this.loadKeypair('GAS_SPONSOR_SECRET_KEY');

    this.packageId = this.requireConfig('SUI_PACKAGE_ID');
    this.adminCapId = this.requireConfig('SUI_ADMIN_CAP_ID');
    this.adminRegistryId = this.requireConfig('SUI_ADMIN_REGISTRY_ID');
    this.inkTreasuryCapId = this.requireConfig('SUI_INK_TREASURY_CAP_ID');
    this.earningRegistryId = this.requireConfig('SUI_EARNING_REGISTRY_ID');
    this.badgeRegistryId = this.requireConfig('SUI_BADGE_REGISTRY_ID');
  }

  async onModuleInit(): Promise<void> {
    const adminAddress = this.adminKeypair.toSuiAddress();
    const gasAddress = this.gasKeypair.toSuiAddress();

    try {
      const val = await this.client.getReferenceGasPrice();
      this.logger.log(`Connected to Sui at gas price ${val.referenceGasPrice}`);
      this.logger.log(`Admin address:  ${adminAddress}`);
      this.logger.log(`Gas sponsor:    ${gasAddress}`);
    } catch (err) {
      this.logger.error('Failed to reach Sui fullnode', err);
      throw err;
    }
  }

  /**
   * Convenience: address of the admin keypair. Equivalent to
   * `adminKeypair.toSuiAddress()` but cached lookup.
   */
  get adminAddress(): string {
    return this.adminKeypair.toSuiAddress();
  }

  get gasAddress(): string {
    return this.gasKeypair.toSuiAddress();
  }

  private loadKeypair(envKey: string): Ed25519Keypair {
    const raw = this.requireConfig(envKey);
    try {
      const { scheme, secretKey } = decodeSuiPrivateKey(raw);
      if (scheme !== 'ED25519') {
        throw new Error(
          `${envKey} must be an Ed25519 key, got ${scheme}. Regenerate with: sui keytool generate ed25519`,
        );
      }
      return Ed25519Keypair.fromSecretKey(secretKey);
    } catch (err) {
      throw new Error(
        `Failed to decode ${envKey}: ${(err as Error).message}. ` +
          `Expected bech32 format (suiprivkey1...). Export with: sui keytool export <address>`,
      );
    }
  }

  private requireConfig(key: string): string {
    const v = this.config.get<string>(key);
    if (!v) {
      throw new Error(`Missing required env: ${key}`);
    }
    return v;
  }
}
