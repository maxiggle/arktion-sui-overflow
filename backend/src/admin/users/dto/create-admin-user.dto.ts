import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { AdminRole } from '../../types/admin-role.enum';

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;
}
