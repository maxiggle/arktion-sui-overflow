import { apiClient } from "./client";
import type { InkBalanceDto, InkLedgerPage } from "@/lib/types/ink";

export async function getInkBalance(): Promise<InkBalanceDto> {
  const { data } = await apiClient.get<InkBalanceDto>("/ink/balance");
  return data;
}

export async function getInkLedger(
  page = 1,
  limit = 20
): Promise<InkLedgerPage> {
  const { data } = await apiClient.get<InkLedgerPage>("/ink/ledger", {
    params: { page, limit },
  });
  return data;
}
