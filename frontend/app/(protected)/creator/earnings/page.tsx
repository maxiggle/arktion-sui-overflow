"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { getCreatorEarnings } from "@/lib/api/creator";
import { getErrorMessage } from "@/lib/api/client";
import type { CreatorEarningsDto } from "@/lib/types/creator";

function formatUsdc(raw: string): string {
  const cents = Number(raw);
  if (isNaN(cents)) return "$0.00";
  return (cents / 1_000_000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function EarningsPage() {
  const [data, setData] = useState<CreatorEarningsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCreatorEarnings()
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex items-center gap-2 py-12">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">loading earnings…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const tips = data?.recentTips ?? [];
  const total = data?.totalUsdcReceived ?? "0";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">earnings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          tips received from readers
        </p>
      </div>

      {/* Total card */}
      <div className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            total earned
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-0.5">
            {formatUsdc(total)}
          </p>
        </div>
      </div>

      {/* Tips table */}
      {tips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-10 text-center">
          <p className="text-sm text-muted-foreground">no tips yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            tips will appear here once readers send them
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-x-4 px-4 py-2.5 bg-muted/30 border-b border-border/60">
            <p className="text-xs font-medium text-muted-foreground">series</p>
            <p className="text-xs font-medium text-muted-foreground">from</p>
            <p className="text-xs font-medium text-muted-foreground text-right">amount</p>
          </div>
          <div className="divide-y divide-border/40">
            {tips.map((tip) => (
              <div
                key={tip.id}
                className="grid grid-cols-[1fr_1fr_auto] gap-x-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
              >
                <p className="text-sm truncate">{tip.seriesTitle}</p>
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    {tip.senderDisplayName ?? "anonymous"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(tip.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatUsdc(tip.amountUsdc)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
