import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminJwtGuard } from './guards/admin-jwt.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AdminAuthController, AdminUsersController],
  providers: [
    AdminAuthService,
    AdminUsersService,
    AdminJwtGuard,
    AdminRoleGuard,
    AuditLogInterceptor,
  ],
  exports: [AdminJwtGuard, AdminRoleGuard],
})
export class AdminModule {}
