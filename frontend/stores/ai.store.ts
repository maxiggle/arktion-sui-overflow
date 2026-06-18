import { create } from "zustand";
import { assistWriting } from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import type { AiChatMessage } from "@/lib/types/creator";

const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

interface AiState {
  // ── Modal (series dashboard page) ──────────────────────────────────────────
  open: boolean;
  openChat: (seriesId: string) => void;
  closeChat: () => void;

  // ── Shared ─────────────────────────────────────────────────────────────────
  seriesId: string | null;
  messages: AiChatMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (prompt: string) => Promise<void>;
  reset: () => void;

  // ── Panel: session init (resets messages when series changes) ───────────────
  initSession: (seriesId: string) => void;

  // ── Panel: model selection ─────────────────────────────────────────────────
  selectedModel: string;
  setModel: (model: string) => void;

  // ── Panel: suggestion mode ─────────────────────────────────────────────────
  suggestion: string | null;
  suggesting: boolean;
  suggestError: string | null;
  generateSuggestion: (seriesId: string, currentContent: string) => Promise<void>;
  clearSuggestion: () => void;

  // ── Panel: auto-suggest ────────────────────────────────────────────────────
  autoMode: boolean;
  setAutoMode: (enabled: boolean) => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  // ── Modal state ─────────────────────────────────────────────────────────────
  open: false,
  openChat: (seriesId) => set({ open: true, seriesId }),
  closeChat: () => set({ open: false }),

  // ── Shared state ────────────────────────────────────────────────────────────
  seriesId: null,
  messages: [],
  loading: false,
  error: null,

  sendMessage: async (prompt) => {
    const { seriesId, messages, selectedModel } = get();
    if (!seriesId || !prompt.trim()) return;

    const userMessage: AiChatMessage = { role: "user", content: prompt.trim() };
    set({ messages: [...messages, userMessage], loading: true, error: null });

    try {
      const result = await assistWriting(
        seriesId,
        prompt.trim(),
        messages,
        selectedModel !== DEFAULT_MODEL ? selectedModel : undefined
      );
      const assistantMessage: AiChatMessage = {
        role: "assistant",
        content: result.answer,
      };
      set((s) => ({
        messages: [...s.messages, assistantMessage],
        loading: false,
      }));
    } catch (err) {
      set((s) => ({
        messages: s.messages.slice(0, -1),
        loading: false,
        error: getErrorMessage(err),
      }));
    }
  },

  reset: () =>
    set({
      open: false,
      seriesId: null,
      messages: [],
      loading: false,
      error: null,
      suggestion: null,
      suggesting: false,
      suggestError: null,
    }),

  // ── Session init ─────────────────────────────────────────────────────────────
  initSession: (seriesId) => {
    if (get().seriesId === seriesId) return;
    set({ seriesId, messages: [], error: null });
  },

  // ── Model selection ──────────────────────────────────────────────────────────
  selectedModel: DEFAULT_MODEL,
  setModel: (model) => set({ selectedModel: model }),

  // ── Suggestion mode ──────────────────────────────────────────────────────────
  suggestion: null,
  suggesting: false,
  suggestError: null,

  generateSuggestion: async (seriesId, currentContent) => {
    const { selectedModel } = get();
    if (!currentContent.trim()) return;

    set({ suggesting: true, suggestError: null, suggestion: null });

    const prompt = [
      "Based on the story excerpt below, write the next 1–2 paragraphs of continuation.",
      "Output ONLY the continuation text — no commentary, no labels, no quotes.",
      "",
      "Current excerpt:",
      currentContent.slice(-3000),
    ].join("\n");

    try {
      const result = await assistWriting(
        seriesId,
        prompt,
        [],
        selectedModel !== DEFAULT_MODEL ? selectedModel : undefined
      );
      set({ suggestion: result.answer, suggesting: false });
    } catch (err) {
      set({ suggestError: getErrorMessage(err), suggesting: false });
    }
  },

  clearSuggestion: () => set({ suggestion: null, suggestError: null }),

  // ── Auto mode ────────────────────────────────────────────────────────────────
  autoMode: false,
  setAutoMode: (enabled) => set({ autoMode: enabled }),
}));
