import { z } from "zod";
import { FormatType } from "./series";

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

// ─── Zod validation schemas ───────────────────────────────────────────────────

export const createJournalSchema = z.object({
  externalTitle: z.string().min(1, "Title is required").max(500),
  formatType: z.coerce.number().int().min(0).max(4).transform((n) => n as FormatType),
  externalUrl: z.string().url("Must be a valid URL").max(2000),
  totalChapters: z.coerce.number().int().min(0).default(0),
  currentChapter: z.coerce.number().int().min(0).default(0),
  notes: z.string().max(5000, "Notes must be under 5000 characters").optional(),
});

export const updateJournalSchema = z.object({
  currentChapter: z.coerce.number().int().min(0),
  totalChapters: z.coerce.number().int().min(0),
  notes: z.string().max(5000, "Notes must be under 5000 characters"),
});
