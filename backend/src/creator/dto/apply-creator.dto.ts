import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum Cadence {
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi-weekly',
  MONTHLY = 'monthly',
  ONE_SHOT = 'one-shot',
}

export class ApplyCreatorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(80, { message: 'pitch must be at least 80 characters — tell us your story' })
  @MaxLength(2000)
  pitch: string;

  @IsEnum(Cadence, { message: 'cadence must be weekly, bi-weekly, monthly, or one-shot' })
  cadence: Cadence;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  tooling: string;

  @IsOptional()
  @IsUrl({}, { message: 'portfolioUrl must be a valid URL' })
  portfolioUrl?: string;
}
