"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { ImagePlus, Loader2, X, ArrowLeft } from "lucide-react";
import { uploadCreatorFile, createCreatorChapter } from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";

const schema = z.object({
  chapterNumber: z.coerce
    .number()
    .min(0, "Must be 0 or greater")
    .max(99999),
  title: z.string().max(500).optional(),
});

interface UploadedPage {
  id: string;
  url: string;
  preview: string;
  name: string;
}

export default function NewChapterPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const router = useRouter();

  const [chapterNumber, setChapterNumber] = useState("");
  const [title, setTitle] = useState("");
  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ chapterNumber?: string; pages?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const accepted = Array.from(files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)
    );
    if (!accepted.length) return;

    setUploading(true);
    setErrors((e) => ({ ...e, pages: undefined }));

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
            prev.map((p) => (p.id === id ? { ...p, url } : p))
          );
        } catch {
          setPages((prev) => prev.filter((p) => p.id !== id));
        }
      })
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

    const parsed = schema.safeParse({ chapterNumber, title: title || undefined });
    if (!parsed.success) {
      const errs: typeof errors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "chapterNumber") errs.chapterNumber = issue.message;
      }
      setErrors(errs);
      return;
    }

    const readyPages = pages.filter((p) => p.url);
    if (readyPages.length === 0) {
      setErrors((e) => ({ ...e, pages: "Upload at least one page" }));
      return;
    }
    if (pages.some((p) => !p.url)) {
      setErrors((e) => ({ ...e, pages: "Wait for all pages to finish uploading" }));
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/creator/publish/${seriesId}`)}
          className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">new chapter</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            upload pages to Walrus
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="chapterNumber">
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
              <p className="text-xs text-destructive">{errors.chapterNumber}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="title">
              title{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
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

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">
              pages{" "}
              <span className="text-muted-foreground font-normal">
                ({pages.length} added
                {pendingCount > 0 ? `, ${pendingCount} uploading…` : ""})
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
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />

          <div
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
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
                <ImagePlus className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
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
                    <div key={page.id} className="relative group aspect-[3/4]">
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
                  <ImagePlus className="h-5 w-5 text-muted-foreground/40" strokeWidth={1.5} />
                </div>
              </div>
            )}
          </div>

          {errors.pages && (
            <p className="text-xs text-destructive">{errors.pages}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || uploading || pendingCount > 0}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? "publishing…"
            : pendingCount > 0
            ? `uploading ${pendingCount} page${pendingCount > 1 ? "s" : ""}…`
            : "publish chapter"}
        </button>
      </form>
    </div>
  );
}
