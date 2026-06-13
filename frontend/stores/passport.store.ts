import { create } from "zustand";
import { getMyPassport, takeSnapshot } from "@/lib/api/passport";
import { getErrorMessage } from "@/lib/api/client";
import type { PassportDto, SnapshotResult } from "@/lib/types/passport";

interface PassportState {
  passport: PassportDto | null;
  snapshot: SnapshotResult | null;

  isLoading: boolean;
  isSnapshoting: boolean;
  error: string | null;
  snapshotError: string | null;

  fetchPassport: () => Promise<void>;
  exportSnapshot: () => Promise<SnapshotResult | null>;
  reset: () => void;
}

export const usePassportStore = create<PassportState>((set) => ({
  passport: null,
  snapshot: null,
  isLoading: false,
  isSnapshoting: false,
  error: null,
  snapshotError: null,

  fetchPassport: async () => {
    set({ isLoading: true, error: null });
    try {
      const passport = await getMyPassport();
      set({ passport, isLoading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoading: false });
    }
  },

  exportSnapshot: async () => {
    set({ isSnapshoting: true, snapshotError: null });
    try {
      const snapshot = await takeSnapshot();
      set({ snapshot, isSnapshoting: false });
      return snapshot;
    } catch (err) {
      set({ snapshotError: getErrorMessage(err), isSnapshoting: false });
      return null;
    }
  },

  reset: () =>
    set({
      passport: null,
      snapshot: null,
      isLoading: false,
      isSnapshoting: false,
      error: null,
      snapshotError: null,
    }),
}));
