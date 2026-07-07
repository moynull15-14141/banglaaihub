import { apiClient } from '@/lib/api/client';
import type { ApiSuccessResponse } from '@/types/api';
import type {
  MyContributorApplication,
  SubmitContributorApplicationInput,
  UpdateContributorApplicationInput,
} from '@/types/contributor-application';

export async function submitContributorApplication(
  input: SubmitContributorApplicationInput,
): Promise<MyContributorApplication> {
  const response = await apiClient.post<ApiSuccessResponse<MyContributorApplication>>(
    '/contributor-applications',
    input,
  );
  return response.data.data;
}

export async function getMyContributorApplication(): Promise<MyContributorApplication | null> {
  const response = await apiClient.get<ApiSuccessResponse<MyContributorApplication | null>>(
    '/contributor-applications/me',
  );
  return response.data.data;
}

export async function updateMyContributorApplication(
  input: UpdateContributorApplicationInput,
): Promise<MyContributorApplication> {
  const response = await apiClient.patch<ApiSuccessResponse<MyContributorApplication>>(
    '/contributor-applications/me',
    input,
  );
  return response.data.data;
}

export async function withdrawMyContributorApplication(): Promise<void> {
  await apiClient.post('/contributor-applications/me/withdraw');
}

export async function uploadContributorSample(
  file: File,
  kind: 'sample' | 'supporting',
): Promise<{ file_url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ApiSuccessResponse<{ file_url: string }>>(
    `/contributor-applications/me/samples?kind=${kind}`,
    formData,
  );
  return response.data.data;
}
