import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verify } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole } from '../types/admin-role.enum';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { AdminTotpValidateDto } from './dto/admin-totp-validate.dto';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const ACCESS_TOKEN_TTL = 60 * 60;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;
const PREAUTH_TOKEN_TTL = 5 * 60;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 4;

interface AdminJwtPayload {
  sub: string;
  sid?: string;
  role?: AdminRole;
  type: 'admin' | 'admin_refresh' | 'admin_preauth';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  requiresTotp: boolean;
  preAuthToken?: string;
  tokens?: TokenPair;
}

export interface TotpSetupResult {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
}

@Injectable()
export class AdminAuthService {
  private readonly jwtSecret: string;
  private readonly encryptionKey: Buffer;
  private readonly totpIssuer: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.jwtSecret = this.config.getOrThrow<string>('ADMIN_JWT_SECRET');
    this.totpIssuer = this.config.getOrThrow<string>('TOTP_ISSUER');

    const encKey = this.config.getOrThrow<string>('TOTP_ENCRYPTION_KEY');
    this.encryptionKey = Buffer.from(encKey, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error(
        'TOTP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)',
      );
    }
  }

  async login(
    dto: AdminLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });
    const invalidErr = new UnauthorizedException('Invalid credentials');
    if (!admin || !admin.isActive) throw invalidErr;

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remainingMin = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new UnauthorizedException(
        `Account locked. Try again in ${remainingMin} minute(s)`,
      );
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      admin.passwordHash,
    );
    if (!passwordMatch) {
      const newAttempts = admin.failedLoginAttempts + 1;
      const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + LOCK_DURATION_MS)
            : null,
        },
      });
      throw invalidErr;
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    if (admin.totpEnabled) {
      const preAuthToken = this.signToken({
        sub: admin.id,
        type: 'admin_preauth',
        expiresIn: PREAUTH_TOKEN_TTL,
      });
      return { requiresTotp: true, preAuthToken };
    }

    const tokens = await this.createSession(
      admin.id,
      admin.role as AdminRole,
      ipAddress,
      userAgent,
    );
    await this.updateLastLogin(admin.id, ipAddress);
    return { requiresTotp: false, tokens };
  }

  async validateTotp(
    dto: AdminTotpValidateDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    let payload: AdminJwtPayload;
    try {
      payload = jwt.verify(dto.preAuthToken, this.jwtSecret) as AdminJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired pre-auth token');
    }

    if (payload.type !== 'admin_preauth') {
      throw new UnauthorizedException('Invalid token type');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!admin.totpEnabled || !admin.totpSecret) {
      throw new BadRequestException('TOTP not configured');
    }

    const secret = this.decryptTotpSecret(admin.totpSecret);

    if (dto.code.length === 6) {
      // Standard TOTP code
      const result = await verify({ secret, token: dto.code });
      if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');
    } else {
      // 8-char hex backup code
      await this.consumeBackupCode(admin.id, dto.code, admin.totpBackupCodes);
    }

    const tokens = await this.createSession(
      admin.id,
      admin.role as AdminRole,
      ipAddress,
      userAgent,
    );
    await this.updateLastLogin(admin.id, ipAddress);
    return tokens;
  }

  async refresh(
    dto: AdminRefreshDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    let payload: AdminJwtPayload;
    try {
      payload = jwt.verify(dto.refreshToken, this.jwtSecret) as AdminJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'admin_refresh' || !payload.sid) {
      throw new UnauthorizedException('Invalid token type');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.adminSession.findFirst({
      where: {
        id: payload.sid,
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { admin: true },
    });

    if (!session || !session.admin.isActive) {
      throw new UnauthorizedException('Session invalid or expired');
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.createSession(
      session.adminId,
      session.admin.role as AdminRole,
      ipAddress,
      userAgent,
    );
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(adminId: string): Promise<void> {
    await this.prisma.adminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async initTotpSetup(adminId: string): Promise<TotpSetupResult> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.totpEnabled)
      throw new BadRequestException('TOTP already enabled');

    // generateSecret() returns a Base32-encoded secret compatible with
    // Google Authenticator and most TOTP apps
    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: this.totpIssuer,
      label: admin.email,
      secret,
    });

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { totpSecret: this.encryptTotpSecret(secret) },
    });

    // Return backup codes in plaintext — caller shows them once then discards
    const backupCodes = this.generateBackupCodes();
    return { secret, otpauthUrl, backupCodes };
  }

  async confirmTotpSetup(adminId: string, code: string): Promise<string[]> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });
    if (!admin?.totpSecret)
      throw new BadRequestException('TOTP setup not initiated');
    if (admin.totpEnabled)
      throw new BadRequestException('TOTP already confirmed');

    const secret = this.decryptTotpSecret(admin.totpSecret);
    const result = await verify({ secret, token: code });
    if (!result.valid)
      throw new BadRequestException('Invalid verification code');

    const backupCodes = this.generateBackupCodes();
    const hashedCodes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, BCRYPT_ROUNDS)),
    );

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { totpEnabled: true, totpBackupCodes: hashedCodes },
    });

    return backupCodes;
  }

  async disableTotp(adminId: string, code: string): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });
    if (!admin?.totpEnabled || !admin.totpSecret) {
      throw new BadRequestException('TOTP is not enabled');
    }

    const secret = this.decryptTotpSecret(admin.totpSecret);
    const result = await verify({ secret, token: code });
    if (!result.valid) throw new UnauthorizedException('Invalid TOTP code');

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { totpEnabled: false, totpSecret: null, totpBackupCodes: [] },
    });
  }

  private async createSession(
    adminId: string,
    role: AdminRole,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

    const session = await this.prisma.adminSession.create({
      data: { adminId, refreshTokenHash, ipAddress, userAgent, expiresAt },
    });

    const accessToken = this.signToken({
      sub: adminId,
      sid: session.id,
      role,
      type: 'admin',
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.signToken({
      sub: adminId,
      sid: session.id,
      type: 'admin_refresh',
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL };
  }

  private signToken(params: {
    sub: string;
    sid?: string;
    role?: AdminRole;
    type: AdminJwtPayload['type'];
    expiresIn: number;
  }): string {
    const payload: Record<string, unknown> = {
      sub: params.sub,
      type: params.type,
    };
    if (params.sid) payload['sid'] = params.sid;
    if (params.role) payload['role'] = params.role;
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: params.expiresIn as jwt.SignOptions['expiresIn'],
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private encryptTotpSecret(secret: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex'),
    ].join(':');
  }

  private decryptTotpSecret(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) throw new Error('Malformed TOTP secret');
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () =>
      crypto.randomBytes(BACKUP_CODE_BYTES).toString('hex'),
    );
  }

  private async consumeBackupCode(
    adminId: string,
    submittedCode: string,
    hashedCodes: string[],
  ): Promise<void> {
    let matchIndex = -1;
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await bcrypt.compare(submittedCode, hashedCodes[i])) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex === -1)
      throw new UnauthorizedException('Invalid backup code');

    const remaining = hashedCodes.filter((_, i) => i !== matchIndex);
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { totpBackupCodes: remaining },
    });
  }

  private async updateLastLogin(
    adminId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress ?? null },
    });
  }
}
