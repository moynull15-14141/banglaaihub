import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';

export interface PurchaseStatus {
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  resource_slug: string;
  resource_title: string;
}

// Polled by the /payments/result page after returning from SSLCommerz — the
// redirect's own query params are never trusted as proof of payment, only
// this (which reflects the IPN-driven backend state).
export async function getPurchaseStatus(purchaseId: string): Promise<PurchaseStatus> {
  const response = await apiClient.get<ApiSuccessResponse<PurchaseStatus>>(
    `/payments/purchases/${encodeURIComponent(purchaseId)}`,
  );
  return response.data.data;
}
