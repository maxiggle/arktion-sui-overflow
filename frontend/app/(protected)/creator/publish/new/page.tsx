"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useCreatorStore } from "@/stores/creator.store";
import { getErrorMessage } from "@/lib/api/client";
import { FORMAT_LABELS, FormatType } from "@/lib/types/series";
import { SeriesStatus } from "@/lib/types/creator";
import { CoverImageUpload } from "@/components/creator/cover-image-upload";

const schema = z.object({
  title: z.string().min(1, "title is required").max(255),
  formatType: z.coerce.number().int().min(0).max(4),
  sourceLanguage: z.string().min(1, "language is required").max(10),
  description: z.string().max(5000).optional(),
  coverUrl: z.string().url("must be a valid URL").optional().or(z.literal("")),
  status: z.nativeEnum(SeriesStatus),
});

type FormData = z.infer<typeof schema>;

const FORMAT_OPTIONS = Object.entries(FORMAT_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export default function NewSeriesPage() {
  const router = useRouter();
  const { createSeries } = useCreatorStore();

  const [form, setForm] = useState<FormData>({
    title: "",
    formatType: FormatType.MANGA,
    sourceLanguage: "en",
    description: "",
    coverUrl: "",
    status: SeriesStatus.ONGOING,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

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
      const created = await createSeries(payload);
      router.push(`/creator/publish/${created.id}`);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">new series</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          publish your work on Arktion
        </p>
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
            placeholder="My Amazing Series"
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
              onChange={(e) => set("formatType", Number(e.target.value) as FormatType)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {FORMAT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.formatType && (
              <p className="text-xs text-destructive">{errors.formatType}</p>
            )}
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
              placeholder="en"
              maxLength={10}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {errors.sourceLanguage && (
              <p className="text-xs text-destructive">{errors.sourceLanguage}</p>
            )}
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

        {/* Cover image */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            cover image{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <CoverImageUpload
            value={form.coverUrl ?? ""}
            onChange={(url) => set("coverUrl", url)}
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
            placeholder="A brief synopsis…"
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description}</p>
          )}
        </div>

        {serverError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? "creating…" : "create series"}
        </button>
      </form>
    </div>
  );
}
