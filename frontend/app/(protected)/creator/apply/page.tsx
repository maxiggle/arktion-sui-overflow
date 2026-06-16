"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useCreatorStore } from "@/stores/creator.store";
import { getErrorMessage } from "@/lib/api/client";
import { Cadence } from "@/lib/types/creator";

const schema = z.object({
  pitch: z
    .string()
    .min(80, "Give us at least a few sentences — what's the story?")
    .max(2000),
  cadence: z.enum(Object.values(Cadence) as [Cadence, ...Cadence[]], {
    error: () => "Select a release schedule",
  }),
  tooling: z
    .string()
    .min(2, "Tell us what tools you create with")
    .max(300),
  portfolioUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

const CADENCE_OPTIONS: { value: Cadence; label: string; sub: string }[] = [
  { value: Cadence.WEEKLY, label: "Weekly", sub: "1 chapter / week" },
  { value: Cadence.BI_WEEKLY, label: "Bi-weekly", sub: "1 chapter / 2 weeks" },
  { value: Cadence.MONTHLY, label: "Monthly", sub: "1 chapter / month" },
  { value: Cadence.ONE_SHOT, label: "One-shot", sub: "Single complete work" },
];

const STEPS = ["Your story", "Commitment", "Your tools", "Existing work"] as const;

export default function ApplyCreatorPage() {
  const router = useRouter();
  const { applyAsCreator } = useCreatorStore();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    pitch: "",
    cadence: Cadence.WEEKLY,
    tooling: "",
    portfolioUrl: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setErrors((e) => ({ ...e, [key]: undefined }));
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      const r = z.object({ pitch: schema.shape.pitch }).safeParse({ pitch: form.pitch });
      if (!r.success) { setErrors({ pitch: r.error.issues[0].message }); return false; }
    }
    if (step === 1) {
      const r = z.object({ cadence: schema.shape.cadence }).safeParse({ cadence: form.cadence });
      if (!r.success) { setErrors({ cadence: r.error.issues[0].message }); return false; }
    }
    if (step === 2) {
      const r = z.object({ tooling: schema.shape.tooling }).safeParse({ tooling: form.tooling });
      if (!r.success) { setErrors({ tooling: r.error.issues[0].message }); return false; }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

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

    try {
      setSubmitting(true);
      await applyAsCreator({
        pitch: result.data.pitch,
        cadence: result.data.cadence,
        tooling: result.data.tooling,
        portfolioUrl: result.data.portfolioUrl || undefined,
      });
      router.push("/creator");
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-2">
            creator application
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            become a creator
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Arktion is built for creators with something to say. Tell us about
            your work.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={[
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                ].join(" ")}
              />
              {i === STEPS.length - 1 && null}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-6">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 0: Pitch */}
          {step === 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="pitch">
                What&apos;s your first series about?
              </label>
              <p className="text-xs text-muted-foreground">
                Give us the premise in 3–5 sentences. What happens? Who is it
                for? Why does it need to exist?
              </p>
              <textarea
                id="pitch"
                rows={6}
                value={form.pitch}
                onChange={(e) => set("pitch", e.target.value)}
                placeholder="In a world where memories can be traded like currency, a debt collector discovers the one memory everyone wants erased — and it belongs to her…"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <div className="flex items-center justify-between">
                {errors.pitch ? (
                  <p className="text-xs text-destructive">{errors.pitch}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {form.pitch.length} / 2000
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Cadence */}
          {step === 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                How often will you publish?
              </label>
              <p className="text-xs text-muted-foreground">
                Readers build habits around schedules. Pick what you can
                actually commit to — slow and consistent beats fast and
                abandoned.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {CADENCE_OPTIONS.map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("cadence", value)}
                    className={[
                      "flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors",
                      form.cadence === value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                    ].join(" ")}
                  >
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-xs mt-0.5">{sub}</span>
                  </button>
                ))}
              </div>
              {errors.cadence && (
                <p className="text-xs text-destructive">{errors.cadence}</p>
              )}
            </div>
          )}

          {/* Step 2: Tooling */}
          {step === 2 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="tooling">
                What do you create with?
              </label>
              <p className="text-xs text-muted-foreground">
                Software, hardware, pen and paper — whatever your actual
                workflow looks like.
              </p>
              <input
                id="tooling"
                type="text"
                value={form.tooling}
                onChange={(e) => set("tooling", e.target.value)}
                placeholder="Clip Studio Paint, iPad Pro, Procreate…"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {errors.tooling && (
                <p className="text-xs text-destructive">{errors.tooling}</p>
              )}
            </div>
          )}

          {/* Step 3: Portfolio */}
          {step === 3 && (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="portfolioUrl">
                Do you have existing work?{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                A link to your Webtoon, Tapas, Wattpad, AO3, personal site —
                anything that shows what you&apos;ve made. New creators without
                a portfolio are welcome too.
              </p>
              <input
                id="portfolioUrl"
                type="url"
                value={form.portfolioUrl}
                onChange={(e) => set("portfolioUrl", e.target.value)}
                placeholder="https://webtoons.com/…"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {errors.portfolioUrl && (
                <p className="text-xs text-destructive">{errors.portfolioUrl}</p>
              )}

              {serverError && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive mt-4">
                  {serverError}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-lg border border-border/60 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                back
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "submitting…" : "submit application"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
