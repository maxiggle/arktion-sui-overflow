import { SetMetadata } from '@nestjs/common';
import { AdminRole } from '../types/admin-role.enum';

export const REQUIRE_ROLE_KEY = 'admin:require_role';

/**
 * Declares the minimum AdminRole needed to access a route.
 * Must be used together with AdminJwtGuard and AdminRoleGuard.
 *
 * Usage:
 *   @UseGuards(AdminJwtGuard, AdminRoleGuard)
 *   @RequireRole(AdminRole.SUPER_ADMIN)
 *   @Post('users')
 */
export const RequireRole = (role: AdminRole) =>
  SetMetadata(REQUIRE_ROLE_KEY, role);
