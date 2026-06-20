import { apiClient } from "./client";
import type {
  BuildTipResponse,
  ConfirmTipResponse,
  TipHistoryPage,
  UsdcBalanceResponse,
  BuildSendResponse,
  SubmitSendResponse,
  SendHistoryPage,
} from "@/lib/types/payment";

export async function buildTip(params: {
  seriesId: string;
  amountUsdc: string;
  idempotencyKey: string;
}): Promise<BuildTipResponse> {
  const { data } = await apiClient.post<BuildTipResponse>(
    "/payment/tip/build",
    params,
  );
  return data;
}

export async function confirmTip(params: {
  tipTransactionId: string;
  txBytes: string;
  userSignature: string;
}): Promise<ConfirmTipResponse> {
  const { data } = await apiClient.post<ConfirmTipResponse>(
    "/payment/tip/confirm",
    params,
  );
  return data;
}

export async function getTipHistory(
  direction: "sent" | "received" = "sent",
  page = 1,
  limit = 20,
): Promise<TipHistoryPage> {
  const { data } = await apiClient.get<TipHistoryPage>("/payment/tips", {
    params: { direction, page, limit },
  });
  return data;
}

export async function getUsdcBalance(): Promise<UsdcBalanceResponse> {
  const { data } = await apiClient.get<UsdcBalanceResponse>(
    "/payment/usdc-balance",
  );
  return data;
}

export async function buildSend(params: {
  recipientAddress: string;
  amountUsdc: string;
  idempotencyKey: string;
}): Promise<BuildSendResponse> {
  const { data } = await apiClient.post<BuildSendResponse>(
    "/payment/send/build",
    params,
  );
  return data;
}

export async function submitSend(params: {
  sendTransactionId: string;
  txBytes: string;
  userSignature: string;
}): Promise<SubmitSendResponse> {
  const { data } = await apiClient.post<SubmitSendResponse>(
    "/payment/send/submit",
    params,
  );
  return data;
}

export async function getSendHistory(
  page = 1,
  limit = 20,
): Promise<SendHistoryPage> {
  const { data } = await apiClient.get<SendHistoryPage>("/payment/sends", {
    params: { page, limit },
  });
  return data;
}
