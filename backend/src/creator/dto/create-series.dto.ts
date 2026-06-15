import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export enum SeriesStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  HIATUS = 'hiatus',
  CANCELLED = 'cancelled',
}

export class CreateSeriesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsEnum([0, 1, 2, 3, 4], {
    message: 'formatType must be 0 (novel) 1 (manga) 2 (manhwa) 3 (manhua) 4 (webtoon)',
  })
  formatType: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  sourceLanguage: string;

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
