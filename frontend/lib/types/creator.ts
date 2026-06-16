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

export enum Cadence {
  WEEKLY = "weekly",
  BI_WEEKLY = "bi-weekly",
  MONTHLY = "monthly",
  ONE_SHOT = "one-shot",
}

export interface ApplyCreatorPayload {
  pitch: string;
  cadence: Cadence;
  tooling: string;
  portfolioUrl?: string;
}

export type CreatorStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
