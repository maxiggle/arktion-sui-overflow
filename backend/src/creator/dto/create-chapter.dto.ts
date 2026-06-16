import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChapterDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(99999)
  chapterNumber!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  /** Ordered array of Walrus aggregator URLs — one per page. */
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMinSize(1)
  pages!: string[];
}
