import { IsNotEmpty, IsString } from 'class-validator';

export class GetSaltDto {
  @IsString()
  @IsNotEmpty()
  jwt!: string;
}
