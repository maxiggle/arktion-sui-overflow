import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ZkLoginService } from './zklogin.service';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    ZkLoginService,
    SessionService,
    JwtAuthGuard, // re-exported so other modules can @UseGuards(JwtAuthGuard)
  ],
  exports: [SessionService, JwtAuthGuard],
})
export class AuthModule {}
