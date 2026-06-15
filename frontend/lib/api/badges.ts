import { apiClient } from "./client";
import type { BadgeDto } from "@/lib/types/badges";

export async function getMyBadges(): Promise<BadgeDto[]> {
  const { data } = await apiClient.get<BadgeDto[]>("/badges");
  return data;
}
