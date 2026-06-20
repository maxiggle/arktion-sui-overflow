import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminRole } from '../../types/admin-role.enum';

export class RequestRoleChangeDto {
  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
