import { create } from 'zustand';
import {
  getDaoSubmissions,
  castVote as apiCastVote,
  createSubmission as apiCreate,
} from '@/lib/api/submission';
import { getErrorMessage } from '@/lib/api/client';
import type { SubmissionDto, CreateSubmissionPayload } from '@/lib/types/submission';

interface SubmissionState {
  submissions: SubmissionDto[];
  loading: boolean;
  error: string | null;
  voting: Record<string, boolean>; // submissionId → in-flight
  voteError: string | null;

  fetchDao: () => Promise<void>;
  vote: (submissionId: string, vote: 0 | 1) => Promise<void>;
  submit: (payload: CreateSubmissionPayload) => Promise<SubmissionDto>;
  reset: () => void;
}

const INITIAL: Pick<
  SubmissionState,
  'submissions' | 'loading' | 'error' | 'voting' | 'voteError'
> = {
  submissions: [],
  loading: false,
  error: null,
  voting: {},
  voteError: null,
};

export const useSubmissionStore = create<SubmissionState>((set, get) => ({
  ...INITIAL,

  fetchDao: async () => {
    set({ loading: true, error: null });
    try {
      const submissions = await getDaoSubmissions();
      set({ submissions, loading: false });
    } catch (err) {
      set({ error: getErrorMessage(err), loading: false });
    }
  },

  vote: async (submissionId, vote) => {
    set((s) => ({
      voting: { ...s.voting, [submissionId]: true },
      voteError: null,
    }));
    try {
      const result = await apiCastVote(submissionId, vote);

      // Optimistically update the local submission's myVote and tally
      set((s) => ({
        voting: { ...s.voting, [submissionId]: false },
        submissions: s.submissions.map((sub) => {
          if (sub.id !== submissionId) return sub;

          // If auto-finalised, re-fetch will clean up — for now mark it
          const prevVote = sub.myVote;

          // Optimistic tally — number arithmetic is fine for display purposes
          let approveInk = Number(sub.votes.approveInk);
          let rejectInk = Number(sub.votes.rejectInk);
          let approveCount = sub.votes.approveCount;
          let rejectCount = sub.votes.rejectCount;
          const inkW = Number(result.inkWeight);

          // Undo previous vote weight if changing
          if (prevVote === 1) {
            approveInk -= inkW;
            approveCount = Math.max(0, approveCount - 1);
          } else if (prevVote === 0) {
            rejectInk -= inkW;
            rejectCount = Math.max(0, rejectCount - 1);
          }

          // Apply new vote
          if (vote === 1) {
            approveInk += inkW;
            approveCount++;
          } else {
            rejectInk += inkW;
            rejectCount++;
          }

          const totalInk = approveInk + rejectInk;
          const approvalPct =
            totalInk === 0
              ? 0
              : Math.round((approveInk / totalInk) * 1000) / 10;
          const quorumMet = totalInk >= 500;
          const approveBps = totalInk === 0 ? 0 : (approveInk / totalInk) * 10000;
          const finalisable =
            quorumMet && (approveBps >= 6000 || approveBps < 4000);

          return {
            ...sub,
            myVote: result.vote,
            votes: {
              approveCount,
              rejectCount,
              approveInk: approveInk.toString(),
              rejectInk: rejectInk.toString(),
              totalInk: totalInk.toString(),
              approvalPct,
              quorumMet,
              finalisable,
              expired: sub.votes.expired,
            },
          };
        }),
      }));

      // If auto-finalised, remove from the DAO list
      if (result.autoFinalised) {
        set((s) => ({
          submissions: s.submissions.filter((sub) => sub.id !== submissionId),
        }));
      }
    } catch (err) {
      set((s) => ({
        voting: { ...s.voting, [submissionId]: false },
        voteError: getErrorMessage(err),
      }));
    }
  },

  submit: async (payload) => {
    const result = await apiCreate(payload);
    return result;
  },

  reset: () => set(INITIAL),
}));
