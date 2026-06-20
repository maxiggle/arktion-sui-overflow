import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SubmitSendDto {
  @IsUUID()
  sendTransactionId!: string;

  @IsString()
  @IsNotEmpty()
  txBytes!: string;

  @IsString()
  @IsNotEmpty()
  userSignature!: string;
}
