import { create } from "zustand";
import { getInkBalance, getInkLedger } from "@/lib/api/ink";
import { getErrorMessage } from "@/lib/api/client";
import type { InkBalanceDto, InkLedgerPage } from "@/lib/types/ink";

interface InkState {
  balance: InkBalanceDto | null;
  ledger: InkLedgerPage | null;

  balanceLoading: boolean;
  ledgerLoading: boolean;
  balanceError: string | null;
  ledgerError: string | null;

  fetchBalance: () => Promise<void>;
  fetchLedger: (page?: number, limit?: number) => Promise<void>;
  reset: () => void;
}

const INITIAL: Pick<
  InkState,
  | "balance"
  | "ledger"
  | "balanceLoading"
  | "ledgerLoading"
  | "balanceError"
  | "ledgerError"
> = {
  balance: null,
  ledger: null,
  balanceLoading: false,
  ledgerLoading: false,
  balanceError: null,
  ledgerError: null,
};

export const useInkStore = create<InkState>((set) => ({
  ...INITIAL,

  fetchBalance: async () => {
    set({ balanceLoading: true, balanceError: null });
    try {
      const balance = await getInkBalance();
      set({ balance, balanceLoading: false });
    } catch (err) {
      set({ balanceError: getErrorMessage(err), balanceLoading: false });
    }
  },

  fetchLedger: async (page = 1, limit = 20) => {
    set({ ledgerLoading: true, ledgerError: null });
    try {
      const ledger = await getInkLedger(page, limit);
      set({ ledger, ledgerLoading: false });
    } catch (err) {
      set({ ledgerError: getErrorMessage(err), ledgerLoading: false });
    }
  },

  reset: () => set(INITIAL),
}));
