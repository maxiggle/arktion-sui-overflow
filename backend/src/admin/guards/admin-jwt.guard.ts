import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedAdmin } from '../types/authenticated-admin.type';
import { AdminRole } from '../types/admin-role.enum';

interface AdminAccessTokenPayload {
  sub: string;
  sid: string;
  role: AdminRole;
  type: 'admin';
  iat: number;
  exp: number;
}

/**
 * Stateful JWT guard for admin routes.
 *
 * Two-layer validation:
 *   1. Verify JWT signature against ADMIN_JWT_SECRET
 *   2. Look up admin session in Postgres (revocation + deactivation check)
 *
 * On success, attaches AuthenticatedAdmin to request.admin.
 */
@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Missing or malformed Authorization header',
      );
    }

    const payload = this.verifyToken(token);

    const session = await this.prisma.adminSession.findUnique({
      where: { id: payload.sid },
      include: { admin: true },
    });

    if (!session) throw new UnauthorizedException('Admin session not found');
    if (session.revokedAt) throw new UnauthorizedException('Session revoked');
    if (session.expiresAt < new Date())
      throw new UnauthorizedException('Session expired');
    if (!session.admin.isActive)
      throw new UnauthorizedException('Admin account deactivated');

    // Fire-and-forget: update lastUsedAt
    this.prisma.adminSession
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    const authenticated: AuthenticatedAdmin = {
      id: session.admin.id,
      email: session.admin.email,
      role: session.admin.role as AdminRole,
      sessionId: session.id,
    };

    (request as Request & { admin: AuthenticatedAdmin }).admin = authenticated;
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }

  private verifyToken(token: string): AdminAccessTokenPayload {
    try {
      const payload = jwt.verify(
        token,
        this.config.getOrThrow<string>('ADMIN_JWT_SECRET'),
      ) as AdminAccessTokenPayload;

      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Admin token expired');
      }
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid admin token');
    }
  }
}
