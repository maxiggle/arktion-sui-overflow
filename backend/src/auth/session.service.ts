import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import ms, { StringValue } from 'ms';

import { PrismaService } from '../prisma/prisma.service';

export interface IssuedSession {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Stateful session manager.
 *
 *   1. Create a session row in Postgres
 *   2. Sign a JWT containing `{ sub: userId, sid: sessionId }`
 *   3. Return the JWT to the client
 *
 * Subsequent requests pass the JWT in `Authorization: Bearer <token>`.
 * JwtAuthGuard verifies the JWT signature AND looks up the session in
 * Postgres — meaning revocation (deleting the row) works immediately even
 * if the JWT's own `exp` claim says otherwise.
 *
 * The `ms` library parses JWT_EXPIRES_IN once. The same parsed value drives
 * both the DB row's `expiresAt` and the JWT's `exp` claim, so the two cannot
 * drift apart.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async issue(
    userId: string,
    meta: SessionMetadata = {},
  ): Promise<IssuedSession> {
    const expiresIn = this.config.get<StringValue>('JWT_EXPIRES_IN', '7d');
    const expiresAt = new Date(Date.now() + ms(expiresIn));

    const session = await this.prisma.session.create({
      data: {
        userId,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    const token = jwt.sign(
      { sub: userId, sid: session.id },
      this.config.getOrThrow<string>('JWT_SECRET'),
      { expiresIn },
    );

    return {
      sessionId: session.id,
      token,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Revokes a single session. Used by the logout endpoint.
   */
  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes every active session for a user. Useful for "log out everywhere"
   * or when admin deactivates an account.
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
