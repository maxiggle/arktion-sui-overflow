import { create } from "zustand";
import {
  getMyPassport,
  takeSnapshot,
  buildPassportSync,
  submitPassportSync,
} from "@/lib/api/passport";
import { getErrorMessage } from "@/lib/api/client";
import { getEpoch } from "@/lib/api/auth";
import { getZkState, signWithZkLogin } from "@/lib/zklogin";
import type { PassportDto, SnapshotResult } from "@/lib/types/passport";

export type SyncStage =
  | "idle"
  | "building"
  | "signing"
  | "submitting"
  | "success"
  | "error";

interface PassportState {
  passport: PassportDto | null;
  snapshot: SnapshotResult | null;

  isLoading: boolean;
  isSnapshoting: boolean;
  error: string | null;
  snapshotError: string | null;

  syncStage: SyncStage;
  syncTxDigest: string | null;
  syncError: string | null;

  fetchPassport: () => Promise<void>;
  exportSnapshot: () => Promise<SnapshotResult | null>;
  syncOnChain: () => Promise<void>;
  resetSync: () => void;
  reset: () => void;
}

const SESSION_EXPIRED =
  "Your signing session has expired. Sign out and sign in again to sync.";

export const usePassportStore = create<PassportState>((set, get) => ({
  passport: null,
  snapshot: null,
  isLoading: false,
  isSnapshoting: false,
  error: null,
  snapshotError: null,
  syncStage: "idle",
  syncTxDigest: null,
  syncError: null,

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

  syncOnChain: async () => {
    set({ syncStage: "building", syncError: null, syncTxDigest: null });
    try {
      const zkState = getZkState();
      if (!zkState) {
        set({ syncStage: "error", syncError: SESSION_EXPIRED });
        return;
      }
      const { epoch } = await getEpoch();
      if (epoch > zkState.maxEpoch) {
        set({ syncStage: "error", syncError: SESSION_EXPIRED });
        return;
      }

      const { txBytes } = await buildPassportSync();

      set({ syncStage: "signing" });
      const txBytesUint8 = Uint8Array.from(Buffer.from(txBytes, "base64"));
      const userSignature = await signWithZkLogin(txBytesUint8, zkState);

      set({ syncStage: "submitting" });
      const { txDigest } = await submitPassportSync({ txBytes, userSignature });

      set({ syncStage: "success", syncTxDigest: txDigest });
      // Refresh so lastSyncedAt and any derived state update.
      await get().fetchPassport();
    } catch (err) {
      set({ syncStage: "error", syncError: getErrorMessage(err) });
    }
  },

  resetSync: () =>
    set({ syncStage: "idle", syncTxDigest: null, syncError: null }),

  reset: () =>
    set({
      passport: null,
      snapshot: null,
      isLoading: false,
      isSnapshoting: false,
      error: null,
      snapshotError: null,
      syncStage: "idle",
      syncTxDigest: null,
      syncError: null,
    }),
}));
