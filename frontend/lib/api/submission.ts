import { apiClient } from './client';
import type {
  SubmissionDto,
  CastVoteResponseDto,
  CreateSubmissionPayload,
} from '@/lib/types/submission';

export async function getMySubmissions(): Promise<SubmissionDto[]> {
  const { data } = await apiClient.get<SubmissionDto[]>('/submissions/mine');
  return data;
}

export async function getDaoSubmissions(): Promise<SubmissionDto[]> {
  const { data } = await apiClient.get<SubmissionDto[]>('/submissions/dao');
  return data;
}

export async function createSubmission(
  payload: CreateSubmissionPayload,
): Promise<SubmissionDto> {
  const { data } = await apiClient.post<SubmissionDto>('/submissions', payload);
  return data;
}

export async function castVote(
  submissionId: string,
  vote: 0 | 1,
): Promise<CastVoteResponseDto> {
  const { data } = await apiClient.post<CastVoteResponseDto>(
    `/submissions/${submissionId}/vote`,
    { vote },
  );
  return data;
}
