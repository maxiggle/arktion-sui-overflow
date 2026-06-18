"use client";

import React, { useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Vote,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  X,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useSubmissionStore } from "@/stores/submission.store";
import { useInkStore } from "@/stores/ink.store";
import { FORMAT_TYPE_LABELS, FormatType } from "@/lib/types/submission";
import type { SubmissionDto, VoteTallyDto } from "@/lib/types/submission";

function formatTimeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

const submitSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title too long"),
  formatType: z.number({ error: "Select a format" }),
  externalUrl: z.string().url("Must be a valid URL"),
  suggestedSource: z
    .string()
    .min(2, "Source is required")
    .max(200, "Source too long"),
});

type SubmitForm = z.infer<typeof submitSchema>;

function SubmitDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { submit } = useSubmissionStore();
  const [form, setForm] = useState<Partial<SubmitForm>>({});
  const [errors, setErrors] = useState<
    Partial<Record<keyof SubmitForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const set = (field: keyof SubmitForm, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = submitSchema.safeParse({
      ...form,
      formatType: form.formatType,
    });

    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, v?.[0]]),
        ) as Partial<Record<keyof SubmitForm, string>>,
      );
      return;
    }

    setSubmitting(true);
    try {
      await submit(result.data);
      onSuccess();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Suggest a series
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              The community will vote on whether to add it to Arktion
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Series title
            </label>
            <input
              type="text"
              placeholder="e.g. Solo Leveling"
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.title && (
              <p className="text-[11px] text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Format
            </label>
            <select
              value={form.formatType ?? ""}
              onChange={(e) => set("formatType", Number(e.target.value))}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>
                Select format
              </option>
              {Object.entries(FORMAT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {errors.formatType && (
              <p className="text-[11px] text-destructive">
                {errors.formatType}
              </p>
            )}
          </div>

          {/* External URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Link to the series
            </label>
            <input
              type="url"
              placeholder="https://mangadex.org/title/..."
              value={form.externalUrl ?? ""}
              onChange={(e) => set("externalUrl", e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.externalUrl && (
              <p className="text-[11px] text-destructive">
                {errors.externalUrl}
              </p>
            )}
          </div>

          {/* Suggested source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Where is it from?
            </label>
            <input
              type="text"
              placeholder="e.g. MangaDex, Kakao, Piccoma"
              value={form.suggestedSource ?? ""}
              onChange={(e) => set("suggestedSource", e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {errors.suggestedSource && (
              <p className="text-[11px] text-destructive">
                {errors.suggestedSource}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-xs text-destructive">{serverError}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VoteBar({ tally }: { tally: VoteTallyDto }) {
  const pct = tally.approvalPct;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {pct.toFixed(1)}% approve{" "}
          <span className="text-foreground/40">·</span>{" "}
          {tally.approveCount + tally.rejectCount} votes
        </span>
        {tally.quorumMet ? (
          <span className="text-green-500 text-[10px] font-medium tracking-wide">
            QUORUM MET
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">
            {Number(tally.totalInk).toLocaleString()} / 500 INK
          </span>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
        <span>Approve 60% threshold</span>
        {tally.finalisable && (
          <span className="text-amber-500 font-medium">Ready to finalise</span>
        )}
      </div>
    </div>
  );
}

function SubmissionCard({
  sub,
  inkBalance,
}: {
  sub: SubmissionDto;
  inkBalance: number;
}) {
  const { vote: castVote, voting } = useSubmissionStore();
  const isVoting = voting[sub.id] ?? false;
  const canVote = inkBalance >= 1 && !sub.votes.expired;
  const timeLeft = formatTimeLeft(sub.votingEndsAt);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm shadow-black/5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-medium text-muted-foreground border border-border/60 rounded px-1.5 py-0.5 uppercase tracking-wider">
              {FORMAT_TYPE_LABELS[sub.formatType] ?? "Unknown"}
            </span>
            {sub.votes.expired && (
              <span className="text-[10px] font-medium text-muted-foreground/50 border border-border/40 rounded px-1.5 py-0.5">
                Voting closed
              </span>
            )}
          </div>
          <h3 className="font-medium text-foreground leading-snug">
            {sub.title}
          </h3>
          <p className="text-xs text-muted-foreground/60 truncate">
            {sub.suggestedSource}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={sub.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-7 w-7 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent transition-colors"
            aria-label="View original"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </div>

      {/* Vote tally */}
      <VoteBar tally={sub.votes} />

      {/* Vote actions */}
      <div className="flex items-center gap-2">
        {sub.votes.expired ? (
          <p className="text-xs text-muted-foreground/50">
            Voting window closed
          </p>
        ) : (
          <>
            <Button
              size="sm"
              variant={sub.myVote === 1 ? "default" : "outline"}
              disabled={!canVote || isVoting}
              onClick={() => castVote(sub.id, 1)}
              className="flex-1"
            >
              {isVoting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Approve
              {sub.myVote === 1 && " ✓"}
            </Button>
            <Button
              size="sm"
              variant={sub.myVote === 0 ? "destructive" : "outline"}
              disabled={!canVote || isVoting}
              onClick={() => castVote(sub.id, 0)}
              className="flex-1"
            >
              {isVoting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Reject
              {sub.myVote === 0 && " ✓"}
            </Button>
          </>
        )}

        {inkBalance < 1 && !sub.votes.expired && (
          <p className="text-[10px] text-amber-500/80 ml-1">
            Need INK to vote. Read chapters to earn.
          </p>
        )}
      </div>

      {sub.myVote !== null && !sub.votes.expired && (
        <p className="text-[10px] text-muted-foreground/50">
          You voted{" "}
          <span
            className={sub.myVote === 1 ? "text-green-500" : "text-destructive"}
          >
            {sub.myVote === 1 ? "approve" : "reject"}
          </span>
          . You can change your vote.
        </p>
      )}
    </div>
  );
}

export default function SubmissionsPage() {
  const { submissions, loading, error, fetchDao } = useSubmissionStore();
  const { balance, fetchBalance } = useInkStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchDao();
    fetchBalance();
  }, [fetchDao, fetchBalance]);

  const inkBalance = Number(balance?.balance ?? "0");

  function handleSuccess() {
    setDialogOpen(false);
    setSubmitted(true);
    void fetchDao();
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {dialogOpen && (
        <SubmitDialog
          onClose={() => setDialogOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
            community governance
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            DAO votes
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            Readers with INK decide which series get added to Arktion. Vote with
            your INK weight — 500 INK quorum, 60% approval to pass.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {balance && (
            <div className="shrink-0 rounded-xl border border-border/60 bg-card px-4 py-3 text-right">
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
                your INK
              </p>
              <p className="text-xl font-semibold text-foreground leading-tight">
                {inkBalance.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                {inkBalance >= 1
                  ? "eligible to vote"
                  : "read chapters to earn INK"}
              </p>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Suggest a series
          </Button>
        </div>
      </div>

      {/* Success banner */}
      {submitted && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Suggestion submitted — the community will vote on it over the next 7
          days.
        </div>
      )}

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Vote
            className="h-10 w-10 text-muted-foreground/30"
            strokeWidth={1}
          />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDao}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Vote
            className="h-10 w-10 text-muted-foreground/30"
            strokeWidth={1}
          />
          <p className="text-sm font-medium text-foreground">
            No open submissions
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            No series suggestions are waiting for a vote right now. Be the first
            to suggest one.
          </p>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="mt-1 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Suggest a series
          </Button>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {submissions.map((sub) => (
            <SubmissionCard key={sub.id} sub={sub} inkBalance={inkBalance} />
          ))}
        </div>
      )}
    </div>
  );
}
