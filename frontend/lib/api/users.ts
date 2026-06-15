import { apiClient } from "./client";
import type { AuthUser } from "@/lib/types/auth";

export interface UpdateProfileDto {
  displayName?: string;
  avatarUrl?: string;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/users/me");
  return data;
}

export async function updateProfile(dto: UpdateProfileDto): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>("/users/me", dto);
  return data;
}
