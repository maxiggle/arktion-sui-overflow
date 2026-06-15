import { IsString, Length } from 'class-validator';

export class AdminTotpSetupVerifyDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
