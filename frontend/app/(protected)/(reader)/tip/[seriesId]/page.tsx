"use client";

import { useEffect, useId, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useSeriesStore } from "@/stores/series.store";
import { usePaymentStore } from "@/stores/payment.store";
import { getZkState } from "@/lib/zklogin";

// ─── Validation ───────────────────────────────────────────────────────────────

const TipSchema = z.object({
  amount: z
    .string()
    .min(1, "Enter an amount")
    .refine(
      (v) => /^\d+(\.\d{1,6})?$/.test(v),
      "Enter a valid USDC amount (e.g. 1.00)",
    )
    .refine((v) => parseFloat(v) >= 0.01, "Minimum tip is 0.01 USDC"),
});

/** Convert USDC decimal string to micro-USDC string (6 decimals). */
function toMicroUsdc(usdc: string): string {
  const [whole, decimals = ""] = usdc.split(".");
  const padded = decimals.padEnd(6, "0").slice(0, 6);
  return BigInt(whole + padded).toString();
}

function makeIdempotencyKey(seriesId: string): string {
  return `tip:${seriesId}:${Date.now()}`;
}

const PRESETS = ["0.50", "1.00", "2.00", "5.00"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TipPage() {
  const params = useParams<{ seriesId: string }>();
  const router = useRouter();
  const inputId = useId();

  const { current: series, detailLoading, fetchSeriesById } = useSeriesStore();
  const { stage, txDigest, error, sendTip, reset } = usePaymentStore();

  const [amount, setAmount] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [zkMissing, setZkMissing] = useState(false);

  useEffect(() => {
    fetchSeriesById(params.seriesId);
    reset();
  }, [params.seriesId, fetchSeriesById, reset]);

  useEffect(() => {
    setZkMissing(!getZkState());
  }, []);

  const isSubmitting =
    stage === "building" || stage === "signing" || stage === "confirming";

  const stageLabel: Record<typeof stage, string> = {
    idle: "Send tip",
    building: "Preparing transaction…",
    signing: "Signing…",
    confirming: "Confirming on chain…",
    success: "Tip sent!",
    error: "Send tip",
  };

  function handlePreset(preset: string) {
    setAmount(preset);
    setFieldError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);

    const result = TipSchema.safeParse({ amount });
    if (!result.success) {
      setFieldError(result.error.issues[0].message);
      return;
    }

    await sendTip({
      seriesId: params.seriesId,
      amountUsdc: toMicroUsdc(amount),
      idempotencyKey: makeIdempotencyKey(params.seriesId),
    });
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (detailLoading || !series) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  if (stage === "success" && txDigest) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24 text-center">
        <CheckCircle2
          className="h-16 w-16 text-green-500"
          strokeWidth={1.5}
        />
        <div>
          <p className="text-xl font-semibold">Tip sent!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your USDC reached the creator on-chain.
          </p>
        </div>
        <a
          href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline underline-offset-4"
        >
          View on Suiscan ↗
        </a>
        <div className="flex gap-3">
          <button
            onClick={() => {
              reset();
              setAmount("");
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Send another
          </button>
          <Link
            href={`/series/${params.seriesId}`}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to series
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <button
        onClick={() => router.back()}
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center gap-4 mb-8">
        {series.coverUrl ? (
          <Image
            src={series.coverUrl}
            alt={series.title}
            width={56}
            height={80}
            className="rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-20 w-14 rounded-md bg-muted flex-shrink-0" />
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tipping creator of</p>
          <h1 className="text-lg font-semibold leading-snug">{series.title}</h1>
        </div>
      </div>

      {zkMissing && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">
            Your signing session has expired. Sign out and sign in again to
            enable tipping.
          </p>
        </div>
      )}

      {stage === "error" && error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-3">Quick amounts</p>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePreset(preset)}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                  amount === preset
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-muted text-foreground"
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label
            htmlFor={inputId}
            className="block text-sm text-muted-foreground mb-2"
          >
            Custom amount (USDC)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFieldError(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-border bg-card pl-8 pr-4 py-3 text-sm
                placeholder:text-muted-foreground/50
                focus:outline-none focus:ring-2 focus:ring-primary/50
                disabled:opacity-50"
            />
          </div>
          {fieldError && (
            <p className="mt-1.5 text-xs text-destructive">{fieldError}</p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Minimum 0.01 USDC · Transferred on Sui testnet
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || zkMissing}
          className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground
            hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {stageLabel[stage]}
        </button>
      </form>

      <p className="mt-6 text-xs text-muted-foreground text-center">
        Tips go directly to the creator&apos;s wallet. Gas is covered by
        Arktion.
      </p>
    </div>
  );
}
