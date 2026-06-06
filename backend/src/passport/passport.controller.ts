import { Controller, Get, UseGuards } from '@nestjs/common';

import { PassportService } from './passport.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Controller('passport')
@UseGuards(JwtAuthGuard)
export class PassportController {
  constructor(private readonly passport: PassportService) {}

  /**
   * Returns the authenticated user's passport state.
   * Pulls from Postgres (fast). For an on-chain-fresh read, call /chain.
   */
  @Get('me')
  async getMyPassport(@CurrentUser() user: AuthenticatedUser) {
    return this.passport.findByUserId(user.id);
  }
}
