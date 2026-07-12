import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';

export type Currency = 'BDT' | 'USD';
export type PayoutMethod = 'bkash' | 'nagad' | 'rocket' | 'bank_transfer';
export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface WalletLedgerEntry {
  id: string;
  currency: Currency;
  type: 'sale_earning' | 'withdrawal' | 'adjustment';
  amountCents: number;
  balanceAfterCents: number;
  createdAt: string;
}

export interface WalletSummary {
  balances: Record<Currency, number>;
  ledger: WalletLedgerEntry[];
}

export interface PayoutRequest {
  id: string;
  userId: string;
  amountCents: number;
  currency: Currency;
  method: PayoutMethod;
  destination: string;
  status: PayoutStatus;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  paidReference: string | null;
  paidAt: string | null;
  createdAt: string;
  user?: { id: string; username: string; displayName: string | null; email: string };
}

export async function getMyWallet(): Promise<WalletSummary> {
  const response = await apiClient.get<ApiSuccessResponse<WalletSummary>>('/users/me/wallet');
  return response.data.data;
}

export async function listMyPayouts(): Promise<PayoutRequest[]> {
  const response = await apiClient.get<ApiSuccessResponse<PayoutRequest[]>>('/users/me/payouts');
  return response.data.data;
}

export async function requestPayout(input: {
  amount_cents: number;
  currency: Currency;
  method: PayoutMethod;
  destination: string;
}): Promise<PayoutRequest> {
  const response = await apiClient.post<ApiSuccessResponse<PayoutRequest>>('/users/me/payouts', input);
  return response.data.data;
}

// --- Admin --------------------------------------------------------------------

export async function listAdminPayouts(status?: PayoutStatus): Promise<PayoutRequest[]> {
  const response = await apiClient.get<ApiSuccessResponse<PayoutRequest[]>>('/admin/payouts', {
    params: status ? { status } : undefined,
  });
  return response.data.data;
}

export async function approvePayout(id: string, notes?: string): Promise<PayoutRequest> {
  const response = await apiClient.post<ApiSuccessResponse<PayoutRequest>>(`/admin/payouts/${id}/approve`, {
    notes,
  });
  return response.data.data;
}

export async function rejectPayout(id: string, notes?: string): Promise<PayoutRequest> {
  const response = await apiClient.post<ApiSuccessResponse<PayoutRequest>>(`/admin/payouts/${id}/reject`, {
    notes,
  });
  return response.data.data;
}

export async function markPayoutPaid(id: string, paidReference: string): Promise<PayoutRequest> {
  const response = await apiClient.post<ApiSuccessResponse<PayoutRequest>>(`/admin/payouts/${id}/mark-paid`, {
    paid_reference: paidReference,
  });
  return response.data.data;
}
