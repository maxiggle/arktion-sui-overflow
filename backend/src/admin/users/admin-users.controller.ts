import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditLog } from '../decorators/audit-log.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { RequireRole } from '../decorators/require-role.decorator';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminRoleGuard } from '../guards/admin-role.guard';
import { AuditLogInterceptor } from '../interceptors/audit-log.interceptor';
import { AdminRole } from '../types/admin-role.enum';
import type { AuthenticatedAdmin } from '../types/authenticated-admin.type';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { RequestRoleChangeDto } from './dto/request-role-change.dto';
import { ReviewRoleChangeDto } from './dto/review-role-change.dto';
import type { RoleChangeStatus } from './dto/role-change-request.dto';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(AdminJwtGuard, AdminRoleGuard)
@RequireRole(AdminRole.SUPER_ADMIN)
@UseInterceptors(AuditLogInterceptor)
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.usersService.findAll();
  }

  // Literal route — must precede `:id` so it isn't captured as a user id.
  @Get('role-change-requests')
  @HttpCode(HttpStatus.OK)
  listRoleChangeRequests(@Query('status') status?: RoleChangeStatus) {
    return this.usersService.listRoleChangeRequests(status);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditLog({ actionType: 'ADMIN_USER_CREATE', targetType: 'AdminUser' })
  async create(@Body() dto: CreateAdminUserDto) {
    return this.usersService.create(dto);
  }

  /**
   * Four-eyes step 1 — request a role change. Does not take effect until a
   * different admin approves it.
   */
  @Post(':id/role-change-requests')
  @HttpCode(HttpStatus.CREATED)
  @AuditLog({
    actionType: 'ADMIN_ROLE_CHANGE_REQUEST',
    targetType: 'AdminUser',
  })
  async requestRoleChange(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestRoleChangeDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const target = await this.usersService.findById(id);
    this.usersService.assertCanManage(admin.role, target.role);
    return this.usersService.requestRoleChange(id, dto, admin.id);
  }

  /** Four-eyes step 2 — a different admin approves and applies the change. */
  @Post('role-change-requests/:requestId/approve')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    actionType: 'ADMIN_ROLE_CHANGE_APPROVE',
    targetType: 'AdminRoleChangeRequest',
  })
  async approveRoleChange(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.usersService.approveRoleChange(requestId, admin.id);
  }

  /** Reject (or cancel, if you are the requester) a pending role change. */
  @Post('role-change-requests/:requestId/reject')
  @HttpCode(HttpStatus.OK)
  @AuditLog({
    actionType: 'ADMIN_ROLE_CHANGE_REJECT',
    targetType: 'AdminRoleChangeRequest',
  })
  async rejectRoleChange(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: ReviewRoleChangeDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.usersService.rejectRoleChange(requestId, admin.id, dto.reason);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ actionType: 'ADMIN_USER_DEACTIVATE', targetType: 'AdminUser' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const target = await this.usersService.findById(id);
    this.usersService.assertCanManage(admin.role, target.role);
    await this.usersService.deactivate(id, admin.id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuditLog({ actionType: 'ADMIN_USER_ACTIVATE', targetType: 'AdminUser' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.activate(id);
  }
}
