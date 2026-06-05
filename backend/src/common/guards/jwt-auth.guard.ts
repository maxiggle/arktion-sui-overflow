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
import { AuthenticatedUser } from '../types/authenticated-user.type';

interface SessionTokenPayload {
  sub: string; // user.id
  sid: string; // session.id
  iat: number;
  exp: number;
}

/**
 * Stateful JWT auth guard.
 *
 * Two-layer validation:
 *   1. Verify the JWT signature against JWT_SECRET (catches forgery)
 *   2. Look up the session row in Postgres (catches revoked sessions)
 *
 * The second check is what makes logout work — deleting the session row
 * immediately invalidates the token even if its `exp` claim says otherwise.
 *
 * On success, attaches `{ id, walletAddress, sessionId }` to request.user so
 * controllers can access it via the @CurrentUser() decorator.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    // Session must exist, not be expired, and not be revoked
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }
    if (session.revokedAt) {
      throw new UnauthorizedException('Session revoked');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }
    if (session.user.deletedAt) {
      throw new UnauthorizedException('Account deactivated');
    }

    // Touch lastUsedAt for activity tracking. Fire-and-forget — failure here
    // shouldn't break authentication.
    this.prisma.session
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);

    const authenticated: AuthenticatedUser = {
      id: session.user.id,
      walletAddress: session.user.walletAddress,
      sessionId: session.id,
    };
    (request as Request & { user: AuthenticatedUser }).user = authenticated;
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }

  private verifyToken(token: string): SessionTokenPayload {
    try {
      return jwt.verify(
        token,
        this.config.getOrThrow<string>('JWT_SECRET'),
      ) as SessionTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
