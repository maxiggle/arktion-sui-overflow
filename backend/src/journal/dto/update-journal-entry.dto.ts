import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, IsString, MaxLength } from 'class-validator';

export class UpdateJournalEntryDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  currentChapter?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  totalChapters?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
