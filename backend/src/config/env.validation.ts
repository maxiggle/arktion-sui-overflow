import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum SuiNetwork {
  Mainnet = 'mainnet',
  Testnet = 'testnet',
  Devnet = 'devnet',
  Localnet = 'localnet',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV!: Environment;

  @IsInt()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  GOOGLE_CLIENT_ID!: string;

  @IsString()
  @IsOptional()
  ZKLOGIN_PROVER_URL: string = 'https://prover-dev.mystenlabs.com/v1';

  @IsEnum(SuiNetwork)
  @IsOptional()
  SUI_NETWORK: SuiNetwork = SuiNetwork.Testnet;

  @IsString()
  @IsOptional()
  SUI_RPC_URL: string = 'https://fullnode.testnet.sui.io:443';

  /**
   * Bech32-encoded Ed25519 private key (suiprivkey1...) for the admin wallet.
   * Holds AdminCap and signs all minting transactions. For Phase 1 this
   * doubles as the gas sponsor — split at mainnet.
   */
  @IsString()
  ADMIN_SECRET_KEY!: string;

  /**
   * Bech32-encoded Ed25519 private key for the gas sponsor wallet.
   * Set to the same value as ADMIN_SECRET_KEY for Phase 1.
   */
  @IsString()
  GAS_SPONSOR_SECRET_KEY!: string;

  @IsString()
  SUI_PACKAGE_ID!: string;

  @IsString()
  SUI_ADMIN_CAP_ID!: string;

  @IsString()
  SUI_ADMIN_REGISTRY_ID!: string;

  @IsString()
  SUI_INK_TREASURY_CAP_ID!: string;

  @IsString()
  SUI_EARNING_REGISTRY_ID!: string;

  @IsString()
  SUI_BADGE_REGISTRY_ID!: string;

  /**
   * Full Sui coin type for USDC, e.g.:
   * 0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063aba4::usdc::USDC
   * Differs between testnet and mainnet.
   */
  @IsString()
  SUI_USDC_COIN_TYPE!: string;

  @IsInt()
  @IsOptional()
  GAS_TREASURY_MIN_BALANCE: number = 10_000_000_000; // 10 SUI in MIST

  @IsString()
  @IsOptional()
  WALRUS_PUBLISHER_URL: string =
    'https://publisher.walrus-testnet.walrus.space';

  @IsString()
  @IsOptional()
  WALRUS_AGGREGATOR_URL: string =
    'https://aggregator.walrus-testnet.walrus.space';

  // ─── Admin Auth ─────────────────────────────────────────────────────────────

  /**
   * Secret for signing admin JWTs (access + refresh + pre-auth tokens).
   * Must be at least 32 chars. Keep separate from user JWT_SECRET.
   */
  @IsString()
  ADMIN_JWT_SECRET!: string;

  /**
   * Issuer name shown in authenticator apps (e.g. "Arktion Admin").
   */
  @IsString()
  @IsOptional()
  TOTP_ISSUER: string = 'Arktion Admin';

  /**
   * AES-256-GCM key for encrypting TOTP secrets at rest.
   * Must be exactly 64 hex characters (32 bytes).
   * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  @IsString()
  TOTP_ENCRYPTION_KEY!: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
