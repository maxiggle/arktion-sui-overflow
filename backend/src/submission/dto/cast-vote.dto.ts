import { IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CastVoteDto {
  /** 1 = approve, 0 = reject */
  @IsIn([0, 1])
  @Type(() => Number)
  vote!: 0 | 1;
}
