import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class BuildTipDto {
  @IsString()
  @IsNotEmpty()
  seriesId!: string;

  /** Amount in micro-USDC (6 decimal places). Sent as a string to avoid JS number precision loss. */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, {
    message: 'amountUsdc must be a non-negative integer string',
  })
  amountUsdc!: string;

  /** Caller-supplied idempotency key. Recommended: `tip:{senderId}:{seriesId}:{nonce}` */
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
