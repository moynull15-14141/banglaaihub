'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addResourceAttachment,
  addResourceBookmark,
  confirmResourceDownload,
  createResource,
  deleteResource,
  deleteResourceAttachment,
  forkResource,
  getResourceBySlug,
  getResourceDownload,
  getResourceVersions,
  listResources,
  logResourceShare,
  removeResourceBookmark,
  replaceResourceAttachment,
  reorderResourceAttachments,
  reportResource,
  updateResource,
  uploadResourceFile,
  type ReportReason,
  type UploadProgressInfo,
} from '@/lib/api/resources';
import type { ListResourcesParams, UpdateResourceInput, UploadKind } from '@/types/resource';

export function useResources(params: ListResourcesParams = {}) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: ({ signal }) => listResources(params, signal),
  });
}

export function useResource(slug: string) {
  return useQuery({
    queryKey: ['resources', 'detail', slug],
    queryFn: () => getResourceBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useReportResource(slug: string) {
  return useMutation({
    mutationFn: (input: { reason: ReportReason; description?: string }) => reportResource(slug, input),
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

// Phase 3A.1 — mirrors useCreateResource()'s invalidation exactly (a fork IS
// a create, just pre-filled server-side).
export function useForkResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: forkResource,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'submissions'] });
    },
  });
}

// Phase 3A.1 — only enabled for model/prompt detail views (see
// VersionHistorySection), so no extra request fires for other resource
// types. Shared by both the Version History card and the Prev/Next nav —
// one fetch, cached by slug like every other resource query here.
export function useResourceVersions(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['resources', 'versions', slug],
    queryFn: () => getResourceVersions(slug),
    enabled: enabled && Boolean(slug),
  });
}

// Invalidates both the detail view and the owner's "My submissions" list —
// used by every mutation below that changes a resource's own data.
function useInvalidateResource(slug: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
    void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'submissions'] });
  };
}

export function useUpdateResource(slug: string) {
  const invalidate = useInvalidateResource(slug);
  return useMutation({
    mutationFn: (input: UpdateResourceInput) => updateResource(slug, input),
    onSuccess: invalidate,
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, force }: { slug: string; force?: boolean }) => deleteResource(slug, force),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'submissions'] });
      void queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

// One mutation, `add` flag per call — same shape either direction, and both
// touch the same set of queries (the resource itself, the bookmarks list,
// and the dashboard's bookmark_count/total stats).
export function useToggleResourceBookmark(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ add }: { add: boolean }) => (add ? addResourceBookmark(slug) : removeResourceBookmark(slug)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', slug] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'bookmarks'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'dashboard'] });
    },
  });
}

// `slug` is taken per-call, not baked into the hook — unlike
// useDeleteResourceAttachment/useReplaceResourceAttachment/
// useReorderResourceAttachments below, this one is also used from the
// Submit wizard, where no slug exists yet when the hook is first rendered
// (the resource is created, THEN its queued attachments are uploaded).
export function useAddResourceAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      file,
      onProgress,
      displayName,
    }: {
      slug: string;
      file: File;
      onProgress?: (info: UploadProgressInfo) => void;
      displayName?: string;
    }) => addResourceAttachment(slug, file, onProgress, displayName),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['resources', 'detail', variables.slug] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'submissions'] });
    },
  });
}

export function useDeleteResourceAttachment(slug: string) {
  const invalidate = useInvalidateResource(slug);
  return useMutation({
    mutationFn: (fileId: string) => deleteResourceAttachment(slug, fileId),
    onSuccess: invalidate,
  });
}

export function useReplaceResourceAttachment(slug: string) {
  const invalidate = useInvalidateResource(slug);
  return useMutation({
    mutationFn: ({ fileId, file }: { fileId: string; file: File }) =>
      replaceResourceAttachment(slug, fileId, file),
    onSuccess: invalidate,
  });
}

export function useReorderResourceAttachments(slug: string) {
  const invalidate = useInvalidateResource(slug);
  return useMutation({
    mutationFn: (fileIds: string[]) => reorderResourceAttachments(slug, fileIds),
    onSuccess: invalidate,
  });
}

export type DownloadState = 'idle' | 'preparing' | 'done' | 'error';

// Drives the Downloading.../Completed download UX (Part 5): fetches a fresh
// signed URL (no analytics yet), hands it to the browser, then confirms —
// analytics only land once the confirm call succeeds, not on URL issuance.
export function useDownloadResource(slug: string) {
  const [state, setState] = useState<DownloadState>('idle');

  async function download(fileId?: string) {
    setState('preparing');
    try {
      const { url } = await getResourceDownload(slug, fileId);

      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      await confirmResourceDownload(slug, fileId);
      setState('done');
      setTimeout(() => setState('idle'), 2000);
    } catch (error) {
      setState('error');
      setTimeout(() => setState('idle'), 2500);
      throw error;
    }
  }

  return { state, download };
}
