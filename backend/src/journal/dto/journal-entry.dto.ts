export interface JournalEntryDto {
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
}
