/** Matches the backend PassportService.findByUserId response shape. */
export interface PassportDto {
  objectId: string | null;
  level: number;
  totalInkEarned: string;
  chaptersRead: number;
  seriesCompleted: number;
  seriesTracked: number;
  identityBlobId: string | null;
  identityBlobUrl: string | null;
  lastSyncedAt: string | null;
  explorerUrl: string;
  walletAddress: string;
  imageUrl: string | null;
}

export interface SnapshotResult {
  blobId: string;
  walrusUrl: string;
  snapshotAt: string;
  recordCount: number;
  onChainAnchored: boolean;
}

export interface BuildSyncResponse {
  txBytes: string;
}

export interface SubmitSyncResponse {
  txDigest: string;
}
