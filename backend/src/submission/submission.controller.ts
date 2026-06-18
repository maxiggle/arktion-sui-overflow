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
import { CastVoteDto } from './dto/cast-vote.dto';
import type { SubmissionDto, CastVoteResponseDto } from './dto/submission.dto';
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
   * GET /api/v1/submissions/dao
   *
   * All PENDING submissions with live vote tallies.
   * Authenticated readers use this page to browse and vote on submissions.
   */
  @Get('dao')
  @UseGuards(JwtAuthGuard)
  async getForDao(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionDto[]> {
    return this.submissionService.getForDao(user.id);
  }

  /**
   * POST /api/v1/submissions/:id/vote
   *
   * Cast an INK-weighted DAO vote on a pending submission.
   * Requires at least 1 INK (earned by reading chapters).
   * Changing your vote is allowed — the previous vote is replaced.
   * Auto-finalises if quorum (500 INK) + 60 % threshold is reached.
   */
  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async castVote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CastVoteDto,
  ): Promise<CastVoteResponseDto> {
    return this.submissionService.castVote(id, user.id, dto.vote);
  }

  /**
   * GET /api/v1/submissions/pending
   *
   * All pending submissions — admin view. REVIEWER+ only.
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
   * Admin emergency override — bypasses DAO quorum/threshold.
   * Atomically mints 50 INK + Contributor badge via a single PTB.
   * MODERATOR+ admin only.
   */
  @Post(':id/approve')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @RequireRole(AdminRole.MODERATOR)
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ actionType: 'SUBMISSION_APPROVE', targetType: 'Submission' })
  @HttpCode(HttpStatus.OK)
  async adminApprove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionDto> {
    return this.submissionService.adminApprove(id);
  }

  /**
   * POST /api/v1/submissions/:id/reject
   *
   * Admin emergency override — bypasses DAO voting window.
   * Postgres only — no chain call. MODERATOR+ admin only.
   */
  @Post(':id/reject')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @RequireRole(AdminRole.MODERATOR)
  @UseInterceptors(AuditLogInterceptor)
  @AuditLog({ actionType: 'SUBMISSION_REJECT', targetType: 'Submission' })
  @HttpCode(HttpStatus.OK)
  async adminReject(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionDto> {
    return this.submissionService.adminReject(id);
  }
}
