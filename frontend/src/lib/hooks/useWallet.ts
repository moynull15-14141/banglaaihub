import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approvePayout,
  getMyWallet,
  listAdminPayouts,
  listMyPayouts,
  markPayoutPaid,
  rejectPayout,
  requestPayout,
  type Currency,
  type PayoutMethod,
  type PayoutStatus,
} from '@/lib/api/wallet';

const WALLET_KEY = ['wallet'];
const MY_PAYOUTS_KEY = ['payouts', 'mine'];
const ADMIN_PAYOUTS_KEY = ['payouts', 'admin'];

export function useMyWallet() {
  return useQuery({ queryKey: WALLET_KEY, queryFn: getMyWallet });
}

export function useMyPayouts() {
  return useQuery({ queryKey: MY_PAYOUTS_KEY, queryFn: listMyPayouts });
}

export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amount_cents: number; currency: Currency; method: PayoutMethod; destination: string }) =>
      requestPayout(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WALLET_KEY });
      void queryClient.invalidateQueries({ queryKey: MY_PAYOUTS_KEY });
    },
  });
}

export function useAdminPayouts(status?: PayoutStatus) {
  return useQuery({ queryKey: [...ADMIN_PAYOUTS_KEY, status], queryFn: () => listAdminPayouts(status) });
}

export function useApprovePayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => approvePayout(id, notes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ADMIN_PAYOUTS_KEY }),
  });
}

export function useRejectPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => rejectPayout(id, notes),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ADMIN_PAYOUTS_KEY }),
  });
}

export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidReference }: { id: string; paidReference: string }) => markPayoutPaid(id, paidReference),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ADMIN_PAYOUTS_KEY }),
  });
}
