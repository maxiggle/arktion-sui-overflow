import {
  BadRequestException,
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
import { RequestRoleChangeDto } from './dto/request-role-change.dto';
import {
  RoleChangeRequestDto,
  RoleChangeStatus,
} from './dto/role-change-request.dto';

const BCRYPT_ROUNDS = 12;

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  totpEnabled: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
} as const;

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

  /**
   * Four-eyes step 1 — record an intent to change a role. The change does NOT
   * take effect until a *different* admin approves it via approveRoleChange.
   */
  async requestRoleChange(
    targetId: string,
    dto: RequestRoleChangeDto,
    requestingAdminId: string,
  ): Promise<RoleChangeRequestDto> {
    if (targetId === requestingAdminId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const target = await this.prisma.adminUser.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) throw new NotFoundException('Admin user not found');
    if (!target.isActive) {
      throw new BadRequestException(
        'Cannot change the role of a deactivated admin',
      );
    }
    if (target.role === dto.role) {
      throw new BadRequestException('Target admin already has this role');
    }

    const pending = await this.prisma.adminRoleChangeRequest.findFirst({
      where: { targetId, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException(
        'A pending role change already exists for this admin',
      );
    }

    const created = await this.prisma.adminRoleChangeRequest.create({
      data: {
        targetId,
        previousRole: target.role,
        requestedRole: dto.role,
        reason: dto.reason ?? null,
        requestedById: requestingAdminId,
      },
    });
    return this.toRequestDto(created);
  }

  /**
   * Four-eyes step 2 — a second admin approves the pending change, applying it.
   * The reviewer must differ from the requester and may not act on their own
   * account. Approval revokes the target's sessions so the new role takes
   * effect immediately (role is embedded in the admin access token).
   */
  async approveRoleChange(
    requestId: string,
    reviewingAdminId: string,
  ): Promise<AdminUserDto> {
    const request = await this.prisma.adminRoleChangeRequest.findUnique({
      where: { id: requestId },
      include: { target: { select: { role: true, isActive: true } } },
    });
    if (!request) throw new NotFoundException('Role change request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException(
        `Request already ${request.status.toLowerCase()}`,
      );
    }
    if (request.requestedById === reviewingAdminId) {
      throw new ForbiddenException(
        'Four-eyes principle: a role change must be approved by a different admin',
      );
    }
    if (request.targetId === reviewingAdminId) {
      throw new ForbiddenException(
        'Cannot approve a role change affecting your own account',
      );
    }
    if (!request.target.isActive) {
      throw new BadRequestException('Target admin is deactivated');
    }
    if (request.target.role !== request.previousRole) {
      throw new ConflictException(
        'Target role changed since this request was created. Reject it and create a new one.',
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.adminUser.update({
        where: { id: request.targetId },
        data: { role: request.requestedRole },
        select: ADMIN_USER_SELECT,
      }),
      this.prisma.adminRoleChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedById: reviewingAdminId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.adminSession.updateMany({
        where: { adminId: request.targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return this.toDto(updated);
  }

  /**
   * Reject (or, when the requester acts on their own request, cancel) a pending
   * role change. Either way the change never takes effect.
   */
  async rejectRoleChange(
    requestId: string,
    reviewingAdminId: string,
    reason?: string,
  ): Promise<RoleChangeRequestDto> {
    const request = await this.prisma.adminRoleChangeRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Role change request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException(
        `Request already ${request.status.toLowerCase()}`,
      );
    }

    const status: RoleChangeStatus =
      request.requestedById === reviewingAdminId ? 'CANCELLED' : 'REJECTED';

    const updated = await this.prisma.adminRoleChangeRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: reviewingAdminId,
        reviewedAt: new Date(),
        reason: reason ?? request.reason,
      },
    });
    return this.toRequestDto(updated);
  }

  async listRoleChangeRequests(
    status?: RoleChangeStatus,
  ): Promise<RoleChangeRequestDto[]> {
    const requests = await this.prisma.adminRoleChangeRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        target: { select: { email: true } },
        requestedBy: { select: { email: true } },
        reviewedBy: { select: { email: true } },
      },
    });
    return requests.map((r) => this.toRequestDto(r));
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

  private toRequestDto(r: {
    id: string;
    targetId: string;
    previousRole: string;
    requestedRole: string;
    status: string;
    reason: string | null;
    requestedById: string;
    reviewedById: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    target?: { email: string };
    requestedBy?: { email: string };
    reviewedBy?: { email: string } | null;
  }): RoleChangeRequestDto {
    return {
      id: r.id,
      targetId: r.targetId,
      targetEmail: r.target?.email,
      previousRole: r.previousRole as AdminRole,
      requestedRole: r.requestedRole as AdminRole,
      status: r.status as RoleChangeStatus,
      reason: r.reason,
      requestedById: r.requestedById,
      requestedByEmail: r.requestedBy?.email,
      reviewedById: r.reviewedById,
      reviewedByEmail: r.reviewedBy?.email ?? null,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    };
  }
}
