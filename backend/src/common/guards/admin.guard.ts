import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

import { SuiService } from '../../sui/sui.service';
import { AuthenticatedUser } from '../types/authenticated-user.type';

/**
 * Must be applied AFTER JwtAuthGuard — relies on req.user being set.
 *
 * Grants access only if the authenticated user's wallet address matches
 * the admin keypair's address (the wallet that holds the AdminCap).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly sui: SuiService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }

    if (user.walletAddress !== this.sui.adminAddress) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
