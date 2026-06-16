import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum SuiNetwork {
  Testnet = 'testnet',
  Mainnet = 'mainnet',
  Devnet = 'devnet',
  Localnet = 'localnet',
}

/**
 * The shape of process.env after validation. Every secret and config value
 * the app needs is declared here. Missing or malformed values cause the app
 * to refuse to start — fail-fast over fail-late.
 */
export class EnvVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  PORT: number = 3000;

  // Database
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  //Auth
  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID!: string;

  @IsEnum(SuiNetwork)
  SUI_NETWORK!: SuiNetwork;

  @IsString()
  @IsNotEmpty()
  SUI_PACKAGE_ID!: string;

  @IsString()
  @IsNotEmpty()
  SUI_ADMIN_CAP_ID!: string;

  @IsString()
  @IsNotEmpty()
  SUI_ADMIN_REGISTRY_ID!: string;

  @IsString()
  @IsNotEmpty()
  SUI_INK_TREASURY_CAP_ID!: string;

  @IsString()
  @IsNotEmpty()
  SUI_EARNING_REGISTRY_ID!: string;

  @IsString()
  @IsNotEmpty()
  SUI_BADGE_REGISTRY_ID!: string;

  @IsString()
  @IsNotEmpty()
  ADMIN_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  GAS_SPONSOR_SECRET_KEY!: string;

  @IsInt()
  @Min(0)
  GAS_TREASURY_MIN_BALANCE: number = 10_000_000_000; // 10 SUI in MIST

  @IsUrl({ require_tld: false })
  WALRUS_UPLOAD_RELAY_URL!: string;

  @IsUrl({ require_tld: false })
  WALRUS_AGGREGATOR_URL!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  WALRUS_DEFAULT_EPOCHS: number = 5;

  @IsString()
  @IsNotEmpty()
  SUI_USDC_COIN_TYPE!: string;
}

/**
 * Run by NestJS's ConfigModule at startup. Throws if any required env var is
 * missing or malformed, with a list of every problem.
 */
export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const validated = plainToInstance(EnvVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const formatted = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return validated;
}
