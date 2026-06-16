import { create } from "zustand";
import {
  getOwnSeries,
  createSeries,
  updateSeries,
  getApplicationStatus,
  applyAsCreator,
  getCreatorSeriesChapters,
} from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import type { SeriesDto } from "@/lib/types/series";
import type {
  CreateSeriesPayload,
  UpdateSeriesPayload,
  ApplyCreatorPayload,
  CreatorApplicationStatusDto,
  CreatorStatus,
  CreatorChapterDto,
} from "@/lib/types/creator";

interface CreatorState {
  creatorStatus: CreatorStatus;
  applicationChecked: boolean;
  applicationLoading: boolean;

  series: SeriesDto[];
  loading: boolean;
  error: string | null;

  chaptersBySeriesId: Record<string, CreatorChapterDto[]>;
  chaptersLoading: Record<string, boolean>;

  checkApplicationStatus: () => Promise<void>;
  applyAsCreator: (payload: ApplyCreatorPayload) => Promise<CreatorApplicationStatusDto>;
  fetchOwnSeries: () => Promise<void>;
  createSeries: (payload: CreateSeriesPayload) => Promise<SeriesDto>;
  updateSeries: (seriesId: string, payload: UpdateSeriesPayload) => Promise<SeriesDto>;
  fetchChapters: (seriesId: string) => Promise<void>;
  addChapterToSeries: (chapter: CreatorChapterDto) => void;
  reset: () => void;
}

export const useCreatorStore = create<CreatorState>((set, get) => ({
  creatorStatus: "NONE",
  applicationChecked: false,
  applicationLoading: false,

  series: [],
  loading: false,
  error: null,

  chaptersBySeriesId: {},
  chaptersLoading: {},

  checkApplicationStatus: async () => {
    if (get().applicationChecked) return;
    set({ applicationLoading: true });
    try {
      const result = await getApplicationStatus();
      set({
        creatorStatus: result.status,
        applicationChecked: true,
        applicationLoading: false,
      });
    } catch {
      set({ applicationLoading: false });
    }
  },

  applyAsCreator: async (payload) => {
    const result = await applyAsCreator(payload);
    set({ creatorStatus: result.status, applicationChecked: true });
    return result;
  },

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

  fetchChapters: async (seriesId) => {
    set((state) => ({
      chaptersLoading: { ...state.chaptersLoading, [seriesId]: true },
    }));
    try {
      const chapters = await getCreatorSeriesChapters(seriesId);
      set((state) => ({
        chaptersBySeriesId: { ...state.chaptersBySeriesId, [seriesId]: chapters },
        chaptersLoading: { ...state.chaptersLoading, [seriesId]: false },
      }));
    } catch {
      set((state) => ({
        chaptersBySeriesId: { ...state.chaptersBySeriesId, [seriesId]: [] },
        chaptersLoading: { ...state.chaptersLoading, [seriesId]: false },
      }));
    }
  },

  addChapterToSeries: (chapter) => {
    set((state) => {
      const existing = state.chaptersBySeriesId[chapter.seriesId] ?? [];
      return {
        chaptersBySeriesId: {
          ...state.chaptersBySeriesId,
          [chapter.seriesId]: [...existing, chapter].sort(
            (a, b) => a.chapterNumber - b.chapterNumber
          ),
        },
      };
    });
  },

  reset: () =>
    set({
      creatorStatus: "NONE",
      applicationChecked: false,
      applicationLoading: false,
      series: [],
      loading: false,
      error: null,
      chaptersBySeriesId: {},
      chaptersLoading: {},
    }),
}));
