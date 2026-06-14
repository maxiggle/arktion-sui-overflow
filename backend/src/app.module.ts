import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { SuiModule } from './sui/sui.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PassportModule } from './passport/passport.module';
import { InkModule } from './ink/ink.module';
import { BadgesModule } from './badges/badges.module';
import { SeriesModule } from './series/series.module';
import { ReadingModule } from './reading/reading.module';
import { JournalModule } from './journal/journal.module';
import { SubmissionModule } from './submission/submission.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    // Infrastructure (global)
    PrismaModule,
    SuiModule,
    // Auth
    AuthModule,
    // User identity
    UsersModule,
    PassportModule,
    // Batch 3: economy + content modules
    InkModule,
    BadgesModule,
    SeriesModule,
    ReadingModule,
    JournalModule,
    SubmissionModule,
    PaymentModule,
    // Admin
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
