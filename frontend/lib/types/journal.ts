import type { FormatType } from "./series";

export interface JournalEntryDto {
  id: string;
  entryId: string;
  externalTitle: string;
  formatType: FormatType;
  externalUrl: string;
  totalChapters: number;
  currentChapter: number;
  notes: string | null;
  submittedAsSuggestion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalEntryDto {
  externalTitle: string;
  formatType: FormatType;
  externalUrl: string;
  totalChapters: number;
  currentChapter?: number;
  notes?: string;
}

export interface UpdateJournalEntryDto {
  currentChapter?: number;
  notes?: string;
  totalChapters?: number;
}
