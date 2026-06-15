export const InkTrigger = {
  CHAPTER_READ: 0,
  SERIES_COMPLETE: 1,
  SUBMISSION_APPROVED: 2,
} as const;

export const INK_TRIGGER_LABELS: Record<number, string> = {
  0: "Chapter Read",
  1: "Series Completed",
  2: "Submission Approved",
};

export interface InkBalanceDto {
  balance: string;
  level: number;
  totalInkEarned: string;
}

export interface InkLedgerEntryDto {
  id: string;
  actionType: number;
  amount: string;
  idempotencyKey: string;
  suiTxDigest: string | null;
  createdAt: string;
}

export interface InkLedgerPage {
  data: InkLedgerEntryDto[];
  total: number;
  page: number;
  limit: number;
}

/** Level thresholds (total INK earned). Index = level - 1. */
export const LEVEL_THRESHOLDS = [0, 500, 2000, 6000, 15000, 40000] as const;

export function inkToNextLevel(level: number, totalEarned: number): number {
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;
  if (!nextThreshold) return 0;
  return Math.max(0, nextThreshold - totalEarned);
}
