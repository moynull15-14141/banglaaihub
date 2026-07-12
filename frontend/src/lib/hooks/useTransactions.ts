import { useQuery } from '@tanstack/react-query';
import { getRevenueSummary, listResourcePurchases, type PurchaseStatus } from '@/lib/api/transactions';

export function useResourcePurchases(status?: PurchaseStatus) {
  return useQuery({ queryKey: ['admin', 'resource-purchases', status], queryFn: () => listResourcePurchases(status) });
}

export function useRevenueSummary() {
  return useQuery({ queryKey: ['admin', 'resource-purchases', 'summary'], queryFn: getRevenueSummary });
}
