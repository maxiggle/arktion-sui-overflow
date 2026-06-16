import { create } from "zustand";
import {
  getJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
} from "@/lib/api/journal";
import { getErrorMessage } from "@/lib/api/client";
import type {
  JournalEntryDto,
  CreateJournalEntryDto,
  UpdateJournalEntryDto,
} from "@/lib/types/journal";

interface JournalState {
  entries: JournalEntryDto[];

  isLoading: boolean;
  error: string | null;

  fetchEntries: () => Promise<void>;
  create: (dto: CreateJournalEntryDto) => Promise<JournalEntryDto>;
  update: (
    entryId: string,
    dto: UpdateJournalEntryDto,
  ) => Promise<JournalEntryDto>;
  remove: (entryId: string) => Promise<void>;
  reset: () => void;
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const entries = await getJournalEntries();
      set({ entries, isLoading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoading: false });
    }
  },

  create: async (dto) => {
    const entry = await createJournalEntry(dto);
    set((state) => ({ entries: [entry, ...state.entries] }));
    return entry;
  },

  update: async (entryId, dto) => {
    const updated = await updateJournalEntry(entryId, dto);
    // Match on entryId (the API key), not id (the DB primary key)
    set((state) => ({
      entries: state.entries.map((e) => (e.entryId === entryId ? updated : e)),
    }));
    return updated;
  },

  remove: async (entryId) => {
    await deleteJournalEntry(entryId);
    set((state) => ({
      entries: state.entries.filter((e) => e.entryId !== entryId),
    }));
  },

  reset: () => set({ entries: [], isLoading: false, error: null }),
}));
