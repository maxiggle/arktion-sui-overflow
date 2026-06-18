"use client";

import React, { useEffect } from "react";
import { ExternalLink, Loader2, Vote, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubmissionStore } from "@/stores/submission.store";
import { useInkStore } from "@/stores/ink.store";
import { FORMAT_TYPE_LABELS } from "@/lib/types/submission";
import type { SubmissionDto, VoteTallyDto } from "@/lib/types/submission";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}

// ── Vote bar ──────────────────────────────────────────────────────────────────

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
        <span
          className={`h-1 w-px bg-foreground/20 absolute`}
          style={{ left: "60%" }}
        />
        {tally.finalisable && (
          <span className="text-amber-500 font-medium">Ready to finalise</span>
        )}
      </div>
    </div>
  );
}

// ── Submission card ───────────────────────────────────────────────────────────

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
          <h3 className="font-medium text-foreground leading-snug">{sub.title}</h3>
          <p className="text-xs text-muted-foreground/60 truncate">{sub.suggestedSource}</p>
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
          <p className="text-xs text-muted-foreground/50">Voting window closed</p>
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
            className={
              sub.myVote === 1 ? "text-green-500" : "text-destructive"
            }
          >
            {sub.myVote === 1 ? "approve" : "reject"}
          </span>
          . You can change your vote.
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SubmissionsPage() {
  const { submissions, loading, error, fetchDao } = useSubmissionStore();
  const { balance, fetchBalance } = useInkStore();

  useEffect(() => {
    fetchDao();
    fetchBalance();
  }, [fetchDao, fetchBalance]);

  const inkBalance = Number(balance?.balance ?? "0");

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
            community governance
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            DAO votes
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
            Readers with INK decide which series get added to Arktion. Vote
            with your INK weight — 500 INK quorum, 60% approval to pass.
          </p>
        </div>

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
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Vote className="h-10 w-10 text-muted-foreground/30" strokeWidth={1} />
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
            No series suggestions are waiting for a vote right now. Check back
            later.
          </p>
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
