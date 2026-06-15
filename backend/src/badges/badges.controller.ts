import { Controller, Get, UseGuards } from '@nestjs/common';

import { BadgesService, BadgeDto } from './badges.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * GET /api/v1/badges
   *
   * All badges earned by the authenticated user, from the Postgres mirror.
   * Ordered by awardedAt descending (newest first).
   */
  @Get()
  async getMyBadges(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BadgeDto[]> {
    return this.badgesService.getMyBadges(user.id);
  }
}
