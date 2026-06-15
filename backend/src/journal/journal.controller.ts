import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JournalService } from './journal.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import type { JournalEntryDto } from './dto/journal-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

@Controller('journal')
@UseGuards(JwtAuthGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  /**
   * POST /api/v1/journal/entries
   *
   * Add an external series to the user's journal.
   */
  @Post('entries')
  async createEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalEntryDto,
  ): Promise<JournalEntryDto> {
    return this.journalService.createEntry(user.id, dto);
  }

  /**
   * GET /api/v1/journal/entries
   *
   * All journal entries for the authenticated user, newest first.
   */
  @Get('entries')
  async getEntries(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<JournalEntryDto[]> {
    return this.journalService.getEntries(user.id);
  }

  /**
   * PATCH /api/v1/journal/entries/:entryId
   *
   * Update reading progress or notes for a journal entry.
   */
  @Patch('entries/:entryId')
  async updateEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entryId') entryId: string,
    @Body() dto: UpdateJournalEntryDto,
  ): Promise<JournalEntryDto> {
    return this.journalService.updateEntry(user.id, entryId, dto);
  }

  /**
   * DELETE /api/v1/journal/entries/:entryId
   *
   * Remove an entry from the journal. Hard delete.
   */
  @Delete('entries/:entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('entryId') entryId: string,
  ): Promise<void> {
    return this.journalService.deleteEntry(user.id, entryId);
  }
}
