"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Wand2,
  Check,
  X,
  Copy,
  CornerDownLeft,
  Zap,
  ZapOff,
  ChevronDown,
  Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAiStore } from "@/stores/ai.store";

// ── OpenRouter model types ─────────────────────────────────────────────────────

interface ORModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture?: {
    output_modalities?: string[];
  };
}

function isFree(m: ORModel): boolean {
  return Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0;
}

function formatContext(tokens: number): string {
  if (tokens >= 1_000_000) return `${Math.round(tokens / 1_000_000)}M ctx`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K ctx`;
  return `${tokens} ctx`;
}

function formatPrice(pricePerToken: string): string {
  const n = Number(pricePerToken) * 1_000_000;
  if (n < 0.001) return `$${n.toFixed(4)}/1M`;
  return `$${n.toFixed(3)}/1M`;
}

function providerFromId(id: string): string {
  return id.split("/")[0] ?? id;
}

function useOpenRouterModels() {
  const [models, setModels] = useState<ORModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://openrouter.ai/api/v1/models")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ data: ORModel[] }>;
      })
      .then(({ data }) => {
        if (cancelled) return;
        // Text-output models only, sorted by name
        const text = data
          .filter(
            (m) =>
              !m.architecture?.output_modalities ||
              m.architecture.output_modalities.includes("text")
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        setModels(text);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFetchError(err instanceof Error ? err.message : "Failed to load models");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { models, loading, fetchError };
}
type Tab = "chat" | "suggest" | "models";

// ── Props ──────────────────────────────────────────────────────────────────────

export type { ORModel };

interface AiPanelProps {
  seriesId: string;
  currentContent: string;
  onInsert: (text: string) => void;
}

// ── Root panel ─────────────────────────────────────────────────────────────────

export function AiPanel({ seriesId, currentContent, onInsert }: AiPanelProps) {
  const {
    messages,
    loading,
    error,
    sendMessage,
    initSession,
    suggestion,
    suggesting,
    suggestError,
    generateSuggestion,
    clearSuggestion,
    selectedModel,
    setModel,
    autoMode,
    setAutoMode,
  } = useAiStore();

  const [tab, setTab] = useState<Tab>("chat");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initSession(seriesId);
  }, [seriesId, initSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-suggest: fires 3 s after the user stops typing when autoMode is on
  useEffect(() => {
    if (!autoMode || tab !== "suggest") return;
    if (autoDebounceRef.current) clearTimeout(autoDebounceRef.current);
    autoDebounceRef.current = setTimeout(() => {
      if (currentContent.trim().length > 100) {
        void generateSuggestion(seriesId, currentContent);
      }
    }, 3000);
    return () => {
      if (autoDebounceRef.current) clearTimeout(autoDebounceRef.current);
    };
  }, [currentContent, autoMode, tab, seriesId, generateSuggestion]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendMessage(text);
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // Display just the slug after the provider prefix (e.g. "llama-3.1-8b-instruct:free")
  const selectedModelShortName = selectedModel.split("/")[1] ?? selectedModel;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0 bg-muted/20">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold tracking-tight">AI assistant</span>
        </div>
        <button
          onClick={() => setTab("models")}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors max-w-[130px] truncate"
        >
          <Bot className="h-3 w-3 shrink-0" />
          <span className="truncate">{selectedModelShortName}</span>
          <ChevronDown className="h-2.5 w-2.5 shrink-0" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/50 shrink-0">
        {(["chat", "suggest", "models"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "flex-1 py-1.5 text-[11px] font-medium transition-colors capitalize",
              tab === t
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0">
        {tab === "chat" && (
          <ChatTab
            messages={messages}
            loading={loading}
            error={error}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onInsert={onInsert}
            bottomRef={bottomRef}
          />
        )}
        {tab === "suggest" && (
          <SuggestTab
            seriesId={seriesId}
            currentContent={currentContent}
            suggestion={suggestion}
            suggesting={suggesting}
            suggestError={suggestError}
            autoMode={autoMode}
            onToggleAuto={() => setAutoMode(!autoMode)}
            onGenerate={() => void generateSuggestion(seriesId, currentContent)}
            onAccept={() => {
              if (suggestion) onInsert("\n\n" + suggestion);
              clearSuggestion();
            }}
            onReject={clearSuggestion}
          />
        )}
        {tab === "models" && (
          <ModelsTab
            selectedModel={selectedModel}
            onSelect={(id) => {
              setModel(id);
              setTab("chat");
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Chat tab ───────────────────────────────────────────────────────────────────

interface ChatTabProps {
  messages: { role: "user" | "assistant"; content: string }[];
  loading: boolean;
  error: string | null;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onInsert: (text: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

function ChatTab({
  messages,
  loading,
  error,
  input,
  setInput,
  onSend,
  onKeyDown,
  onInsert,
  bottomRef,
}: ChatTabProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
            <Sparkles className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Ask anything about your story</p>
            <p className="text-[10px] text-muted-foreground/50 max-w-[200px] leading-relaxed">
              Characters, plot, consistency, scene ideas — the AI has access to your published chapters.
            </p>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-xs leading-relaxed bg-primary text-primary-foreground whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={i} className="flex flex-col gap-1">
              <div className="rounded-xl rounded-tl-sm px-3 py-2.5 text-xs leading-relaxed bg-muted/60 text-foreground">
                <div className="prose prose-xs max-w-none dark:prose-invert [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
              {/* Action row */}
              <div className="flex items-center gap-1 pl-1">
                <button
                  onClick={() => onInsert("\n\n" + msg.content)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/10"
                >
                  <CornerDownLeft className="h-2.5 w-2.5" />
                  Insert
                </button>
                <button
                  onClick={() => copyToClipboard(msg.content, i)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent/50"
                >
                  {copiedIdx === i ? (
                    <Check className="h-2.5 w-2.5 text-green-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                  {copiedIdx === i ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/60 rounded-xl rounded-tl-sm px-3 py-2.5">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <p className="text-[10px] text-destructive text-center py-1 px-2 bg-destructive/10 rounded-lg">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/50 px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your story…"
            disabled={loading}
            className="flex-1 resize-none rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 max-h-24 overflow-y-auto"
            style={{ minHeight: "32px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
            }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/40 mt-1 text-center">
          Enter to send · Shift+Enter new line
        </p>
      </div>
    </div>
  );
}

// ── Suggest tab ────────────────────────────────────────────────────────────────

interface SuggestTabProps {
  seriesId: string;
  currentContent: string;
  suggestion: string | null;
  suggesting: boolean;
  suggestError: string | null;
  autoMode: boolean;
  onToggleAuto: () => void;
  onGenerate: () => void;
  onAccept: () => void;
  onReject: () => void;
}

function SuggestTab({
  currentContent,
  suggestion,
  suggesting,
  suggestError,
  autoMode,
  onToggleAuto,
  onGenerate,
  onAccept,
  onReject,
}: SuggestTabProps) {
  const wordCount = currentContent.trim()
    ? currentContent.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 space-y-3">
        {/* Status bar */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {wordCount.toLocaleString()} words written
          </span>
          <button
            onClick={onToggleAuto}
            className={[
              "flex items-center gap-1 text-[10px] px-2 py-1 rounded-full transition-colors",
              autoMode
                ? "bg-primary/15 text-primary"
                : "bg-muted/50 text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {autoMode ? <Zap className="h-2.5 w-2.5" /> : <ZapOff className="h-2.5 w-2.5" />}
            {autoMode ? "Auto on" : "Auto off"}
          </button>
        </div>

        {/* Auto mode hint */}
        {autoMode && (
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed bg-muted/30 rounded-lg px-2.5 py-2">
            Auto mode active — a suggestion will appear 3 seconds after you stop typing.
          </p>
        )}

        {/* Manual generate button */}
        {!suggestion && !suggesting && (
          <button
            onClick={onGenerate}
            disabled={wordCount < 20}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/20 py-3 text-xs font-medium hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Wand2 className="h-3.5 w-3.5 text-primary" />
            Suggest what to write next
          </button>
        )}

        {/* Loading */}
        {suggesting && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Thinking…</p>
          </div>
        )}

        {/* Error */}
        {suggestError && (
          <p className="text-[10px] text-destructive bg-destructive/10 rounded-lg px-2.5 py-2">
            {suggestError}
          </p>
        )}

        {/* Suggestion card */}
        {suggestion && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-primary/10 bg-primary/5">
              <Wand2 className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">Suggestion</span>
            </div>
            <div className="px-3 py-2.5 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {suggestion}
            </div>
            <div className="flex border-t border-primary/10">
              <button
                onClick={onAccept}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-green-600 hover:bg-green-500/10 transition-colors"
              >
                <Check className="h-3 w-3" />
                Accept
              </button>
              <div className="w-px bg-primary/10" />
              <button
                onClick={onReject}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-3 w-3" />
                Reject
              </button>
            </div>
          </div>
        )}

        {/* Tip */}
        {!suggestion && !suggesting && wordCount < 20 && (
          <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
            Write at least a few sentences first, then let AI continue the story.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Models tab ─────────────────────────────────────────────────────────────────

interface ModelsTabProps {
  selectedModel: string;
  onSelect: (id: string) => void;
}

function ModelsTab({ selectedModel, onSelect }: ModelsTabProps) {
  const { models, loading, fetchError } = useOpenRouterModels();
  const [pricingTab, setPricingTab] = useState<"free" | "paid">("free");
  const [search, setSearch] = useState("");

  const freeModels = models.filter(isFree);
  const paidModels = models.filter((m) => !isFree(m));
  const pool = pricingTab === "free" ? freeModels : paidModels;

  const filtered = search.trim()
    ? pool.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase())
      )
    : pool;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Free / Paid tabs */}
      <div className="flex border-b border-border/50 shrink-0">
        {(["free", "paid"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setPricingTab(t)}
            className={[
              "flex-1 py-1.5 text-[11px] font-medium transition-colors capitalize",
              pricingTab === t
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
            ].join(" ")}
          >
            {t}
            {!loading && (
              <span className="ml-1 text-[9px] opacity-60">
                ({t === "free" ? freeModels.length : paidModels.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0 border-b border-border/40">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search models…"
          className="w-full rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col items-center gap-2 py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
            <p className="text-[10px] text-muted-foreground">Loading models…</p>
          </div>
        )}

        {fetchError && (
          <p className="text-[10px] text-destructive text-center py-6 px-3">
            {fetchError} — check your connection.
          </p>
        )}

        {!loading && !fetchError && filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-6">
            No models match your search.
          </p>
        )}

        <div className="p-2 space-y-1">
          {filtered.map((model) => {
            const isSelected = model.id === selectedModel;
            const provider = providerFromId(model.id);

            return (
              <button
                key={model.id}
                onClick={() => onSelect(model.id)}
                className={[
                  "w-full text-left rounded-xl border px-3 py-2.5 transition-all",
                  isSelected
                    ? "border-primary/40 bg-primary/8 ring-1 ring-primary/20"
                    : "border-border/40 hover:border-border/70 hover:bg-muted/30",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium leading-tight">{model.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {provider}
                      </span>
                      {model.context_length > 0 && (
                        <span className="text-[9px] text-muted-foreground/70">
                          · {formatContext(model.context_length)}
                        </span>
                      )}
                      {!isFree(model) && (
                        <span className="text-[9px] text-muted-foreground/70">
                          · in {formatPrice(model.pricing.prompt)}
                          {" / "}out {formatPrice(model.pricing.completion)}
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {model.description}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
