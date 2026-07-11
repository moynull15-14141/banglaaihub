'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPost, deletePost, listPosts, reportPost, togglePostLike, updatePost } from '@/lib/api/posts';
import type { UploadProgressInfo } from '@/lib/api/resources';
import type { PostReportReason } from '@/lib/api/posts';

function userPostsKey(authorId: string) {
  return ['posts', 'byAuthor', authorId];
}

// Profile page's "Posts" tab — every post a given user has published,
// newest first (same GET /posts?author= the feed's candidate query uses).
export function useUserPosts(authorId: string | undefined) {
  return useQuery({
    queryKey: userPostsKey(authorId ?? ''),
    queryFn: () => listPosts({ author: authorId }),
    enabled: Boolean(authorId),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      content,
      file,
      onProgress,
    }: {
      content: string;
      file?: File | null;
      onProgress?: (info: UploadProgressInfo) => void;
    }) => createPost(content, file, onProgress),
    // A new post should appear at the top of the feed right away — simplest
    // correct approach is invalidating every cached feed query rather than
    // trying to splice the new card into a ranked/cursor-paginated cache.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => updatePost(id, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['posts', 'byAuthor'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['posts', 'byAuthor'] });
    },
  });
}

export function useTogglePostLike() {
  return useMutation({
    mutationFn: (id: string) => togglePostLike(id),
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { reason: PostReportReason; description?: string } }) =>
      reportPost(id, input),
  });
}
