import { apiClient } from "./client";
import type {
  ReadingRecordDto,
  ReadingStatus,
  UpsertReadingRecordDto,
} from "@/lib/types/reading";

export async function getReadingRecords(
  status?: ReadingStatus
): Promise<ReadingRecordDto[]> {
  const { data } = await apiClient.get<ReadingRecordDto[]>("/reading/records", {
    params: status !== undefined ? { status } : undefined,
  });
  return data;
}

export async function getReadingRecord(
  seriesId: string
): Promise<ReadingRecordDto> {
  const { data } = await apiClient.get<ReadingRecordDto>(
    `/reading/records/${seriesId}`
  );
  return data;
}

export async function upsertReadingRecord(
  dto: UpsertReadingRecordDto
): Promise<ReadingRecordDto> {
  const { data } = await apiClient.post<ReadingRecordDto>(
    "/reading/records",
    dto
  );
  return data;
}

export async function deleteReadingRecord(seriesId: string): Promise<void> {
  await apiClient.delete(`/reading/records/${seriesId}`);
}
