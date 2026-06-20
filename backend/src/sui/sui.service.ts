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

  /** Sui addresses derived once from the keypairs at startup. */
  readonly adminAddress: string;
  readonly gasAddress: string;

  readonly packageId: string;
  readonly adminCapId: string;
  readonly adminRegistryId: string;
  readonly inkTreasuryCapId: string;
  readonly earningRegistryId: string;
  readonly badgeRegistryId: string;
  readonly usdcCoinType: string;
  readonly network: string;

  constructor(private readonly config: ConfigService) {
    this.network = this.config.get<string>('SUI_NETWORK', 'testnet');
    this.client = new SuiGrpcClient({
      network: this.network,
      baseUrl: this.config.get<string>(
        'SUI_RPC_URL',
        'https://fullnode.testnet.sui.io:443',
      ),
    });

    this.adminKeypair = this.loadKeypair('ADMIN_SECRET_KEY');
    this.gasKeypair = this.loadKeypair('GAS_SPONSOR_SECRET_KEY');
    this.adminAddress = this.adminKeypair.toSuiAddress();
    this.gasAddress = this.gasKeypair.toSuiAddress();

    this.packageId = this.config.getOrThrow<string>('SUI_PACKAGE_ID');
    this.adminCapId = this.config.getOrThrow<string>('SUI_ADMIN_CAP_ID');
    this.adminRegistryId =
      this.config.getOrThrow<string>('SUI_ADMIN_REGISTRY_ID');
    this.inkTreasuryCapId =
      this.config.getOrThrow<string>('SUI_INK_TREASURY_CAP_ID');
    this.earningRegistryId =
      this.config.getOrThrow<string>('SUI_EARNING_REGISTRY_ID');
    this.badgeRegistryId =
      this.config.getOrThrow<string>('SUI_BADGE_REGISTRY_ID');
    this.usdcCoinType = this.config.getOrThrow<string>('SUI_USDC_COIN_TYPE');
  }

  async onModuleInit(): Promise<void> {
    try {
      const val = await this.client.getReferenceGasPrice();
      this.logger.log(
        `Connected to Sui (${this.network}) at gas price ${val.referenceGasPrice}`,
      );
      this.logger.log(`Admin address:  ${this.adminAddress}`);
      this.logger.log(`Gas sponsor:    ${this.gasAddress}`);
    } catch (err) {
      this.logger.error('Failed to reach Sui fullnode', err);
      throw err;
    }
  }

  private loadKeypair(envKey: string): Ed25519Keypair {
    const raw = this.config.getOrThrow<string>(envKey);
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
}
