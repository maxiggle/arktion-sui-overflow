import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import type { SubmissionDto } from './dto/submission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AdminJwtGuard } from '../admin/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../admin/guards/admin-role.guard';
import { RequireRole } from '../admin/decorators/require-role.decorator';
import { AuditLog } from '../admin/decorators/audit-log.decorator';
import { AuditLogInterceptor } from '../admin/interceptors/audit-log.interceptor';
import { AdminRole } from '../admin/types/admin-role.enum';

@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  /**
   * POST /api/v1/submissions
   *
   * Submit a series suggestion. Open to all authenticated users.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSubmissionDto,
  ): Promise<SubmissionDto> {
    return this.submissionService.create(user.id, dto);
  }

  /**
   * GET /api/v1/submissions/mine
   *
   * All submissions created by the authenticated user.
   */
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMySubmissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionDto[]> {
    return this.submissionService.getMySubmissions(user.id);
  }

  /**
   * GET /api/v1/submissions/pending
   *
   * All pending submissions, oldest first. REVIEWER+ admin only.
   */
  @Get('pending')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @RequireRole(AdminRole.REVIEWER)
  async getPending(): Promise<SubmissionDto[]> {
    return this.submissionService.getPending();
  }

  /**
   * POST /api/v1/submissions/:id/approve
   *
   * Approve a pending submission. Atomically mints 50 INK + Contributor badge
   * for the submitter via a single PTB. MODERATOR+ admin only.
   */
  @Post(':id/approve')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @RequireRole(AdminRole.MODERATOR)
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ actionType: 'SUBMISSION_APPROVE', targetType: 'Submission' })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionDto> {
    return this.submissionService.approve(id);
  }

  /**
   * POST /api/v1/submissions/:id/reject
   *
   * Reject a pending submission. Postgres only — no chain call. MODERATOR+ admin only.
   */
  @Post(':id/reject')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @RequireRole(AdminRole.MODERATOR)
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ actionType: 'SUBMISSION_REJECT', targetType: 'Submission' })
  @HttpCode(HttpStatus.OK)
  async reject(@Param('id', ParseUUIDPipe) id: string): Promise<SubmissionDto> {
    return this.submissionService.reject(id);
  }
}
