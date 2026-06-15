import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { SeriesStatus } from './create-series.dto';

export class UpdateSeriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsEnum([0, 1, 2, 3, 4], {
    message: 'formatType must be 0 (novel) 1 (manga) 2 (manhwa) 3 (manhua) 4 (webtoon)',
  })
  formatType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sourceLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsEnum(SeriesStatus)
  status?: SeriesStatus;
}
