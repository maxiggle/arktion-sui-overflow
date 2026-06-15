import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { InkService, InkBalanceDto, InkLedgerPage } from './ink.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

class LedgerQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

@Controller('ink')
@UseGuards(JwtAuthGuard)
export class InkController {
  constructor(private readonly inkService: InkService) {}

  /**
   * GET /api/v1/ink/balance
   *
   * Returns the authenticated user's INK balance from the Postgres mirror.
   * Fast path — reads InkBalance + Passport tables, no chain call.
   */
  @Get('balance')
  async getBalance(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InkBalanceDto> {
    return this.inkService.getBalance(user.id);
  }

  /**
   * GET /api/v1/ink/ledger?page=1&limit=20
   *
   * Paginated earning history for the authenticated user, newest first.
   */
  @Get('ledger')
  async getLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LedgerQueryDto,
  ): Promise<InkLedgerPage> {
    return this.inkService.getLedger(user.id, query.page, query.limit);
  }
}
