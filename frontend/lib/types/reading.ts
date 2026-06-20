export const ReadingStatus = {
  READING: 0,
  COMPLETED: 1,
  ON_HOLD: 2,
  DROPPED: 3,
  PLAN_TO_READ: 4,
} as const;
export type ReadingStatus = (typeof ReadingStatus)[keyof typeof ReadingStatus];

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  [ReadingStatus.READING]: "Reading",
  [ReadingStatus.COMPLETED]: "Completed",
  [ReadingStatus.ON_HOLD]: "On Hold",
  [ReadingStatus.DROPPED]: "Dropped",
  [ReadingStatus.PLAN_TO_READ]: "Plan to Read",
};

/**
 * Statuses a reader may set by hand — shelving intent only.
 * "Reading" and "Completed" are derived from actual reading progress (and
 * Completed carries an on-chain reward), so they are never user-selectable.
 */
export const USER_SETTABLE_STATUSES: ReadingStatus[] = [
  ReadingStatus.PLAN_TO_READ,
  ReadingStatus.ON_HOLD,
  ReadingStatus.DROPPED,
];

export interface ReadingRecordDto {
  id: string;
  seriesId: string;
  status: ReadingStatus;
  currentChapter: number;
  lastReadAt: string;
  completedAt: string | null;
  createdAt: string;
}

export interface UpsertReadingRecordDto {
  seriesId: string;
  status: ReadingStatus;
  currentChapter: number;
}
