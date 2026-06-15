"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Droplets,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Zap,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useInkStore } from "@/stores/ink.store";
import { usePaymentStore } from "@/stores/payment.store";
import { useAuth } from "@/contexts/auth-context";
import { LEVEL_THRESHOLDS, INK_TRIGGER_LABELS } from "@/lib/types/ink";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ─── Responsive modal wrapper ────────────────────────────────────────────────

function WalletModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl px-6 pb-8 pt-6">
          <SheetHeader className="mb-6 p-0">
            <SheetTitle>{title}</SheetTitle>
            {description && (
              <SheetDescription>{description}</SheetDescription>
            )}
          </SheetHeader>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ─── Send sheet ───────────────────────────────────────────────────────────────

function SendModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { sendStage, sendTxDigest, sendError, executeSend, resetSend, fetchUsdcBalance } =
    usePaymentStore();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleClose(val: boolean) {
    if (!val) {
      resetSend();
      setAddress("");
      setAmount("");
      setValidationError(null);
    }
    onOpenChange(val);
  }

  async function handleSend() {
    setValidationError(null);
    if (!/^0x[a-fA-F0-9]{64}$/.test(address.trim())) {
      setValidationError(
        "Enter a valid Sui address (0x followed by 64 hex characters).",
      );
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setValidationError("Enter a valid USDC amount greater than 0.");
      return;
    }
    const microUsdc = Math.round(parsed * 1_000_000).toString();
    await executeSend({ recipientAddress: address.trim(), amountUsdc: microUsdc });
    fetchUsdcBalance();
  }

  const isWorking =
    sendStage === "building" ||
    sendStage === "signing" ||
    sendStage === "confirming";

  const stageLabel: Record<string, string> = {
    building: "Building transaction…",
    signing: "Waiting for signature…",
    confirming: "Submitting to chain…",
  };

  return (
    <WalletModal
      open={open}
      onOpenChange={handleClose}
      title="Send USDC"
      description="Transfer USDC to any Sui address. Gas is covered."
    >
      {sendStage === "success" ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CircleCheck className="h-12 w-12 text-green-500" strokeWidth={1.5} />
          <div>
            <p className="font-medium">Sent successfully</p>
            {sendTxDigest && (
              <a
                href={`https://suiscan.xyz/testnet/tx/${sendTxDigest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                View on Suiscan
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <Button className="w-full" onClick={() => handleClose(false)}>
            Done
          </Button>
        </div>
      ) : sendStage === "error" ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CircleX className="h-12 w-12 text-destructive" strokeWidth={1.5} />
          <div>
            <p className="font-medium">Transaction failed</p>
            <p className="mt-1 text-sm text-muted-foreground">{sendError}</p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => resetSend()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="send-address">Recipient address</Label>
            <Input
              id="send-address"
              placeholder="0x…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={isWorking}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="send-amount">Amount (USDC)</Label>
            <Input
              id="send-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isWorking}
            />
          </div>

          {validationError && (
            <p className="text-xs text-destructive">{validationError}</p>
          )}

          {isWorking && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              {stageLabel[sendStage]}
            </div>
          )}

          <Button className="w-full" onClick={handleSend} disabled={isWorking}>
            {isWorking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      )}
    </WalletModal>
  );
}

// ─── Receive sheet ────────────────────────────────────────────────────────────

function ReceiveModal({
  open,
  onOpenChange,
  walletAddress,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <WalletModal
      open={open}
      onOpenChange={onOpenChange}
      title="Receive USDC"
      description="Share your Sui wallet address to receive USDC."
    >
      <div className="space-y-5 py-2">
        {/* QR code */}
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(walletAddress)}`}
            alt="Wallet QR code"
            width={180}
            height={180}
            className="rounded-xl border border-border/60"
          />
        </div>

        {/* Address display */}
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
          <p className="break-all font-mono text-xs text-foreground leading-relaxed">
            {walletAddress}
          </p>
        </div>

        <Button className="w-full" onClick={copyAddress}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy address
            </>
          )}
        </Button>
      </div>
    </WalletModal>
  );
}

// ─── USDC balance card ────────────────────────────────────────────────────────

