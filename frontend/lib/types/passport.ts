export interface PassportDto {
  id: string;
  userId: string;
  suiObjectId: string;
  level: number;
  totalInkEarned: string;
  chaptersRead: number;
  seriesCompleted: number;
  seriesTracked: number;
  imageUrl: string;
  walrusSnapshotBlobId: string | null;
  walrusSnapshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotResult {
  blobId: string;
  walrusUrl: string;
  snapshotAt: string;
  recordCount: number;
  onChainAnchored: boolean;
}
