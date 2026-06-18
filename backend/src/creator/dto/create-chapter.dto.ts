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
  @ValidateIf((o: CreateChapterDto) => !o.contentUrl)
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  @ArrayMinSize(1)
  pages?: string[];

  /** Novel format: Walrus blob URL pointing to the chapter markdown text. */
  @ValidateIf((o: CreateChapterDto) => !o.pages)
  @IsString()
  @IsUrl({ require_tld: false })
  @MinLength(1)
  contentUrl?: string;

  /** Raw markdown text for novel chapters — used to index the chapter in MemWal for the AI writing assistant. Not stored in the DB. */
  @ValidateIf((o: CreateChapterDto) => !!o.contentUrl)
  @IsOptional()
  @IsString()
  content?: string;
}
