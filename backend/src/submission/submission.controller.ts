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
} from '@nestjs/common';

import { SubmissionService } from './submission.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import type { SubmissionDto } from './dto/submission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  /**
   * POST /api/v1/submissions
   *
   * Submit a series suggestion. Open to all authenticated users.
   */
  @Post()
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
  async getMySubmissions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmissionDto[]> {
    return this.submissionService.getMySubmissions(user.id);
  }

  /**
   * GET /api/v1/submissions/pending
   *
   * All pending submissions, oldest first. Admin only.
   */
  @Get('pending')
  @UseGuards(AdminGuard)
  async getPending(): Promise<SubmissionDto[]> {
    return this.submissionService.getPending();
  }

  /**
   * POST /api/v1/submissions/:id/approve
   *
   * Approve a pending submission. Atomically mints 50 INK + Contributor badge
   * for the submitter via a single PTB. Admin only.
   */
  @Post(':id/approve')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubmissionDto> {
    return this.submissionService.approve(id);
  }

  /**
   * POST /api/v1/submissions/:id/reject
   *
   * Reject a pending submission. Postgres only — no chain call. Admin only.
   */
  @Post(':id/reject')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async reject(@Param('id', ParseUUIDPipe) id: string): Promise<SubmissionDto> {
    return this.submissionService.reject(id);
  }
}
