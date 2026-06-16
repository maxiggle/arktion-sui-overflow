import { create } from "zustand";
import {
  getOwnSeries,
  createSeries,
  updateSeries,
  applyAsCreator as apiApplyAsCreator,
  getApplicationStatus,
} from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import type { SeriesDto } from "@/lib/types/series";
import type {
  CreateSeriesPayload,
  UpdateSeriesPayload,
  ApplyCreatorPayload,
  CreatorStatus,
} from "@/lib/types/creator";

interface CreatorState {
  series: SeriesDto[];
  loading: boolean;
  error: string | null;
  creatorStatus: CreatorStatus;

  fetchOwnSeries: () => Promise<void>;
  createSeries: (payload: CreateSeriesPayload) => Promise<SeriesDto>;
  updateSeries: (seriesId: string, payload: UpdateSeriesPayload) => Promise<SeriesDto>;
  applyAsCreator: (payload: ApplyCreatorPayload) => Promise<void>;
  checkApplicationStatus: () => Promise<void>;
  reset: () => void;
}

export const useCreatorStore = create<CreatorState>((set) => ({
  series: [],
  loading: false,
  error: null,
  creatorStatus: "NONE",

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

  applyAsCreator: async (payload) => {
    await apiApplyAsCreator(payload);
  },

  checkApplicationStatus: async () => {
    try {
      const { status } = await getApplicationStatus();
      set({ creatorStatus: status });
    } catch {}
  },

  reset: () => set({ series: [], loading: false, error: null, creatorStatus: "NONE" }),
}));
