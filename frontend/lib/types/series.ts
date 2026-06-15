export const FormatType = {
  NOVEL: 0,
  MANGA: 1,
  MANHWA: 2,
  MANHUA: 3,
  WEBTOON: 4,
} as const;
export type FormatType = (typeof FormatType)[keyof typeof FormatType];

export const FORMAT_LABELS: Record<FormatType, string> = {
  [FormatType.NOVEL]: "Novel",
  [FormatType.MANGA]: "Manga",
  [FormatType.MANHWA]: "Manhwa",
  [FormatType.MANHUA]: "Manhua",
  [FormatType.WEBTOON]: "Webtoon",
};

export interface SeriesDto {
  id: string;
  externalId: string;
  title: string;
  formatType: FormatType;
  sourceLanguage: string;
  coverUrl: string | null;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface SeriesPage {
  data: SeriesDto[];
  total: number;
  page: number;
  limit: number;
}

export interface SeriesQuery {
  formatType?: FormatType;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ChapterDto {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string | null;
  language: string;
  pageCount: number;
  isLicensed: boolean;
  inkCost: number;
  publishedAt: string | null;
}

/** Matches the backend PageDto: { pageNumber, imageUrl } */
export interface PageDto {
  pageNumber: number;
  imageUrl: string;
}
