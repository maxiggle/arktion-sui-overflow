export interface ReadingRecordDto {
  id: string;
  seriesId: string;
  status: number;
  currentChapter: number;
  lastReadAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}
