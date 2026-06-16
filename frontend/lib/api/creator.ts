import { apiClient } from "./client";
import type { SeriesDto } from "@/lib/types/series";
import type {
  CreatorProfileDto,
  CreateSeriesPayload,
  UpdateSeriesPayload,
  ApplyCreatorPayload,
  CreatorStatus,
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

export async function applyAsCreator(
  payload: ApplyCreatorPayload
): Promise<void> {
  await apiClient.post("/creator/apply", payload);
}

export async function getApplicationStatus(): Promise<{ status: CreatorStatus }> {
  const { data } = await apiClient.get<{ status: CreatorStatus }>(
    "/creator/application/status"
  );
  return data;
}

export async function uploadCreatorFile(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post<{ url: string }>(
    "/creator/upload",
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}
