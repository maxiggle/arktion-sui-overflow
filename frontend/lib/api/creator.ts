import { apiClient } from "./client";
import type { SeriesDto } from "@/lib/types/series";
import type {
  CreatorProfileDto,
  CreateSeriesPayload,
  UpdateSeriesPayload,
  ApplyCreatorPayload,
  CreatorApplicationStatusDto,
  CreatorChapterDto,
  CreateChapterPayload,
  CreatorEarningsDto,
} from "@/lib/types/creator";

export async function getApplicationStatus(): Promise<CreatorApplicationStatusDto> {
  const { data } = await apiClient.get<CreatorApplicationStatusDto>(
    "/creator/application/status"
  );
  return data;
}

export async function applyAsCreator(
  payload: ApplyCreatorPayload
): Promise<CreatorApplicationStatusDto> {
  const { data } = await apiClient.post<CreatorApplicationStatusDto>(
    "/creator/apply",
    payload
  );
  return data;
}

export async function getOwnSeries(): Promise<SeriesDto[]> {
  const { data } = await apiClient.get<SeriesDto[]>("/creator/series");
  return data;
}

export async function createSeries(
  payload: CreateSeriesPayload
): Promise<SeriesDto> {
  const { data } = await apiClient.post<SeriesDto>("/creator/series", payload);
  return data;
}

export async function updateSeries(
  seriesId: string,
  payload: UpdateSeriesPayload
): Promise<SeriesDto> {
  const { data } = await apiClient.patch<SeriesDto>(
    `/creator/series/${seriesId}`,
    payload
  );
  return data;
}

export async function getCreatorProfile(
  creatorId: string
): Promise<CreatorProfileDto> {
  const { data } = await apiClient.get<CreatorProfileDto>(
    `/creator/profile/${creatorId}`
  );
  return data;
}

export async function getCreatorSeriesChapters(
  seriesId: string
): Promise<CreatorChapterDto[]> {
  const { data } = await apiClient.get<CreatorChapterDto[]>(
    `/creator/series/${seriesId}/chapters`
  );
  return data;
}

export async function createCreatorChapter(
  seriesId: string,
  payload: CreateChapterPayload
): Promise<CreatorChapterDto> {
  const { data } = await apiClient.post<CreatorChapterDto>(
    `/creator/series/${seriesId}/chapters`,
    payload
  );
  return data;
}

export async function getCreatorEarnings(): Promise<CreatorEarningsDto> {
  const { data } = await apiClient.get<CreatorEarningsDto>("/creator/earnings");
  return data;
}

export async function uploadCreatorFile(
  file: File
): Promise<{ blobId: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await apiClient.post<{ blobId: string; url: string }>(
    "/creator/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function assistWriting(
  seriesId: string,
  prompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  model?: string
): Promise<{ answer: string; memoriesUsed: number }> {
  const { data } = await apiClient.post<{
    answer: string;
    memoriesUsed: number;
  }>(`/creator/series/${seriesId}/ai/assist`, {
    prompt,
    history,
    ...(model ? { model } : {}),
  });
  return data;
}

export async function getCreatorPublicSeries(
  creatorId: string
): Promise<SeriesDto[]> {
  const { data } = await apiClient.get<SeriesDto[]>(
    `/creator/profile/${creatorId}/series`
  );
  return data;
}

export async function assistWriting(
  seriesId: string,
  prompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  model?: string
): Promise<{ answer: string; memoriesUsed: number }> {
  const { data } = await apiClient.post<{ answer: string; memoriesUsed: number }>(
    `/creator/series/${seriesId}/ai/assist`,
    { prompt, history, ...(model ? { model } : {}) }
  );
  return data;
}
