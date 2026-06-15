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
}
