'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFeedAnnouncementAdmin,
  createFeedPinAdmin,
  deleteFeedAnnouncementAdmin,
  deleteFeedPinAdmin,
  getFeedConfigAdmin,
  listFeedAnnouncementsAdmin,
  listFeedConfigHistoryAdmin,
  listFeedPinsAdmin,
  previewFeedAdmin,
  removeFeedAnnouncementImageAdmin,
  rollbackFeedConfigAdmin,
  updateFeedAnnouncementAdmin,
  updateFeedConfigAdmin,
  uploadFeedAnnouncementImageAdmin,
} from '@/lib/api/feed-admin';
import type { UploadProgressInfo } from '@/lib/api/resources';
import type {
  CreateFeedAnnouncementInput,
  CreateFeedPinInput,
  PreviewFeedInput,
  UpdateFeedAnnouncementInput,
  UpdateFeedConfigInput,
} from '@/types/feed-admin';

const FEED_CONFIG_KEY = ['admin', 'feed', 'config'];
const FEED_PINS_KEY = ['admin', 'feed', 'pins'];
const FEED_ANNOUNCEMENTS_KEY = ['admin', 'feed', 'announcements'];
const FEED_CONFIG_HISTORY_KEY = ['admin', 'feed', 'config-history'];

export function useFeedConfig() {
  return useQuery({ queryKey: FEED_CONFIG_KEY, queryFn: getFeedConfigAdmin });
}

export function useUpdateFeedConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateFeedConfigInput) => updateFeedConfigAdmin(input),
    onSuccess: (config) => {
      queryClient.setQueryData(FEED_CONFIG_KEY, config);
      void queryClient.invalidateQueries({ queryKey: FEED_CONFIG_HISTORY_KEY });
    },
  });
}

export function useFeedPins() {
  return useQuery({ queryKey: FEED_PINS_KEY, queryFn: listFeedPinsAdmin });
}

export function useCreateFeedPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeedPinInput) => createFeedPinAdmin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_PINS_KEY }),
  });
}

export function useDeleteFeedPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeedPinAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_PINS_KEY }),
  });
}

export function useFeedAnnouncements() {
  return useQuery({ queryKey: FEED_ANNOUNCEMENTS_KEY, queryFn: listFeedAnnouncementsAdmin });
}

export function useCreateFeedAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeedAnnouncementInput) => createFeedAnnouncementAdmin(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_ANNOUNCEMENTS_KEY }),
  });
}

export function useUpdateFeedAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateFeedAnnouncementInput }) =>
      updateFeedAnnouncementAdmin(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_ANNOUNCEMENTS_KEY }),
  });
}

export function useDeleteFeedAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeedAnnouncementAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_ANNOUNCEMENTS_KEY }),
  });
}

export function useUploadFeedAnnouncementImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      onProgress,
      signal,
    }: {
      id: string;
      file: File;
      onProgress?: (info: UploadProgressInfo) => void;
      signal?: AbortSignal;
    }) => uploadFeedAnnouncementImageAdmin(id, file, onProgress, signal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_ANNOUNCEMENTS_KEY }),
  });
}

export function useRemoveFeedAnnouncementImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFeedAnnouncementImageAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEED_ANNOUNCEMENTS_KEY }),
  });
}

// --- Live Preview (Phase 4C, Stage 1) -------------------------------------------------
// A mutation, not a query: the caller (LiveFeedPreview.tsx) fires it on a
// debounce as the admin edits draft weights — no automatic caching wanted,
// since every call has different (draft, unsaved) input.
export function usePreviewFeed() {
  return useMutation({ mutationFn: (input: PreviewFeedInput) => previewFeedAdmin(input) });
}

// --- Configuration History (Phase 4C, Stage 1) ----------------------------------------

export function useFeedConfigHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...FEED_CONFIG_HISTORY_KEY, page, limit],
    queryFn: () => listFeedConfigHistoryAdmin(page, limit),
  });
}

export function useRollbackFeedConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditLogId: string) => rollbackFeedConfigAdmin(auditLogId),
    onSuccess: (config) => {
      queryClient.setQueryData(FEED_CONFIG_KEY, config);
      void queryClient.invalidateQueries({ queryKey: FEED_CONFIG_HISTORY_KEY });
    },
  });
}
