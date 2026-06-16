"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { getCreatorEarnings } from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import type { CreatorEarningsDto } from "@/lib/types/creator";

function formatUsdc(microUsdc: string): string {
  return (Number(microUsdc) / 1_000_000).toFixed(2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CreatorEarningsPage() {
  const [earnings, setEarnings] = useState<CreatorEarningsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCreatorEarnings()
      .then(setEarnings)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">earnings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          tips received from readers
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : earnings ? (
        <>
          {/* Total card */}
          <div className="rounded-2xl border border-border/60 bg-card px-8 py-7">
            <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">
              total received
            </p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-semibold tracking-tight leading-none">
                {formatUsdc(earnings.totalUsdcReceived)}
              </span>
              <span className="text-lg text-muted-foreground mb-0.5 font-light">
                USDC
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {earnings.recentTips.length > 0
                ? `${earnings.recentTips.length} recent tip${earnings.recentTips.length !== 1 ? "s" : ""}`
                : "no tips yet"}
            </p>
          </div>

          {/* Recent tips list */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border/60">
              <TrendingUp className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
              <h2 className="text-sm font-medium">recent tips</h2>
            </div>

            {earnings.recentTips.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <DollarSign className="h-9 w-9 text-muted-foreground/20" strokeWidth={1} />
                <p className="text-sm text-muted-foreground">
                  No tips yet. Readers will tip you as they enjoy your work.
                </p>
              </div>
            ) : (
              <ul>
                {earnings.recentTips.map((tip) => (
                  <li
                    key={tip.id}
                    className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/40 last:border-none hover:bg-accent/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {tip.seriesTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tip.senderDisplayName ?? "anonymous"} · {formatDate(tip.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-emerald-500 shrink-0 tabular-nums">
                      +{formatUsdc(tip.amountUsdc)} USDC
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
