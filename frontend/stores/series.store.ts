import { create } from "zustand";
import {
  getSeries,
  getSeriesById,
  getChapters,
  getPages,
} from "@/lib/api/series";
import { getErrorMessage } from "@/lib/api/client";
import type {
  SeriesDto,
  SeriesPage,
  SeriesQuery,
  ChapterDto,
  PageDto,
} from "@/lib/types/series";

interface SeriesState {
  page: SeriesPage | null;
  query: SeriesQuery;
  listLoading: boolean;
  listError: string | null;

  current: SeriesDto | null;
  chapters: ChapterDto[];
  detailLoading: boolean;
  detailError: string | null;

  pages: PageDto[];
  pagesLoading: boolean;
  pagesError: string | null;

  fetchSeries: (query?: SeriesQuery) => Promise<void>;
  setQuery: (patch: Partial<SeriesQuery>) => void;
  fetchSeriesById: (id: string) => Promise<void>;
  fetchChapters: (seriesId: string, language?: string) => Promise<void>;
  fetchPages: (chapterId: string, dataSaver?: boolean) => Promise<void>;
  reset: () => void;
}

const INITIAL_QUERY: SeriesQuery = { page: 1, limit: 20 };

export const useSeriesStore = create<SeriesState>((set, get) => ({
  page: null,
  query: INITIAL_QUERY,
  listLoading: false,
  listError: null,

  current: null,
  chapters: [],
  detailLoading: false,
  detailError: null,

  pages: [],
  pagesLoading: false,
  pagesError: null,

  fetchSeries: async (query) => {
    const merged = { ...get().query, ...query };
    set({ query: merged, listLoading: true, listError: null });
    try {
      const page = await getSeries(merged);
      set({ page, listLoading: false });
    } catch (err) {
      set({ listError: getErrorMessage(err), listLoading: false });
    }
  },

  setQuery: (patch) => {
    set((state) => ({ query: { ...state.query, ...patch } }));
  },

  fetchSeriesById: async (id) => {
    set({
      detailLoading: true,
      detailError: null,
      current: null,
      chapters: [],
    });
    try {
      const current = await getSeriesById(id);
      set({ current, detailLoading: false });
    } catch (err) {
      set({ detailError: getErrorMessage(err), detailLoading: false });
    }
  },

  fetchChapters: async (seriesId, language = "en") => {
    try {
      const chapters = await getChapters(seriesId, language);
      set({ chapters });
    } catch {}
  },

  fetchPages: async (chapterId, dataSaver = false) => {
    set({ pagesLoading: true, pagesError: null, pages: [] });
    try {
      const pages = await getPages(chapterId, dataSaver);
      set({ pages, pagesLoading: false });
    } catch (err) {
      set({ pagesError: getErrorMessage(err), pagesLoading: false });
    }
  },

  reset: () =>
    set({
      page: null,
      query: INITIAL_QUERY,
      listLoading: false,
      listError: null,
      current: null,
      chapters: [],
      detailLoading: false,
      detailError: null,
      pages: [],
      pagesLoading: false,
      pagesError: null,
    }),
}));
