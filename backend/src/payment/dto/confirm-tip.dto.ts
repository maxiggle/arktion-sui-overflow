import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmTipDto {
  @IsString()
  @IsNotEmpty()
  tipTransactionId!: string;

  /** Base64-encoded transaction bytes originally returned by POST /payment/tip/build. */
  @IsString()
  @IsNotEmpty()
  txBytes!: string;

  /** Serialised ZkLoginSignature from the frontend (signWithZkLogin). */
  @IsString()
  @IsNotEmpty()
  userSignature!: string;
}
