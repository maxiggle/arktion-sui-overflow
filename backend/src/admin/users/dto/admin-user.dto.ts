import { AdminRole } from '../../types/admin-role.enum';

export class AdminUserDto {
  id!: string;
  email!: string;
  role!: AdminRole;
  isActive!: boolean;
  totpEnabled!: boolean;
  lastLoginAt!: Date | null;
  lastLoginIp!: string | null;
  createdAt!: Date;
}
