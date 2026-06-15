import { apiClient } from "./client";
import type { SeriesDto } from "@/lib/types/series";
import type {
  CreatorProfileDto,
  CreateSeriesPayload,
  UpdateSeriesPayload,
} from "@/lib/types/creator";

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

export async function getCreatorPublicSeries(
  creatorId: string
): Promise<SeriesDto[]> {
  const { data } = await apiClient.get<SeriesDto[]>(
    `/creator/profile/${creatorId}/series`
  );
  return data;
}
