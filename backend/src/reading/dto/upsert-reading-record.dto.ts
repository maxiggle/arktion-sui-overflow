import { IsInt, IsEnum, Min } from 'class-validator';
import { ReadingStatus } from '../reading.service';

export class UpsertReadingRecordDto {
  seriesId!: string;

  @IsEnum(ReadingStatus)
  status!: ReadingStatus;

  @IsInt()
  @Min(0)
  currentChapter!: number;
}
