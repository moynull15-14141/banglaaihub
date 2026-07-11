import type { ResourceAuthor } from './resource';

// Mirrors backend/src/validators/comment.validator.ts and
// comments.service.ts's toCommentNode.
export type CommentSort = 'newest' | 'oldest' | 'popular';

export interface Comment {
  id: string;
  resource_id: string;
  parent_id: string | null;
  content: string | null;
  is_pinned: boolean;
  like_count: number;
  status: 'visible' | 'hidden' | 'deleted';
  is_deleted: boolean;
  author: ResourceAuthor | null;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface CreateCommentInput {
  content: string;
  parent_id?: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface ListCommentsParams {
  sort?: CommentSort;
  page?: number;
  limit?: number;
}
