import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRoleChangeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
