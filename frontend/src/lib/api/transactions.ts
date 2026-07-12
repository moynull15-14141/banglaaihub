import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type { Currency } from '@/lib/api/wallet';

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface ResourcePurchaseRow {
  id: string;
  resource: { slug: string; title: string; type: string };
  buyer: { id: string; username: string; displayName: string | null; email: string };
  amount_cents: number;
  currency: Currency;
  platform_fee_cents: number;
  author_earnings_cents: number;
  status: PurchaseStatus;
  gateway_name: string;
  gateway_transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface RevenueSummary {
  totalPlatformFeeCents: Record<string, number>;
  totalSalesCents: Record<string, number>;
  completedSalesCount: number;
}

export async function listResourcePurchases(status?: PurchaseStatus): Promise<ResourcePurchaseRow[]> {
  const response = await apiClient.get<ApiSuccessResponse<ResourcePurchaseRow[]>>('/admin/resource-purchases', {
    params: status ? { status } : undefined,
  });
  return response.data.data;
}

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const response = await apiClient.get<ApiSuccessResponse<RevenueSummary>>('/admin/resource-purchases/summary');
  return response.data.data;
}
