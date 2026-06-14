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
import type { Request } from 'express';

import { AuthService, AuthResult } from './auth.service';
import { SessionService } from './session.service';
import { ZkLoginService, EnokiZkProof } from './zklogin.service';
import { CompleteZkLoginDto } from './dto/complete-zklogin.dto';
import { GetSaltDto } from './dto/get-salt.dto';
import { GetProofDto } from './dto/get-proof.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { SuiService } from '../sui/sui.service';

const MAX_EPOCH_OFFSET = 2;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
    private readonly zkLogin: ZkLoginService,
    private readonly sui: SuiService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Returns the current Sui epoch and the recommended maxEpoch for ephemeral
   * keypair generation. No auth required.
   */
  @Get('epoch')
  async getEpoch(): Promise<{ epoch: number; maxEpoch: number }> {
    const { systemState } = await this.sui.client.core.getCurrentSystemState();
    const epoch = Number(systemState.epoch);
    return { epoch, maxEpoch: epoch + MAX_EPOCH_OFFSET };
  }

  /**
   * Return the Enoki-managed salt and wallet address for a JWT.
   * The frontend calls this so it can display the user's address;
   * address derivation for user creation now happens server-side via Enoki.
   */
  @Post('zklogin/salt')
  @HttpCode(HttpStatus.OK)
  async getSalt(
    @Body() dto: GetSaltDto,
  ): Promise<{ salt: string; address: string }> {
    return this.zkLogin.getEnokiAddress(dto.jwt);
  }

  /**
   * Proxy a ZK proof request to Enoki.
   * Enoki manages the salt internally — no salt param needed.
   * The JWT is passed in the request body and forwarded as a header to Enoki.
   */
  @Post('zklogin/proof')
  @HttpCode(HttpStatus.OK)
  async getZkProof(@Body() dto: GetProofDto): Promise<EnokiZkProof> {
    return this.zkLogin.requestZkProof({
      jwtToken: dto.jwt,
      ephemeralPublicKey: dto.ephemeralPublicKey,
      maxEpoch: dto.maxEpoch,
      randomness: dto.randomness,
    });
  }

  /**
   * Complete a zkLogin sign-in.
   * The backend calls Enoki to retrieve the wallet address for the JWT —
   * no address is accepted from the frontend to prevent spoofing.
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

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.sessions.revoke(user.sessionId);
  }
}
