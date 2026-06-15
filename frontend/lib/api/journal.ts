import { apiClient } from "./client";
import type {
  JournalEntryDto,
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
} from "@/lib/types/journal";

export async function getJournalEntries(): Promise<JournalEntryDto[]> {
  const { data } = await apiClient.get<JournalEntryDto[]>("/journal/entries");
  return data;
}

export async function createJournalEntry(
  dto: CreateJournalEntryDto
): Promise<JournalEntryDto> {
  const { data } = await apiClient.post<JournalEntryDto>(
    "/journal/entries",
    dto
  );
  return data;
}

export async function updateJournalEntry(
  entryId: string,
  dto: UpdateJournalEntryDto
): Promise<JournalEntryDto> {
  const { data } = await apiClient.patch<JournalEntryDto>(
    `/journal/entries/${entryId}`,
    dto
  );
  return data;
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  await apiClient.delete(`/journal/entries/${entryId}`);
}
