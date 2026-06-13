import { apiClient } from "./client";
import type { PassportDto, SnapshotResult } from "@/lib/types/passport";

export async function getMyPassport(): Promise<PassportDto> {
  const { data } = await apiClient.get<PassportDto>("/passport/me");
  return data;
}

export async function takeSnapshot(): Promise<SnapshotResult> {
  const { data } = await apiClient.post<SnapshotResult>("/passport/snapshot");
  return data;
}
