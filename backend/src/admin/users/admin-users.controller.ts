import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
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

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @AuditLog({ actionType: 'ADMIN_USER_ROLE_UPDATE', targetType: 'AdminUser' })
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminRoleDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const target = await this.usersService.findById(id);
    this.usersService.assertCanManage(admin.role, target.role);
    return this.usersService.updateRole(id, dto, admin.id);
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
