import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';

export interface SslcommerzSettings {
  store_id: string | null;
  has_store_password: boolean;
  is_live: boolean;
  configured: boolean;
}

export async function getSslcommerzSettings(): Promise<SslcommerzSettings> {
  const response = await apiClient.get<ApiSuccessResponse<SslcommerzSettings>>('/admin/payment-settings/sslcommerz');
  return response.data.data;
}

export async function saveSslcommerzSettings(input: {
  store_id: string;
  store_passwd?: string;
  is_live: boolean;
}): Promise<void> {
  await apiClient.put('/admin/payment-settings/sslcommerz', input);
}
