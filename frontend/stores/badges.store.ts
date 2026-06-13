import { create } from "zustand";
import { getMyBadges } from "@/lib/api/badges";
import { getErrorMessage } from "@/lib/api/client";
import type { BadgeDto } from "@/lib/types/badges";

interface BadgesState {
  badges: BadgeDto[];
  isLoading: boolean;
  error: string | null;
  fetchBadges: () => Promise<void>;
  reset: () => void;
}

export const useBadgesStore = create<BadgesState>((set) => ({
  badges: [],
  isLoading: false,
  error: null,

  fetchBadges: async () => {
    set({ isLoading: true, error: null });
    try {
      const badges = await getMyBadges();
      set({ badges, isLoading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), isLoading: false });
    }
  },

  reset: () => set({ badges: [], isLoading: false, error: null }),
}));
