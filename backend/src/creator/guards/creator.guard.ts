import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';

/**
 * Requires both a valid JWT session (applied before this guard via JwtAuthGuard)
 * and an APPROVED creator status on the user record.
 *
 * Unapproved users should be redirected to /creator/apply on the frontend;
 * this guard is the server-side enforcement.
 */
@Injectable()
export class CreatorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { creatorStatus: true },
    });

    if (record?.creatorStatus !== 'APPROVED') {
      throw new ForbiddenException(
        'Creator access requires an approved application. Visit /creator/apply to get started.',
      );
    }

    return true;
  }
}
