import { IsNumber, IsPositive, IsString } from 'class-validator';

export class GetProofDto {
  @IsString()
  jwt: string;

  @IsString()
  ephemeralPublicKey: string;

  @IsNumber()
  @IsPositive()
  maxEpoch: number;

  @IsString()
  randomness: string;
}
