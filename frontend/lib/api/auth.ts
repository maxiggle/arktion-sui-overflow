import { apiClient } from "./client";

export async function getEpoch(): Promise<{ epoch: number; maxEpoch: number }> {
  const { data } = await apiClient.get<{ epoch: number; maxEpoch: number }>(
    "/auth/epoch",
  );
  return data;
}
