import { create } from "zustand";
import {
  getOwnSeries,
  createSeries,
  updateSeries,
} from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import type { SeriesDto } from "@/lib/types/series";
import type { CreateSeriesPayload, UpdateSeriesPayload } from "@/lib/types/creator";

interface CreatorState {
  series: SeriesDto[];
  loading: boolean;
  error: string | null;

  fetchOwnSeries: () => Promise<void>;
  createSeries: (payload: CreateSeriesPayload) => Promise<SeriesDto>;
  updateSeries: (seriesId: string, payload: UpdateSeriesPayload) => Promise<SeriesDto>;
  reset: () => void;
}

export const useCreatorStore = create<CreatorState>((set, get) => ({
  series: [],
  loading: false,
  error: null,

  fetchOwnSeries: async () => {
    set({ loading: true, error: null });
    try {
      const series = await getOwnSeries();
      set({ series, loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
    }
  },

  createSeries: async (payload) => {
    const series = await createSeries(payload);
    set((state) => ({ series: [series, ...state.series] }));
    return series;
  },

  updateSeries: async (seriesId, payload) => {
    const updated = await updateSeries(seriesId, payload);
    set((state) => ({
      series: state.series.map((s) => (s.id === seriesId ? updated : s)),
    }));
    return updated;
  },

  reset: () => set({ series: [], loading: false, error: null }),
}));
