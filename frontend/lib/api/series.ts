import { apiClient } from "./client";
import type {
  SeriesDto,
  SeriesPage,
  SeriesQuery,
  ChapterDto,
  PageDto,
} from "@/lib/types/series";

export async function getSeries(query: SeriesQuery = {}): Promise<SeriesPage> {
  const { data } = await apiClient.get<SeriesPage>("/series", {
    params: query,
  });
  return data;
}

export async function getSeriesById(id: string): Promise<SeriesDto> {
  const { data } = await apiClient.get<SeriesDto>(`/series/${id}`);
  return data;
}

export async function getChapters(
  seriesId: string,
  language = "en",
  refresh = false
): Promise<ChapterDto[]> {
  const { data } = await apiClient.get<ChapterDto[]>(
    `/series/${seriesId}/chapters`,
    { params: { language, refresh } }
  );
  return data;
}

export async function getPages(
  chapterId: string,
  dataSaver = false
): Promise<PageDto[]> {
  const { data } = await apiClient.get<PageDto[]>(
    `/chapters/${chapterId}/pages`,
    { params: { dataSaver } }
  );
  return data;
}
