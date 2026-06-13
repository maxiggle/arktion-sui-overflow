import { create } from "zustand";
import {
  getReadingRecords,
  upsertReadingRecord,
  deleteReadingRecord,
} from "@/lib/api/reading";
import { getErrorMessage } from "@/lib/api/client";
import type {
  ReadingRecordDto,
  ReadingStatus,
  UpsertReadingRecordDto,
} from "@/lib/types/reading";

interface ReadingState {
  records: ReadingRecordDto[];

  isLoading: boolean;
  error: string | null;

  fetchRecords: (status?: ReadingStatus) => Promise<void>;
  upsert: (dto: UpsertReadingRecordDto) => Promise<ReadingRecordDto>;
  remove: (seriesId: string) => Promise<void>;
  reset: () => void;
}

export const useReadingStore = create<ReadingState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,

  fetchRecords: async (status) => {
    set({ isLoading: true, error: null });
    try {
      const records = await getReadingRecords(status);
      set({ records, isLoading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoading: false });
    }
  },

  upsert: async (dto) => {
    const record = await upsertReadingRecord(dto);

    set((state) => {
      const idx = state.records.findIndex((r) => r.seriesId === dto.seriesId);
      const next =
        idx >= 0
          ? state.records.map((r, i) => (i === idx ? record : r))
          : [record, ...state.records];
      return { records: next };
    });
    return record;
  },

  remove: async (seriesId) => {
    await deleteReadingRecord(seriesId);
    set((state) => ({
      records: state.records.filter((r) => r.seriesId !== seriesId),
    }));
  },

  reset: () => set({ records: [], isLoading: false, error: null }),
}));
