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
  MinLength,
  ValidateIf,
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

  /** Image-based formats (manga, manhwa, manhua, webtoon): ordered Walrus URLs. */
  @ValidateIf((o) => !o.contentUrl)
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMinSize(1)
  pages?: string[];

  /** Novel format: Walrus blob URL pointing to the chapter markdown text. */
  @ValidateIf((o) => !o.pages)
  @IsString()
  @IsUrl({ require_tld: false })
  @MinLength(1)
  contentUrl?: string;
}
