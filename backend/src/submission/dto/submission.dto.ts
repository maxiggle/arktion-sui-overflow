export interface VoteTallyDto {
  approveCount: number;
  rejectCount: number;
  /** bigint serialised as decimal string */
  approveInk: string;
  rejectInk: string;
  totalInk: string;
  /** 0–100, rounded to 1 dp */
  approvalPct: number;
  /** total INK weight >= QUORUM_INK */
  quorumMet: boolean;
  /** quorum met AND outcome is decisive (>= 60 % or < 40 %) */
  finalisable: boolean;
  /** voting window has passed */
  expired: boolean;
}

export interface SubmissionDto {
  id: string;
  title: string;
  formatType: number;
  externalUrl: string;
  suggestedSource: string;
  status: number;
  rewardClaimed: boolean;
  reviewedAt: Date | null;
  createdAt: Date;
  votingEndsAt: Date;
  votes: VoteTallyDto;
  /** The calling user's own vote (1 | 0), or null if not voted / not known */
  myVote: 1 | 0 | null;
}

export interface CastVoteResponseDto {
  submissionId: string;
  vote: 1 | 0;
  inkWeight: string;
  autoFinalised: boolean;
}
