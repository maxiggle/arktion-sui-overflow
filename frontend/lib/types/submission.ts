export const SubmissionStatus = {
  PENDING: 0,
  APPROVED: 1,
  REJECTED: 2,
} as const;

export const SUBMISSION_STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
};

export const FormatType = {
  MANGA: 0,
  MANHWA: 1,
  MANHUA: 2,
  WEB_NOVEL: 3,
} as const;

export const FORMAT_TYPE_LABELS: Record<number, string> = {
  0: 'Manga',
  1: 'Manhwa',
  2: 'Manhua',
  3: 'Web Novel',
};

export interface VoteTallyDto {
  approveCount: number;
  rejectCount: number;
  /** bigint serialised as decimal string */
  approveInk: string;
  rejectInk: string;
  totalInk: string;
  /** 0–100, rounded to 1 dp */
  approvalPct: number;
  quorumMet: boolean;
  finalisable: boolean;
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
  reviewedAt: string | null;
  createdAt: string;
  votingEndsAt: string;
  votes: VoteTallyDto;
  /** The calling user's own vote (1 | 0), or null if not voted */
  myVote: 1 | 0 | null;
}

export interface CastVoteResponseDto {
  submissionId: string;
  vote: 1 | 0;
  inkWeight: string;
  autoFinalised: boolean;
}

export interface CreateSubmissionPayload {
  title: string;
  formatType: number;
  externalUrl: string;
  suggestedSource: string;
}
