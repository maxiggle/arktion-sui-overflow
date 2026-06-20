"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Loader2,
  ExternalLink,
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
import { useAuth } from "@/contexts/auth-context";
import { usePaymentStore } from "@/stores/payment.store";

// ─── Send modal ───────────────────────────────────────────────────────────────

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

  // Stable per send attempt so a retry reuses the same pending record server
  // side. Reset when the recipient/amount change or the send succeeds.
  const idempotencyKeyRef = useRef<string | null>(null);
  const lastAttemptRef = useRef<string>("");

  function handleClose(val: boolean) {
    if (!val) {
      resetSend();
      setAddress("");
      setAmount("");
      setValidationError(null);
      idempotencyKeyRef.current = null;
      lastAttemptRef.current = "";
    }
    onOpenChange(val);
  }

  async function handleSend() {
    setValidationError(null);
    if (!/^0x[a-fA-F0-9]{64}$/.test(address.trim())) {
      setValidationError("Enter a valid Sui address (0x + 64 hex chars).");
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setValidationError("Enter a USDC amount greater than 0.");
      return;
    }
    const microUsdc = Math.round(parsed * 1_000_000).toString();

    const attempt = `${address.trim()}:${microUsdc}`;
    if (!idempotencyKeyRef.current || lastAttemptRef.current !== attempt) {
      idempotencyKeyRef.current =
        typeof globalThis.crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `send-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      lastAttemptRef.current = attempt;
    }

    await executeSend({
      recipientAddress: address.trim(),
      amountUsdc: microUsdc,
      idempotencyKey: idempotencyKeyRef.current,
    });
    fetchUsdcBalance();

    if (usePaymentStore.getState().sendStage === "success") {
      idempotencyKeyRef.current = null;
      lastAttemptRef.current = "";
    }
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send USDC</DialogTitle>
          <DialogDescription>
            Transfer USDC to any Sui address. Gas is sponsored.
          </DialogDescription>
        </DialogHeader>

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
                  View on Suiscan <ExternalLink className="h-3 w-3" />
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
            <Button variant="outline" className="w-full" onClick={() => resetSend()}>
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
      </DialogContent>
    </Dialog>
  );
}

// ─── Receive modal ────────────────────────────────────────────────────────────

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Receive USDC</DialogTitle>
          <DialogDescription>
            Reader tips land at this address automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
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
          <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <p className="break-all font-mono text-xs text-foreground leading-relaxed">
              {walletAddress}
            </p>
          </div>
          <Button className="w-full" onClick={copyAddress}>
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy address
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorWalletPage() {
  const { user } = useAuth();
  const { usdcBalance, usdcBalanceLoading, usdcBalanceError, fetchUsdcBalance } =
    usePaymentStore();
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);

  useEffect(() => {
    fetchUsdcBalance();
  }, [fetchUsdcBalance]);

  const displayBalance =
    usdcBalance !== null
      ? (Number(usdcBalance) / 1_000_000).toFixed(2)
      : null;

  return (
    <div className="p-6 max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">wallet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          your Sui wallet — reader tips are sent here
        </p>
      </div>

      {/* USDC balance card */}
      <div className="rounded-2xl border border-border/60 bg-card p-8 space-y-6">
        <div>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">
            USDC balance
          </p>
          {usdcBalanceLoading ? (
            <div className="h-12 w-36 animate-pulse rounded-lg bg-muted" />
          ) : usdcBalanceError ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{usdcBalanceError}</span>
              <Button variant="outline" size="sm" onClick={fetchUsdcBalance}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <span className="text-5xl font-semibold tracking-tight leading-none">
                {displayBalance ?? "—"}
              </span>
              <span className="text-lg text-muted-foreground mb-0.5 font-light">
                USDC
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => setSendOpen(true)}>
            <ArrowUpRight className="h-4 w-4" />
            Send
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => setReceiveOpen(true)}>
            <ArrowDownLeft className="h-4 w-4" />
            Receive
          </Button>
        </div>
      </div>

      {/* Wallet address */}
      {user?.walletAddress && (
        <div className="rounded-xl border border-border/60 bg-card px-5 py-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
            Wallet address
          </p>
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate font-mono text-xs text-foreground">
              {user.walletAddress}
            </p>
            <a
              href={`https://suiscan.xyz/testnet/account/${user.walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
              title="View on Suiscan"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      <SendModal open={sendOpen} onOpenChange={setSendOpen} />
      {user?.walletAddress && (
        <ReceiveModal
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          walletAddress={user.walletAddress}
        />
      )}
    </div>
  );
}
