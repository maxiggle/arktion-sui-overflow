import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JournalEntryDto } from './dto/journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';

export type { CreateJournalEntryDto, JournalEntryDto, UpdateJournalEntryDto };

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new external series journal entry.
   *
   * Phase 1: Postgres only. The on-chain journal::add_entry call requires
   * ctx.sender() == journal.owner (user must sign). User-signed PTBs are
   * wired in Batch 4. The UserJournal on-chain object is the ownership anchor;
   * Postgres is the authoritative data store.
   *
   * entryId is a UUID generated here, used as the dynamic field key in the
   * on-chain journal object when Batch 4 syncs the entry.
   */
  async createEntry(
    userId: string,
    dto: CreateJournalEntryDto,
  ): Promise<JournalEntryDto> {
    const entryId = crypto.randomUUID();

    const entry = await this.prisma.journalEntry.create({
      data: {
        userId,
        entryId,
        externalTitle: dto.externalTitle,
        formatType: dto.formatType,
        externalUrl: dto.externalUrl,
        totalChapters: dto.totalChapters,
        currentChapter: dto.currentChapter,
        notes: dto.notes ?? null,
      },
    });

    return this.toDto(entry);
  }

  /** All journal entries for a user, newest first. */
  async getEntries(userId: string): Promise<JournalEntryDto[]> {
    const entries = await this.prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return entries.map((entry) => this.toDto(entry));
  }

  /**
   * Update progress/notes for an existing journal entry.
   * Only the entry owner can update (enforced via userId scope on query).
   */
  async updateEntry(
    userId: string,
    entryId: string,
    dto: UpdateJournalEntryDto,
  ): Promise<JournalEntryDto> {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { userId_entryId: { userId, entryId } },
    });

    if (!existing) {
      throw new NotFoundException(`Journal entry ${entryId} not found`);
    }

    const updated = await this.prisma.journalEntry.update({
      where: { userId_entryId: { userId, entryId } },
      data: {
        ...(dto.currentChapter !== undefined && {
          currentChapter: dto.currentChapter,
        }),
        ...(dto.totalChapters !== undefined && {
          totalChapters: dto.totalChapters,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return this.toDto(updated);
  }

  /**
   * Hard delete a journal entry.
   * Journal entries are user-controlled data — no soft delete needed.
   */
  async deleteEntry(userId: string, entryId: string): Promise<void> {
    const existing = await this.prisma.journalEntry.findUnique({
      where: { userId_entryId: { userId, entryId } },
    });

    if (!existing) {
      throw new NotFoundException(`Journal entry ${entryId} not found`);
    }

    await this.prisma.journalEntry.delete({
      where: { userId_entryId: { userId, entryId } },
    });
  }

  private toDto(entry: {
    id: string;
    entryId: string;
    externalTitle: string;
    formatType: number;
    externalUrl: string;
    totalChapters: number;
    currentChapter: number;
    notes: string | null;
    submittedAsSuggestion: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): JournalEntryDto {
    return {
      id: entry.id,
      entryId: entry.entryId,
      externalTitle: entry.externalTitle,
      formatType: entry.formatType,
      externalUrl: entry.externalUrl,
      totalChapters: entry.totalChapters,
      currentChapter: entry.currentChapter,
      notes: entry.notes,
      submittedAsSuggestion: entry.submittedAsSuggestion,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
