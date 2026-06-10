import { IsEnum } from 'class-validator';
import { AdminRole } from '../../types/admin-role.enum';

export class UpdateAdminRoleDto {
  @IsEnum(AdminRole)
  role!: AdminRole;
}
