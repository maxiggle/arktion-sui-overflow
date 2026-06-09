import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateJournalEntryDto {
  @IsString()
  @MaxLength(500)
  externalTitle!: string;

  /** 0=novel 1=manga 2=manhwa 3=manhua 4=webtoon — mirrors FormatType */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  formatType!: number;

  @IsUrl()
  @MaxLength(2000)
  externalUrl!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalChapters: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentChapter: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
