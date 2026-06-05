import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { SuiModule } from './sui/sui.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PassportModule } from './passport/passport.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    PrismaModule,
    SuiModule,
    AuthModule,
    UsersModule,
    PassportModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
