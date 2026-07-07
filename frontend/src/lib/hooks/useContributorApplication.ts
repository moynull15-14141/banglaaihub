'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyContributorApplication,
  submitContributorApplication,
  updateMyContributorApplication,
  uploadContributorSample,
  withdrawMyContributorApplication,
} from '@/lib/api/contributor-applications';

const MY_APPLICATION_KEY = ['contributor-applications', 'me'] as const;

// `enabled` defaults to true (existing call sites are all inside the
// authenticated dashboard area already) — Navbar/sidebar callers pass
// `isAuthenticated` explicitly since they render on public, logged-out pages too.
export function useMyContributorApplication(enabled = true) {
  return useQuery({
    queryKey: MY_APPLICATION_KEY,
    queryFn: getMyContributorApplication,
    enabled,
  });
}

export function useSubmitContributorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitContributorApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_APPLICATION_KEY });
    },
  });
}

export function useUpdateContributorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyContributorApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_APPLICATION_KEY });
    },
  });
}

export function useWithdrawContributorApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: withdrawMyContributorApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_APPLICATION_KEY });
    },
  });
}

export function useUploadContributorSample() {
  return useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: 'sample' | 'supporting' }) =>
      uploadContributorSample(file, kind),
  });
}
