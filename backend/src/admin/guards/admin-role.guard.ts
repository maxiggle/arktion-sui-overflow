import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AdminRole, ROLE_RANK } from '../types/admin-role.enum';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';
import type { AuthenticatedAdmin } from '../types/authenticated-admin.type';

/**
 * Enforces minimum role requirement set by @RequireRole().
 * Must run AFTER AdminJwtGuard (relies on request.admin being populated).
 *
 * Usage:
 *   @UseGuards(AdminJwtGuard, AdminRoleGuard)
 *   @RequireRole(AdminRole.SUPER_ADMIN)
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<AdminRole | undefined>(
      REQUIRE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequireRole() annotation — any authenticated admin can proceed
    if (!requiredRole) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { admin?: AuthenticatedAdmin }>();

    const admin = request.admin;
    if (!admin) throw new ForbiddenException('Not authenticated as admin');

    const adminRank = ROLE_RANK[admin.role] ?? -1;
    const requiredRank = ROLE_RANK[requiredRole] ?? 999;

    if (adminRank < requiredRank) {
      throw new ForbiddenException(
        `Requires ${requiredRole} role or higher. Your role: ${admin.role}`,
      );
    }

    return true;
  }
}
