import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ZkLoginService } from './zklogin.service';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, ZkLoginService, SessionService, JwtAuthGuard],
  exports: [SessionService, ZkLoginService, JwtAuthGuard],
})
export class AuthModule {}
