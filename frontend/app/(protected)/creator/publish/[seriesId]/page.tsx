"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useCreatorStore } from "@/stores/creator.store";
import { getErrorMessage } from "@/lib/api/client";
import { FORMAT_LABELS, FormatType } from "@/lib/types/series";
import { SeriesStatus } from "@/lib/types/creator";

const schema = z.object({
  title: z.string().min(1, "title is required").max(255),
  formatType: z.coerce.number().int().min(0).max(4),
  sourceLanguage: z.string().min(1, "language is required").max(10),
  description: z.string().max(5000).optional(),
  coverUrl: z.string().url("must be a valid URL").optional().or(z.literal("")),
  status: z.enum(Object.values(SeriesStatus) as [SeriesStatus, ...SeriesStatus[]]),
});

type FormData = z.infer<typeof schema>;

const FORMAT_OPTIONS = Object.entries(FORMAT_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export default function EditSeriesPage() {
  const { seriesId } = useParams<{ seriesId: string }>();
  const router = useRouter();
  const { series, loading, fetchOwnSeries, updateSeries } = useCreatorStore();

  const existing = series.find((s) => s.id === seriesId);

  const [trackedId, setTrackedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (series.length === 0) fetchOwnSeries();
  }, [series.length, fetchOwnSeries]);

  // Derive form from existing during render — avoids setState-in-effect warning.
  // React re-renders once synchronously when trackedId diverges from existing.id.
  if (existing && existing.id !== trackedId) {
    setTrackedId(existing.id);
    setForm({
      title: existing.title,
      formatType: existing.formatType,
      sourceLanguage: existing.sourceLanguage,
      description: existing.description ?? "",
      coverUrl: existing.coverUrl ?? "",
      status: (existing.status as SeriesStatus) ?? SeriesStatus.ONGOING,
    });
  }

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setSaved(false);
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setServerError(null);
    setSaved(false);

    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormData;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const payload = {
      ...result.data,
      coverUrl: result.data.coverUrl || undefined,
      description: result.data.description || undefined,
    };

    try {
      setSubmitting(true);
      await updateSeries(seriesId, payload);
      setSaved(true);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !form) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!existing && !loading) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center">
        <p className="text-sm text-muted-foreground">series not found</p>
        <button
          onClick={() => router.push("/creator/studio")}
          className="mt-3 text-xs text-primary hover:underline"
        >
          ← back to studio
        </button>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">edit series</h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-xs">
            {existing?.title}
          </p>
        </div>
        <button
          onClick={() => router.push("/creator/studio")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          ← studio
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="title">
            title
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Format + Language */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="formatType">
              format
            </label>
            <select
              id="formatType"
              value={form.formatType}
              onChange={(e) =>
                set("formatType", Number(e.target.value) as FormatType)
              }
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {FORMAT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="sourceLanguage">
              language
            </label>
            <input
              id="sourceLanguage"
              type="text"
              value={form.sourceLanguage}
              onChange={(e) => set("sourceLanguage", e.target.value)}
              maxLength={10}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="status">
            status
          </label>
          <select
            id="status"
            value={form.status}
            onChange={(e) => set("status", e.target.value as SeriesStatus)}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {Object.values(SeriesStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Cover URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="coverUrl">
            cover image URL{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="coverUrl"
            type="url"
            value={form.coverUrl}
            onChange={(e) => set("coverUrl", e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.coverUrl && (
            <p className="text-xs text-destructive">{errors.coverUrl}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="description">
            description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {serverError}
          </p>
        )}
        {saved && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
            changes saved
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "saving…" : "save changes"}
        </button>
      </form>
    </div>
  );
}
