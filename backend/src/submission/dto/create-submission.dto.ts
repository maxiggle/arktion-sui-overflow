import { IsInt, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubmissionDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  /** 0=novel 1=manga 2=manhwa 3=manhua 4=webtoon */
  @IsInt()
  @Min(0)
  @Type(() => Number)
  formatType!: number;

  @IsUrl()
  @MaxLength(2000)
  externalUrl!: string;

  @IsString()
  @MaxLength(200)
  suggestedSource!: string;
}
