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
  NODE_ENV: Environment;

  @IsInt()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsEnum(SuiNetwork)
  @IsOptional()
  SUI_NETWORK: SuiNetwork = SuiNetwork.Testnet;

  @IsString()
  @IsOptional()
  SUI_RPC_URL: string;

  @IsString()
  SUI_HOT_WALLET_PRIVATE_KEY: string;

  @IsString()
  SUI_PACKAGE_ID: string;

  @IsString()
  SUI_ADMIN_REGISTRY_ID: string;

  @IsString()
  SUI_EARNING_REGISTRY_ID: string;

  @IsString()
  SUI_ADMIN_CAP_ID: string;

  @IsString()
  SUI_INK_TREASURY_CAP_ID: string;

  @IsString()
  @IsOptional()
  ZKLOGIN_PROVER_URL: string = 'https://prover-dev.mystenlabs.com/v1';

  @IsString()
  @IsOptional()
  WALRUS_PUBLISHER_URL: string =
    'https://publisher.walrus-testnet.walrus.space';
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
