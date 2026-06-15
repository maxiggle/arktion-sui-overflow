import { Module } from '@nestjs/common';

import { PassportController } from './passport.controller';
import { PassportService } from './passport.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // for JwtAuthGuard
  controllers: [PassportController],
  providers: [PassportService],
  exports: [PassportService],
})
export class PassportModule {}
