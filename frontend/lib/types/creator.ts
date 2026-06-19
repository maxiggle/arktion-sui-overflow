import type { SeriesDto } from "./series";

export type { SeriesDto };

export type CreatorStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export const Cadence = {
  WEEKLY: "weekly",
  BI_WEEKLY: "bi-weekly",
  MONTHLY: "monthly",
  ONE_SHOT: "one-shot",
} as const;
export type Cadence = (typeof Cadence)[keyof typeof Cadence];

export interface CreatorApplicationStatusDto {
  status: CreatorStatus;
  submittedAt: string | null;
}

export interface ApplyCreatorPayload {
  pitch: string;
  cadence: Cadence;
  tooling: string;
  portfolioUrl?: string;
}

export const SeriesStatus = {
  DRAFT: "draft",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  HIATUS: "hiatus",
  CANCELLED: "cancelled",
} as const;
export type SeriesStatus = (typeof SeriesStatus)[keyof typeof SeriesStatus];

/** Statuses that make a series publicly visible. */
export const PUBLIC_STATUSES = new Set<SeriesStatus>([
  SeriesStatus.ONGOING,
  SeriesStatus.COMPLETED,
  SeriesStatus.HIATUS,
  SeriesStatus.CANCELLED,
]);

export interface CreatorProfileDto {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string;
  seriesCount: number;
  createdAt: string;
}

export interface CreateSeriesPayload {
  title: string;
  formatType: number;
  sourceLanguage: string;
  description?: string;
  coverUrl?: string;
  status?: SeriesStatus;
}

export interface UpdateSeriesPayload {
  title?: string;
  formatType?: number;
  sourceLanguage?: string;
  description?: string;
  coverUrl?: string;
  status?: SeriesStatus;
}

export interface CreatorChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string | null;
  pageCount: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface CreateChapterPayload {
  chapterNumber: number;
  title?: string;
  /** Image-based formats: ordered Walrus image URLs. */
  pages?: string[];
  /** Novel format: Walrus blob URL for the chapter markdown text. */
  contentUrl?: string;
  /** Raw markdown — sent alongside contentUrl to index in MemWal for the AI assistant. */
  content?: string;
}

export interface EarningsTipDto {
  id: string;
  amountUsdc: string;
  seriesTitle: string;
  senderDisplayName: string | null;
  createdAt: string;
}

export interface CreatorEarningsDto {
  totalUsdcReceived: string;
  recentTips: EarningsTipDto[];
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistResult {
  answer: string;
  memoriesUsed: number;
}
