import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BuildSendDto {
  /** 32-byte Sui address (0x + 64 hex chars). */
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message:
      'recipientAddress must be a valid Sui address (0x followed by 64 hex characters)',
  })
  recipientAddress!: string;

  /** Amount in micro-USDC (integer string — avoids JS float precision loss). */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, {
    message: 'amountUsdc must be a non-negative integer string',
  })
  amountUsdc!: string;
}
