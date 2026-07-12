import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSslcommerzSettings, saveSslcommerzSettings } from '@/lib/api/paymentSettings';

const KEY = ['admin', 'payment-settings', 'sslcommerz'];

export function useSslcommerzSettings() {
  return useQuery({ queryKey: KEY, queryFn: getSslcommerzSettings });
}

export function useSaveSslcommerzSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { store_id: string; store_passwd?: string; is_live: boolean }) =>
      saveSslcommerzSettings(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
