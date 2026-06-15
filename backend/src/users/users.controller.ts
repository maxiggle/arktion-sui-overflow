import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { UsersService, UpdateProfileDto } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.users.findById(user.id);
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.users.updateProfile(user.id, dto);
  }
}
