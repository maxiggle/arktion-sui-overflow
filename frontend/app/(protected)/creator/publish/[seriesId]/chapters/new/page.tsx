"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Clock,
  Eye,
  ImagePlus,
  Loader2,
  Pencil,
  Sparkles,
  Type,
  X,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import { uploadCreatorFile, createCreatorChapter } from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import { useSeriesStore } from "@/stores/series.store";
import { FormatType } from "@/lib/types/series";
import { AiPanel } from "@/components/creator/ai-panel";

const schema = z.object({
  chapterNumber: z.coerce.number().min(0, "Must be 0 or greater").max(99999),
  title: z.string().max(500).optional(),
});

interface UploadedPage {
  id: string;
  url: string;
  preview: string;
  name: string;
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function NewChapterPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const router = useRouter();

  const { byId, fetchSeriesById } = useSeriesStore();
  const series = byId[seriesId] ?? null;

  useEffect(() => {
    if (!byId[seriesId]) fetchSeriesById(seriesId);
  }, [seriesId, byId, fetchSeriesById]);

  const isNovel = series?.formatType === FormatType.NOVEL;

  const [chapterNumber, setChapterNumber] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    chapterNumber?: string;
    content?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const [markdown, setMarkdown] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");

  // null = user hasn't toggled; panel open state is derived from isNovel (auto-opens for novels)
  const [aiPanelUserOverride, setAiPanelUserOverride] = useState<boolean | null>(null);
  const aiPanelOpen = aiPanelUserOverride ?? isNovel;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setMarkdown((prev) => prev + text);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const updated = markdown.slice(0, start) + text + markdown.slice(end);
      setMarkdown(updated);
      setTimeout(() => {
        textarea.focus();
        const pos = start + text.length;
        textarea.setSelectionRange(pos, pos);
      }, 0);
    },
    [markdown],
  );

  const wordCount = countWords(markdown);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const accepted = Array.from(files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type),
    );
    if (!accepted.length) return;

    setUploading(true);
    setErrors((e) => ({ ...e, content: undefined }));

    const ids = accepted.map(() => crypto.randomUUID());
    const previews: UploadedPage[] = accepted.map((f, i) => ({
      id: ids[i],
      url: "",
      preview: URL.createObjectURL(f),
      name: f.name,
    }));

    setPages((prev) => [...prev, ...previews]);

    await Promise.all(
      accepted.map(async (file, i) => {
        const id = ids[i];
        try {
          const { url } = await uploadCreatorFile(file);
          setPages((prev) =>
            prev.map((p) => (p.id === id ? { ...p, url } : p)),
          );
        } catch {
          setPages((prev) => prev.filter((p) => p.id !== id));
        }
      }),
    );

    setUploading(false);
  };

  const removePage = (id: string) => {
    setPages((prev) => {
      const p = prev.find((p) => p.id === id);
      if (p?.preview) URL.revokeObjectURL(p.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = schema.safeParse({
      chapterNumber,
      title: title || undefined,
    });
    if (!parsed.success) {
      const errs: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "chapterNumber")
          errs.chapterNumber = issue.message;
      }
      setErrors(errs);
      return;
    }

    if (isNovel) {
      if (!markdown.trim()) {
        setErrors((e) => ({ ...e, content: "Write at least a few words" }));
        return;
      }
      setErrors({});
      setSubmitting(true);
      try {
        const blob = new File([markdown], "chapter.md", {
          type: "text/markdown",
        });
        const { url: contentUrl } = await uploadCreatorFile(blob);
        await createCreatorChapter(seriesId, {
          chapterNumber: parsed.data.chapterNumber,
          title: parsed.data.title,
          contentUrl,
          content: markdown,
        });
        router.push(`/creator/publish/${seriesId}`);
      } catch (err) {
        setServerError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const readyPages = pages.filter((p) => p.url);
    if (readyPages.length === 0) {
      setErrors((e) => ({ ...e, content: "Upload at least one page" }));
      return;
    }
    if (pages.some((p) => !p.url)) {
      setErrors((e) => ({
        ...e,
        content: "Wait for all pages to finish uploading",
      }));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await createCreatorChapter(seriesId, {
        chapterNumber: parsed.data.chapterNumber,
        title: parsed.data.title,
        pages: readyPages.map((p) => p.url),
      });
      router.push(`/creator/publish/${seriesId}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = pages.filter((p) => !p.url).length;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/creator/publish/${seriesId}`)}
            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">
              new chapter
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {!series
                ? "loading…"
                : isNovel
                  ? "write & upload to Walrus"
                  : "upload pages to Walrus"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNovel && (
            <>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Type className="h-3 w-3" />
                {wordCount.toLocaleString()} words
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {readTime} min
              </span>
              <button
                type="button"
                onClick={() => setAiPanelUserOverride(!aiPanelOpen)}
                className={[
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                  aiPanelOpen
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                ].join(" ")}
              >
                {aiPanelOpen ? (
                  <PanelRightClose className="h-3.5 w-3.5" />
                ) : (
                  <PanelRight className="h-3.5 w-3.5" />
                )}
                AI
              </button>
            </>
          )}
        </div>
      </header>

      {/* Body: editor + AI panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main editor area */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {!series ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-5 max-w-3xl">
              {/* Chapter number + title */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-medium"
                    htmlFor="chapterNumber"
                  >
                    chapter number
                  </label>
                  <input
                    id="chapterNumber"
                    type="number"
                    step="0.1"
                    min="0"
                    value={chapterNumber}
                    onChange={(e) => {
                      setChapterNumber(e.target.value);
                      setErrors((er) => ({ ...er, chapterNumber: undefined }));
                    }}
                    placeholder="1"
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {errors.chapterNumber && (
                    <p className="text-xs text-destructive">
                      {errors.chapterNumber}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="title">
                    title{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="The Beginning"
                    maxLength={500}
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              {/* Novel: split markdown editor */}
              {isNovel && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-medium">
                      chapter content
                    </label>
                    {/* Mobile tab toggle */}
                    <div className="flex md:hidden rounded-lg border border-border/60 overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTab("write")}
                        className={[
                          "flex items-center gap-1 px-2.5 py-1 transition-colors",
                          activeTab === "write"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        <Pencil className="h-3 w-3" />
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("preview")}
                        className={[
                          "flex items-center gap-1 px-2.5 py-1 transition-colors border-l border-border/60",
                          activeTab === "preview"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 rounded-xl border border-border/60 overflow-hidden">
                    {/* Write pane */}
                    <div
                      className={[
                        "flex flex-col border-border/40 md:border-r",
                        activeTab === "preview" ? "hidden md:flex" : "flex",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/30 text-xs text-muted-foreground shrink-0">
                        <Pencil className="h-3 w-3" />
                        <span>markdown</span>
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={markdown}
                        onChange={(e) => {
                          setMarkdown(e.target.value);
                          if (e.target.value.trim())
                            setErrors((er) => ({ ...er, content: undefined }));
                        }}
                        placeholder={
                          "# Chapter One\n\nThe night was dark and stormy...\n\n## Scene break\n\n**Bold**, *italic*, `code`, and more."
                        }
                        spellCheck
                        className="flex-1 min-h-[520px] w-full px-5 py-4 bg-background text-sm font-mono leading-relaxed resize-none focus:outline-none placeholder:text-muted-foreground/40"
                      />
                    </div>

                    {/* Preview pane */}
                    <div
                      className={[
                        "flex flex-col",
                        activeTab === "write" ? "hidden md:flex" : "flex",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/40 bg-muted/30 text-xs text-muted-foreground shrink-0">
                        <Eye className="h-3 w-3" />
                        <span>preview</span>
                      </div>
                      <div className="flex-1 min-h-[520px] overflow-y-auto px-5 py-4">
                        {markdown.trim() ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {markdown}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic mt-2">
                            Start writing on the left to see a preview here…
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {errors.content && (
                    <p className="text-xs text-destructive">{errors.content}</p>
                  )}
                </div>
              )}

              {/* Image pages (manga/manhwa) */}
              {!isNovel && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">
                      pages{" "}
                      <span className="text-muted-foreground font-normal">
                        ({pages.length} added
                        {pendingCount > 0 ? `, ${pendingCount} uploading…` : ""}
                        )
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      add pages
                    </button>
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    onChange={(e) =>
                      e.target.files && handleFiles(e.target.files)
                    }
                  />

                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files)
                        handleFiles(e.dataTransfer.files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => !uploading && inputRef.current?.click()}
                    className={[
                      "rounded-xl border-2 border-dashed transition-colors cursor-pointer",
                      pages.length === 0
                        ? "border-border/60 hover:border-primary/50 p-12 flex flex-col items-center gap-2 text-center"
                        : "border-border/30 p-3",
                    ].join(" ")}
                  >
                    {pages.length === 0 ? (
                      <>
                        <ImagePlus
                          className="h-8 w-8 text-muted-foreground/40"
                          strokeWidth={1.5}
                        />
                        <p className="text-sm text-muted-foreground">
                          drop pages here or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground/60">
                          jpeg, png, webp, gif · select all pages at once
                        </p>
                      </>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {pages.map((page, idx) => {
                          const isDone = !!page.url;
                          return (
                            <div
                              key={page.id}
                              className="relative group aspect-[3/4]"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={page.preview}
                                alt={`Page ${idx + 1}`}
                                className={[
                                  "w-full h-full object-cover rounded-lg border border-border/60",
                                  !isDone ? "opacity-50" : "",
                                ].join(" ")}
                              />
                              {!isDone && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                </div>
                              )}
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[9px] text-white">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePage(page.id);
                                }}
                                className="absolute top-1 right-1 h-4 w-4 rounded-full bg-black/60 items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity flex"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          );
                        })}
                        <div
                          className="aspect-[3/4] rounded-lg border-2 border-dashed border-border/40 flex items-center justify-center hover:border-primary/40 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            inputRef.current?.click();
                          }}
                        >
                          <ImagePlus
                            className="h-5 w-5 text-muted-foreground/40"
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {errors.content && (
                    <p className="text-xs text-destructive">{errors.content}</p>
                  )}
                </div>
              )}

              {serverError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  uploading ||
                  pendingCount > 0 ||
                  (isNovel && !markdown.trim())
                }
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting
                  ? "publishing…"
                  : pendingCount > 0
                    ? `uploading ${pendingCount} page${pendingCount > 1 ? "s" : ""}…`
                    : "publish chapter"}
              </button>
            </form>
          )}
        </div>

        {/* AI Panel sidebar */}
        {isNovel && aiPanelOpen && (
          <div className="w-80 shrink-0 border-l border-border/60 overflow-hidden flex flex-col">
            <AiPanel
              seriesId={seriesId}
              currentContent={markdown}
              onInsert={handleInsert}
            />
          </div>
        )}
      </div>

      {/* Floating AI toggle for novel (mobile only) */}
      {isNovel && !aiPanelOpen && series && (
        <button
          onClick={() => setAiPanelUserOverride(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-3 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors text-xs font-medium md:hidden"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI
        </button>
      )}
    </div>
  );
}
