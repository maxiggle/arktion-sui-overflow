import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { $Enums } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRole, ROLE_RANK } from '../types/admin-role.enum';
import { AdminUserDto } from './dto/admin-user.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminUserDto[]> {
    const admins = await this.prisma.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        totpEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });
    return admins.map((a) => this.toDto(a));
  }

  async findById(id: string): Promise<AdminUserDto> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        totpEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });
    if (!admin) throw new NotFoundException('Admin user not found');
    return this.toDto(admin);
  }

  async create(dto: CreateAdminUserDto): Promise<AdminUserDto> {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const admin = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        totpEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });
    return this.toDto(admin);
  }

  async updateRole(
    targetId: string,
    dto: UpdateAdminRoleDto,
    requestingAdminId: string,
  ): Promise<AdminUserDto> {
    if (targetId === requestingAdminId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('Admin user not found');

    const updated = await this.prisma.adminUser.update({
      where: { id: targetId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        totpEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
      },
    });
    return this.toDto(updated);
  }

  async deactivate(targetId: string, requestingAdminId: string): Promise<void> {
    if (targetId === requestingAdminId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('Admin user not found');

    // Deactivate + revoke all sessions atomically
    await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id: targetId },
        data: { isActive: false },
      }),
      this.prisma.adminSession.updateMany({
        where: { adminId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async activate(targetId: string): Promise<void> {
    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
    });
    if (!target) throw new NotFoundException('Admin user not found');

    await this.prisma.adminUser.update({
      where: { id: targetId },
      data: { isActive: true },
    });
  }

  /**
   * Validate that requesting admin has sufficient rank to manage target.
   * Used by controllers to prevent privilege escalation.
   */
  assertCanManage(requestingRole: AdminRole, targetRole: AdminRole): void {
    if (ROLE_RANK[requestingRole] <= ROLE_RANK[targetRole]) {
      throw new ForbiddenException(
        'Cannot manage an admin with equal or higher role',
      );
    }
  }

  private toDto(admin: {
    id: string;
    email: string;
    role: $Enums.AdminRole;
    isActive: boolean;
    totpEnabled: boolean;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    createdAt: Date;
  }): AdminUserDto {
    return {
      id: admin.id,
      email: admin.email,
      role: admin.role as AdminRole,
      isActive: admin.isActive,
      totpEnabled: admin.totpEnabled,
      lastLoginAt: admin.lastLoginAt,
      lastLoginIp: admin.lastLoginIp,
      createdAt: admin.createdAt,
    };
  }
}
