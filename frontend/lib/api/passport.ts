import { apiClient } from "./client";
import type {
  PassportDto,
  SnapshotResult,
  BuildSyncResponse,
  SubmitSyncResponse,
} from "@/lib/types/passport";

export async function getMyPassport(): Promise<PassportDto> {
  const { data } = await apiClient.get<PassportDto>("/passport/me");
  return data;
}

export async function takeSnapshot(): Promise<SnapshotResult> {
  const { data } = await apiClient.post<SnapshotResult>("/passport/snapshot");
  return data;
}

export async function buildPassportSync(): Promise<BuildSyncResponse> {
  const { data } = await apiClient.post<BuildSyncResponse>(
    "/passport/sync/build",
  );
  return data;
}

export async function submitPassportSync(params: {
  txBytes: string;
  userSignature: string;
}): Promise<SubmitSyncResponse> {
  const { data } = await apiClient.post<SubmitSyncResponse>(
    "/passport/sync/submit",
    params,
  );
  return data;
}
