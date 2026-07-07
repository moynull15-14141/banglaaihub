'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createResource,
  getResourceBySlug,
  listResources,
  logResourceShare,
  uploadResourceFile,
  type UploadProgressInfo,
} from '@/lib/api/resources';
import type { ListResourcesParams, UploadKind } from '@/types/resource';

export function useResources(params: ListResourcesParams = {}) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: () => listResources(params),
  });
}

export function useResource(slug: string) {
  return useQuery({
    queryKey: ['resources', 'detail', slug],
    queryFn: () => getResourceBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createResource,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'submissions'] });
    },
  });
}

export function useUploadResourceFile() {
  return useMutation({
    mutationFn: ({
      slug,
      file,
      onProgress,
      signal,
      kind,
    }: {
      slug: string;
      file: File;
      onProgress?: (info: UploadProgressInfo) => void;
      signal?: AbortSignal;
      kind?: UploadKind;
    }) => uploadResourceFile(slug, file, onProgress, signal, kind),
  });
}

export function useLogResourceShare() {
  return useMutation({ mutationFn: logResourceShare });
}
