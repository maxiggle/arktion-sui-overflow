/** status values mirror TipStatus on the backend */
export const TipStatus = {
  PENDING: 0,
  CONFIRMED: 1,
  FAILED: 2,
} as const;
export type TipStatus = (typeof TipStatus)[keyof typeof TipStatus];

export interface BuildTipResponse {
  tipTransactionId: string;
  txBytes: string;
}

export interface ConfirmTipResponse {
  txDigest: string;
}

export interface TipHistoryItem {
  id: string;
  amountUsdc: string;
  status: TipStatus;
  suiTxDigest: string | null;
  confirmedAt: string | null;
  createdAt: string;
  series: { id: string; title: string };
  sender: { id: string; displayName: string | null; avatarUrl: string | null };
  receiver: { id: string; displayName: string | null; avatarUrl: string | null };
}

export interface TipHistoryPage {
  data: TipHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface UsdcBalanceResponse {
  balance: string;
  usdcCoinType: string;
}

export interface BuildSendResponse {
  sendTransactionId: string;
  txBytes: string;
}

export interface SubmitSendResponse {
  txDigest: string;
}

export interface SendHistoryItem {
  id: string;
  recipientAddress: string;
  amountUsdc: string;
  status: TipStatus;
  suiTxDigest: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export interface SendHistoryPage {
  data: SendHistoryItem[];
  total: number;
  page: number;
  limit: number;
}