function UsdcCard({
  onSend,
  onReceive,
}: {
  onSend: () => void;
  onReceive: () => void;
}) {
  const { usdcBalance, usdcBalanceLoading, usdcBalanceError, fetchUsdcBalance } =
    usePaymentStore();

  const displayBalance =
    usdcBalance !== null
      ? (Number(usdcBalance) / 1_000_000).toFixed(2)
      : null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-8 space-y-6">
      <div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">
          USDC balance
        </p>
        {usdcBalanceLoading ? (
          <div className="h-12 w-36 animate-pulse rounded-lg bg-muted" />
        ) : usdcBalanceError ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {usdcBalanceError}
            </span>
            <Button variant="outline" size="sm" onClick={fetchUsdcBalance}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-foreground leading-none">
              {displayBalance ?? "—"}
            </span>
            <span className="text-lg text-muted-foreground mb-0.5 font-light">
              USDC
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={onSend}>
          <ArrowUpRight className="h-4 w-4" />
          Send
        </Button>
        <Button className="flex-1" variant="outline" onClick={onReceive}>
          <ArrowDownLeft className="h-4 w-4" />
          Receive
        </Button>
      </div>
    </div>
  );
}

// ─── INK balance card ─────────────────────────────────────────────────────────

function levelProgress(level: number, totalEarned: number) {
  const prevThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;
  if (!nextThreshold)
    return { pct: 100, earnedInLevel: 0, levelRange: 0, isMaxLevel: true };
  const earnedInLevel = totalEarned - prevThreshold;
  const levelRange = nextThreshold - prevThreshold;
  return {
    pct: Math.min(100, Math.round((earnedInLevel / levelRange) * 100)),
    earnedInLevel,
    levelRange,
    isMaxLevel: false,
  };
}

function InkCard() {
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
    totalEarned,
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

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Level {balance.level}</span>
          {isMaxLevel ? (
            <span className="text-yellow-500 font-medium">Max level</span>
          ) : (
            <span className="text-muted-foreground">
              {earnedInLevel.toLocaleString()} / {levelRange.toLocaleString()} INK
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

// ─── Ledger ───────────────────────────────────────────────────────────────────

const LEDGER_LIMIT = 20;

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

function LedgerSection() {
  const { ledger, ledgerLoading, ledgerError, fetchLedger } = useInkStore();
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLedger(page, LEDGER_LIMIT);
  }, [fetchLedger, page]);

  const totalPages = ledger ? Math.ceil(ledger.total / LEDGER_LIMIT) : 1;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
          <h2 className="text-sm font-medium text-foreground">INK history</h2>
        </div>
        {ledger && (
          <span className="text-xs text-muted-foreground">
            {ledger.total.toLocaleString()} entries
          </span>
        )}
      </div>

      <div>
        {ledgerLoading ? (
          <LedgerSkeleton />
        ) : ledgerError ? (
          <div className="flex items-center justify-between gap-4 px-5 py-8">
            <p className="text-sm text-muted-foreground">{ledgerError}</p>
            <Button variant="outline" size="sm" onClick={() => fetchLedger(page, LEDGER_LIMIT)}>
              Retry
            </Button>
          </div>
        ) : !ledger || ledger.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Droplets className="h-9 w-9 text-muted-foreground/20" strokeWidth={1} />
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
                  <Droplets className="h-3.5 w-3.5 text-sky-500" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground leading-none">
                    {INK_TRIGGER_LABELS[entry.actionType] ?? "INK earned"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {entry.suiTxDigest && (
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${entry.suiTxDigest}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        tx <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-sky-500 shrink-0 tabular-nums">
                +{Number(entry.amount).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

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
  const { user } = useAuth();
  const { fetchBalance } = useInkStore();
  const { fetchUsdcBalance } = usePaymentStore();
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchUsdcBalance();
  }, [fetchBalance, fetchUsdcBalance]);

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
        <UsdcCard
          onSend={() => setSendOpen(true)}
          onReceive={() => setReceiveOpen(true)}
        />
        <InkCard />
        <LedgerSection />
      </div>

      <SendModal open={sendOpen} onOpenChange={setSendOpen} />
      {user && (
        <ReceiveModal
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          walletAddress={user.walletAddress}
        />
      )}
    </div>
  );
}
