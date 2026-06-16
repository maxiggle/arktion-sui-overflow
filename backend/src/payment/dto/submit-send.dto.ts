import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitSendDto {
  @IsString()
  @IsNotEmpty()
  txBytes!: string;

  @IsString()
  @IsNotEmpty()
  userSignature!: string;
}
