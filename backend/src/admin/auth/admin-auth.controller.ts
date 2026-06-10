import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';
import { AuditLog } from '../decorators/audit-log.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import type { AuthenticatedAdmin } from '../types/authenticated-admin.type';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { AdminTotpSetupVerifyDto } from './dto/admin-totp-setup-verify.dto';
import { AdminTotpValidateDto } from './dto/admin-totp-validate.dto';

@Controller('admin/auth')
@UseInterceptors(AuditLogInterceptor)
export class AdminAuthController {
  constructor(private readonly authService: AdminAuthService) {}

  /** Step 1: email + password */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ actionType: 'ADMIN_LOGIN' })
  login(@Body() dto: AdminLoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  /** Step 2 (when TOTP enabled): submit 6-digit code or backup code */
  @Post('totp/validate')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ actionType: 'ADMIN_TOTP_VALIDATE' })
  totpValidate(@Body() dto: AdminTotpValidateDto, @Ip() ip: string) {
    return this.authService.validateTotp(dto, ip);
  }

  /** Rotate access token using refresh token */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: AdminRefreshDto, @Ip() ip: string) {
    return this.authService.refresh(dto, ip);
  }

  /** Revoke current session */
  @Delete('logout')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ actionType: 'ADMIN_LOGOUT' })
  async logout(@CurrentAdmin() admin: AuthenticatedAdmin): Promise<void> {
    await this.authService.logout(admin.sessionId);
  }

  /** Revoke all sessions for current admin */
  @Delete('logout/all')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ actionType: 'ADMIN_LOGOUT_ALL' })
  async logoutAll(@CurrentAdmin() admin: AuthenticatedAdmin): Promise<void> {
    await this.authService.logoutAll(admin.id);
  }

  /** Initiate TOTP setup — returns secret + otpauth URL */
  @Post('totp/setup/init')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ actionType: 'ADMIN_TOTP_SETUP_INIT' })
  totpSetupInit(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.authService.initTotpSetup(admin.id);
  }

  /** Confirm TOTP setup with first valid code — returns backup codes */
  @Post('totp/setup/confirm')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ actionType: 'ADMIN_TOTP_SETUP_CONFIRM' })
  async totpSetupConfirm(
    @Body() dto: AdminTotpSetupVerifyDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<{ message: string; backupCodes: string[] }> {
    const backupCodes = await this.authService.confirmTotpSetup(
      admin.id,
      dto.code,
    );
    return {
      message:
        'TOTP enabled. Store backup codes securely — they will not be shown again.',
      backupCodes,
    };
  }

  /** Disable TOTP (requires current TOTP code) */
  @Delete('totp')
  @UseGuards(AdminJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ actionType: 'ADMIN_TOTP_DISABLE' })
  async totpDisable(
    @Body() dto: AdminTotpSetupVerifyDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ): Promise<void> {
    await this.authService.disableTotp(admin.id, dto.code);
  }
}
