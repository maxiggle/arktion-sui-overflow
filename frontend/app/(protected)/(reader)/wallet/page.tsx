"use client";

import React, { useEffect, useState } from "react";
import {
  Droplets,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInkStore } from "@/stores/ink.store";
import { LEVEL_THRESHOLDS, INK_TRIGGER_LABELS } from "@/lib/types/ink";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEDGER_LIMIT = 20;

function levelProgress(
  level: number,
  totalEarned: number
): {
  pct: number;
  earnedInLevel: number;
  levelRange: number;
  isMaxLevel: boolean;
} {
  const prevThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;
  if (!nextThreshold) {
    return { pct: 100, earnedInLevel: 0, levelRange: 0, isMaxLevel: true };
  }
  const earnedInLevel = totalEarned - prevThreshold;
  const levelRange = nextThreshold - prevThreshold;
  const pct = Math.min(100, Math.round((earnedInLevel / levelRange) * 100));
  return { pct, earnedInLevel, levelRange, isMaxLevel: false };
}

function formatAmount(amount: string): string {
  return Number(amount).toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Balance card ─────────────────────────────────────────────────────────────

function BalanceCard() {
  const { balance, balanceLoading, balanceError, fetchBalance } = useInkStore();

  if (balanceLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 animate-pulse">
        <div className="h-3 w-20 rounded bg-muted mb-4" />
        <div className="h-12 w-40 rounded bg-muted mb-6" />
        <div className="h-2 w-full rounded-full bg-muted" />
      </div>
    );
  }

  if (balanceError || !balance) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {balanceError ?? "Could not load balance."}
        </p>
        <Button variant="outline" size="sm" onClick={fetchBalance}>
          Retry
        </Button>
      </div>
    );
  }

  const currentBalance = Number(balance.balance);
  const totalEarned = Number(balance.totalInkEarned);
  const { pct, earnedInLevel, levelRange, isMaxLevel } = levelProgress(
    balance.level,
    totalEarned
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">
            INK balance
          </p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-foreground leading-none">
              {currentBalance.toLocaleString()}
            </span>
            <span className="text-lg text-muted-foreground mb-0.5 font-light">
              INK
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-500">
            <Zap className="h-3 w-3" />
            Level {balance.level}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalEarned.toLocaleString()} earned total
          </p>
        </div>
      </div>

      {/* Level progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Level {balance.level}</span>
          {isMaxLevel ? (
            <span className="text-yellow-500 font-medium">Max level</span>
          ) : (
            <span className="text-muted-foreground">
              {earnedInLevel.toLocaleString()} / {levelRange.toLocaleString()}{" "}
              INK
            </span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!isMaxLevel && (
          <p className="text-[10px] text-muted-foreground/60">
            {pct}% to level {balance.level + 1} ·{" "}
            {(levelRange - earnedInLevel).toLocaleString()} INK needed
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Ledger skeleton ──────────────────────────────────────────────────────────

function LedgerSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/40 last:border-none animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-muted shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="h-2.5 w-20 rounded bg-muted" />
            </div>
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      ))}
    </>
  );
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

function LedgerSection() {
  const { ledger, ledgerLoading, ledgerError, fetchLedger } = useInkStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLedger(page, LEDGER_LIMIT);
  }, [fetchLedger, page]);

  const totalPages = ledger ? Math.ceil(ledger.total / LEDGER_LIMIT) : 1;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <TrendingUp
            className="h-4 w-4 text-muted-foreground/60"
            strokeWidth={1.5}
          />
          <h2 className="text-sm font-medium text-foreground">
            Transaction history
          </h2>
        </div>
        {ledger && (
          <span className="text-xs text-muted-foreground">
            {ledger.total.toLocaleString()} entries
          </span>
        )}
      </div>

      {/* Rows */}
      <div>
        {ledgerLoading ? (
          <LedgerSkeleton />
        ) : ledgerError ? (
          <div className="flex items-center justify-between gap-4 px-5 py-8">
            <p className="text-sm text-muted-foreground">{ledgerError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLedger(page, LEDGER_LIMIT)}
            >
              Retry
            </Button>
          </div>
        ) : !ledger || ledger.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Droplets
              className="h-9 w-9 text-muted-foreground/20"
              strokeWidth={1}
            />
            <p className="text-sm text-muted-foreground">
              No transactions yet. Start reading to earn INK.
            </p>
          </div>
        ) : (
          ledger.data.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/40 last:border-none hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                  <Droplets
                    className="h-3.5 w-3.5 text-sky-500"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-none">
                    {INK_TRIGGER_LABELS[entry.actionType] ?? "INK earned"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)}
                    </span>
                    {entry.suiTxDigest && (
                      <a
                        href={`https://suiexplorer.com/txblock/${entry.suiTxDigest}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        tx
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-sm font-medium text-sky-500 shrink-0 tabular-nums">
                +{formatAmount(entry.amount)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {ledger && totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || ledgerLoading}
            className="h-8 px-3 text-xs"
          >
            {ledgerLoading && page > 1 ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
            Previous
          </Button>

          <span className="text-xs text-muted-foreground tabular-nums">
            {page} / {totalPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || ledgerLoading}
            className="h-8 px-3 text-xs"
          >
            Next
            {ledgerLoading && page < totalPages ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { fetchBalance } = useInkStore();

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
          earnings
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          wallet
        </h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <BalanceCard />
        <LedgerSection />
      </div>
    </div>
  );
}
