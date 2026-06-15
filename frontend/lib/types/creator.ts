import type { SeriesDto } from "./series";

export type { SeriesDto };

export const SeriesStatus = {
  ONGOING: "ongoing",
  COMPLETED: "completed",
  HIATUS: "hiatus",
  CANCELLED: "cancelled",
} as const;
export type SeriesStatus = (typeof SeriesStatus)[keyof typeof SeriesStatus];

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
