import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { AuthService, AuthResult } from './auth.service';
import { SessionService } from './session.service';
import { CompleteZkLoginDto } from './dto/complete-zklogin.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Complete a zkLogin sign-in.
   *
   * Body: { jwt }
   * Returns: { sessionToken, expiresAt, isNewUser, user }
   *
   * The frontend posts here after Google OAuth returns the ID token. On
   * first login this triggers the on-chain bootstrap (passport + library +
   * journal mint) and creates the user record.
   */
  @Post('zklogin/complete')
  @HttpCode(HttpStatus.OK)
  async completeZkLogin(
    @Body() dto: CompleteZkLoginDto,
    @Req() req: Request,
  ): Promise<AuthResult> {
    return this.authService.completeZkLogin(dto, {
      userAgent: req.get('user-agent') ?? undefined,
      ipAddress: req.ip,
    });
  }

  /**
   * Returns the currently authenticated user.
   *
   * Useful for frontend bootstrap ("am I still logged in?") and for debugging
   * tokens during development.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    const record = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        walletAddress: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    return record;
  }

  /**
   * Revoke the current session.
   *
   * The JWT becomes useless immediately because JwtAuthGuard checks the
   * session row on every request.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.sessions.revoke(user.sessionId);
  }
}
