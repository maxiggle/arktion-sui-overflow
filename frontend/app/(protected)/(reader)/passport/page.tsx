"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Fingerprint,
  BookOpen,
  BookCheck,
  BookMarked,
  Droplets,
  ExternalLink,
  Download,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePassportStore } from "@/stores/passport.store";
import { LEVEL_THRESHOLDS } from "@/lib/types/ink";
import type { PassportDto, SnapshotResult } from "@/lib/types/passport";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function levelProgress(passport: PassportDto): {
  pct: number;
  earnedInLevel: number;
  levelRange: number;
  isMaxLevel: boolean;
} {
  const level = passport.level;
  const totalEarned = Number(passport.totalInkEarned);
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

// ─── Stat cell ────────────────────────────────────────────────────────────────

function StatCell({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconClass?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-5 shadow-sm shadow-black/5">
      <div
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconClass ?? "bg-muted"}`}
      >
        <Icon className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground leading-none">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-muted-foreground tracking-wide">{label}</p>
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Copy"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

// ─── Snapshot section ─────────────────────────────────────────────────────────

function SnapshotSection({
  passport,
  latestSnapshot,
  isExporting,
  exportError,
  onExport,
}: {
  passport: PassportDto;
  latestSnapshot: SnapshotResult | null;
  isExporting: boolean;
  exportError: string | null;
  onExport: () => void;
}) {
  // Prefer freshly exported snapshot, fall back to last stored on passport
  const blobId = latestSnapshot?.blobId ?? passport.identityBlobId;
  const walrusUrl = latestSnapshot?.walrusUrl ?? passport.identityBlobUrl;
  const snapshotAt = latestSnapshot?.snapshotAt ?? null;
  const recordCount = latestSnapshot?.recordCount ?? null;
  const onChain = latestSnapshot?.onChainAnchored ?? false;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm shadow-black/5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Walrus snapshot
          </h2>
          <p className="text-xs text-muted-foreground mt-1 leading-snug max-w-sm">
            Export your reading history to decentralised storage on Walrus and
            optionally anchor it on Sui.
          </p>
        </div>
        <Button
          onClick={onExport}
          disabled={isExporting}
          size="sm"
          variant="outline"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {isExporting ? "Exporting…" : "Export"}
        </Button>
      </div>

      {exportError && (
        <p className="text-xs text-destructive">{exportError}</p>
      )}

      {blobId ? (
        <div className="space-y-3">
          {latestSnapshot && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Snapshot exported successfully
              {onChain && " · anchored on-chain"}
            </div>
          )}

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Blob ID</span>
              <div className="flex items-center gap-1 font-mono text-foreground/80 min-w-0">
                <span className="truncate max-w-[180px]">{blobId}</span>
                <CopyButton text={blobId} />
              </div>
            </div>

            {snapshotAt && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Exported</span>
                <span className="text-foreground/80">
                  {new Date(snapshotAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            {recordCount !== null && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Records</span>
                <span className="text-foreground/80">{recordCount}</span>
              </div>
            )}

            {walrusUrl && (
              <div className="pt-1">
                <a
                  href={walrusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View on Walrus
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60">
          No snapshot exported yet.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PassportPage() {
  const {
    passport,
    snapshot,
    isLoading,
    isSnapshoting,
    error,
    snapshotError,
    fetchPassport,
    exportSnapshot,
    syncStage,
    syncTxDigest,
    syncError,
    syncOnChain,
  } = usePassportStore();

  const isSyncing =
    syncStage === "building" ||
    syncStage === "signing" ||
    syncStage === "submitting";
  const syncLabel: Record<string, string> = {
    building: "Preparing…",
    signing: "Signing…",
    submitting: "Anchoring on-chain…",
  };

  useEffect(() => {
    fetchPassport();
  }, [fetchPassport]);

  if (isLoading || !passport) {
    return (
      <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
        <div className="mb-8 animate-pulse">
          <div className="h-3 w-24 rounded bg-muted mb-2" />
          <div className="h-8 w-32 rounded bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="h-80 rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-10 lg:px-10 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Fingerprint
            className="h-10 w-10 text-muted-foreground/30 mx-auto"
            strokeWidth={1}
          />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPassport}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const { pct, earnedInLevel, levelRange, isMaxLevel } =
    levelProgress(passport);

  const objectId = passport.objectId;

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* ── Header ── */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
          on-chain identity
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          passport
        </h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
        {/* ── Left: Passport card ── */}
        <div className="space-y-4">
          {/* Image — the SVG is the full credential art (portrait 3:4), so we
              contain it (never crop) and let it own the level/tier badge. */}
          <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-border/60 bg-[#0f0f1a] shadow-lg shadow-black/10">
            {passport.imageUrl ? (
              <Image
                src={passport.imageUrl}
                alt="Your Arktion passport"
                fill
                className="object-contain"
                sizes="300px"
                priority
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center flex-col gap-3 text-muted-foreground/40">
                <Fingerprint className="h-12 w-12" strokeWidth={1} />
                <span className="text-xs">Generating passport…</span>
              </div>
            )}
          </div>

          {/* Level progress */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Level {passport.level}
              </span>
              {isMaxLevel ? (
                <span className="text-yellow-500 font-medium">Max level</span>
              ) : (
                <span className="text-muted-foreground">
                  {earnedInLevel.toLocaleString()} /{" "}
                  {levelRange.toLocaleString()} INK
                </span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {!isMaxLevel && (
              <p className="text-[10px] text-muted-foreground/60">
                {pct}% to level {passport.level + 1}
              </p>
            )}
          </div>

          {/* Sui object link */}
          <div className="rounded-xl border border-border/60 bg-card px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-0.5">
                Sui object
              </p>
              {objectId ? (
                <p className="text-xs font-mono text-foreground/80 truncate">
                  {objectId.slice(0, 10)}…{objectId.slice(-6)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground/50">Not yet minted</p>
              )}
            </div>
            {objectId && (
              <div className="flex items-center gap-1 shrink-0">
                <CopyButton text={objectId} />
                <a
                  href={passport.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="View on Sui Explorer"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {objectId && (
            <div className="mt-3 border-t border-border/40 pt-3">
              {syncStage === "success" && syncTxDigest ? (
                <a
                  href={`https://suiscan.xyz/testnet/tx/${syncTxDigest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-green-500 hover:underline"
                >
                  Stats anchored on-chain — view transaction
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <button
                  onClick={() => syncOnChain()}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  {isSyncing && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isSyncing ? syncLabel[syncStage] : "Anchor stats on-chain"}
                </button>
              )}
              <p className="mt-1.5 text-[10px] text-muted-foreground/70">
                Push your latest level &amp; stats onto the passport NFT. You
                sign; gas is covered.
              </p>
              {syncStage === "error" && syncError && (
                <p className="mt-1.5 text-[10px] text-destructive">
                  {syncError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Stats + snapshot ── */}
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCell
              icon={BookOpen}
              label="chapters read"
              value={passport.chaptersRead}
              iconClass="bg-violet-500/10"
            />
            <StatCell
              icon={BookCheck}
              label="series completed"
              value={passport.seriesCompleted}
              iconClass="bg-green-500/10"
            />
            <StatCell
              icon={BookMarked}
              label="series tracked"
              value={passport.seriesTracked}
              iconClass="bg-orange-500/10"
            />
            <StatCell
              icon={Droplets}
              label="total INK earned"
              value={Number(passport.totalInkEarned).toLocaleString()}
              iconClass="bg-sky-500/10"
            />
          </div>

          {/* Snapshot */}
          <SnapshotSection
            passport={passport}
            latestSnapshot={snapshot}
            isExporting={isSnapshoting}
            exportError={snapshotError}
            onExport={exportSnapshot}
          />

          {/* Last synced */}
          {passport.lastSyncedAt && (
            <p className="text-xs text-muted-foreground/60">
              Last synced{" "}
              {new Date(passport.lastSyncedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
