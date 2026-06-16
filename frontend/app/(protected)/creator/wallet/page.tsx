"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Loader2, Wallet, Zap } from "lucide-react";
import { usePassportStore } from "@/stores/passport.store";
import { useInkStore } from "@/stores/ink.store";

function shortenAddress(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 7)}…${addr.slice(-5)}`;
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "copied" : "copy"}
    </button>
  );
}

export default function WalletPage() {
  const { passport, isLoading: passportLoading, fetchPassport } = usePassportStore();
  const { balance: inkBalance, balanceLoading, fetchBalance } = useInkStore();

  useEffect(() => {
    if (!passport && !passportLoading) fetchPassport();
    if (!inkBalance && !balanceLoading) fetchBalance();
  }, [passport, passportLoading, fetchPassport, inkBalance, balanceLoading, fetchBalance]);

  const loading = passportLoading || balanceLoading;

  if (loading && !passport) {
    return (
      <div className="p-6 max-w-lg mx-auto flex items-center gap-2 py-12">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">loading…</span>
      </div>
    );
  }

  const walletAddress = passport?.walletAddress ?? "";
  const inkAmount = inkBalance?.balance ?? "0";
  const inkLevel = inkBalance?.level ?? passport?.level ?? 0;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          your Sui wallet linked via zkLogin
        </p>
      </div>

      {/* Wallet address card */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            sui address
          </p>
        </div>

        {walletAddress ? (
          <>
            <p className="font-mono text-sm break-all leading-relaxed">
              {walletAddress}
            </p>
            <div className="flex items-center gap-4 pt-1 border-t border-border/50">
              <CopyAddress address={walletAddress} />
              {passport?.explorerUrl && (
                <a
                  href={passport.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  view on explorer
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">no wallet linked</p>
        )}
      </div>

      {/* INK balance card */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            ink balance
          </p>
        </div>

        <div className="flex items-end gap-3">
          <p className="text-3xl font-semibold tabular-nums">
            {Number(inkAmount).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground pb-0.5">INK</p>
          <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            level {inkLevel}
          </span>
        </div>

        {inkBalance?.totalInkEarned && (
          <p className="text-xs text-muted-foreground">
            {Number(inkBalance.totalInkEarned).toLocaleString()} INK earned lifetime
          </p>
        )}
      </div>

      {/* On-chain passport */}
      {passport?.objectId && (
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            on-chain passport
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">object id</span>
              <span className="font-mono text-xs">
                {shortenAddress(passport.objectId)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">chapters read</span>
              <span className="tabular-nums">{passport.chaptersRead}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">series completed</span>
              <span className="tabular-nums">{passport.seriesCompleted}</span>
            </div>
            {passport.lastSyncedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">last synced</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(passport.lastSyncedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {!passport?.objectId && (
        <div className="rounded-xl border border-dashed border-border/60 p-5 text-center">
          <p className="text-sm text-muted-foreground">passport not yet minted</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            your passport is created on-chain once you reach level 2
          </p>
        </div>
      )}
    </div>
  );
}
