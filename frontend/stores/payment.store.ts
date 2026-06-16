import { create } from "zustand";
import {
  buildTip,
  confirmTip,
  getTipHistory,
  getUsdcBalance,
  buildSend,
  submitSend,
} from "@/lib/api/payment";
import { getEpoch } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/client";
import { getZkState, signWithZkLogin } from "@/lib/zklogin";
import type { TipHistoryPage } from "@/lib/types/payment";

/** Flow stages used to drive UI state for tip and send flows. */
export type FlowStage =
  | "idle"
  | "building"
  | "signing"
  | "confirming"
  | "success"
  | "error";

/** @deprecated Use FlowStage */
export type TipStage = FlowStage;

interface PaymentState {
  stage: FlowStage;
  txDigest: string | null;
  error: string | null;

  sendStage: FlowStage;
  sendTxDigest: string | null;
  sendError: string | null;

  usdcBalance: string | null;
  usdcBalanceLoading: boolean;
  usdcBalanceError: string | null;

  history: TipHistoryPage | null;
  historyLoading: boolean;
  historyError: string | null;

  /** Execute the full tip flow: build → sign (zkLogin) → confirm. */
  sendTip: (params: {
    seriesId: string;
    amountUsdc: string;
    idempotencyKey: string;
  }) => Promise<void>;

  /** Execute the full USDC send flow: build → sign (zkLogin) → submit. */
  executeSend: (params: {
    recipientAddress: string;
    amountUsdc: string;
  }) => Promise<void>;

  resetSend: () => void;

  fetchUsdcBalance: () => Promise<void>;

  fetchHistory: (
    direction?: "sent" | "received",
    page?: number,
    limit?: number,
  ) => Promise<void>;

  reset: () => void;
}

const INITIAL: Pick<
  PaymentState,
  | "stage"
  | "txDigest"
  | "error"
  | "sendStage"
  | "sendTxDigest"
  | "sendError"
  | "usdcBalance"
  | "usdcBalanceLoading"
  | "usdcBalanceError"
  | "history"
  | "historyLoading"
  | "historyError"
> = {
  stage: "idle",
  txDigest: null,
  error: null,
  sendStage: "idle",
  sendTxDigest: null,
  sendError: null,
  usdcBalance: null,
  usdcBalanceLoading: false,
  usdcBalanceError: null,
  history: null,
  historyLoading: false,
  historyError: null,
};

export const usePaymentStore = create<PaymentState>((set) => ({
  ...INITIAL,

  sendTip: async ({ seriesId, amountUsdc, idempotencyKey }) => {
    set({ stage: "building", error: null, txDigest: null });

    try {
      const zkState = getZkState();
      if (!zkState) {
        set({
          stage: "error",
          error:
            "Your signing session has expired. Sign out and sign in again to enable tipping.",
        });
        return;
      }

      const { epoch } = await getEpoch();
      if (epoch > zkState.maxEpoch) {
        set({
          stage: "error",
          error:
            "Your signing session has expired. Sign out and sign in again to enable tipping.",
        });
        return;
      }

      const { tipTransactionId, txBytes } = await buildTip({
        seriesId,
        amountUsdc,
        idempotencyKey,
      });

      set({ stage: "signing" });

      const txBytesUint8 = Uint8Array.from(Buffer.from(txBytes, "base64"));
      const userSignature = await signWithZkLogin(txBytesUint8, zkState);

      set({ stage: "confirming" });

      const { txDigest } = await confirmTip({
        tipTransactionId,
        txBytes,
        userSignature,
      });

      set({ stage: "success", txDigest });
    } catch (err) {
      set({ stage: "error", error: getErrorMessage(err) });
    }
  },

  executeSend: async ({ recipientAddress, amountUsdc }) => {
    set({ sendStage: "building", sendError: null, sendTxDigest: null });
    console.log("[executeSend] called", { recipientAddress, amountUsdc });
    try {
      const zkState = getZkState();
      console.log("[executeSend] zkState present:", !!zkState, "maxEpoch:", zkState?.maxEpoch);
      if (!zkState) {
        set({
          sendStage: "error",
          sendError:
            "Your signing session has expired. Sign out and sign in again.",
        });
        return;
      }

      const { epoch } = await getEpoch();
      if (epoch > zkState.maxEpoch) {
        set({
          sendStage: "error",
          sendError:
            "Your signing session has expired. Sign out and sign in again.",
        });
        return;
      }

      const { txBytes } = await buildSend({ recipientAddress, amountUsdc });

      set({ sendStage: "signing" });

      const txBytesUint8 = Uint8Array.from(Buffer.from(txBytes, "base64"));
      const userSignature = await signWithZkLogin(txBytesUint8, zkState);

      set({ sendStage: "confirming" });

      const { txDigest } = await submitSend({ txBytes, userSignature });

      set({ sendStage: "success", sendTxDigest: txDigest });
    } catch (err) {
      set({ sendStage: "error", sendError: getErrorMessage(err) });
    }
  },

  resetSend: () =>
    set({ sendStage: "idle", sendTxDigest: null, sendError: null }),

  fetchUsdcBalance: async () => {
    set({ usdcBalanceLoading: true, usdcBalanceError: null });
    try {
      const { balance } = await getUsdcBalance();
      set({ usdcBalance: balance, usdcBalanceLoading: false });
    } catch (err) {
      set({
        usdcBalanceError: getErrorMessage(err),
        usdcBalanceLoading: false,
      });
    }
  },

  fetchHistory: async (direction = "sent", page = 1, limit = 20) => {
    set({ historyLoading: true, historyError: null });
    try {
      const history = await getTipHistory(direction, page, limit);
      set({ history, historyLoading: false });
    } catch (err) {
      set({ historyError: getErrorMessage(err), historyLoading: false });
    }
  },

  reset: () => set(INITIAL),
}));
