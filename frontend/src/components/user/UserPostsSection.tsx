'use client';

import { MessagesSquare } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { CardGridSkeleton } from '@/components/common/LoadingSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { UserPostCard } from '@/components/feed/cards/UserPostCard';
import { useUserPosts } from '@/lib/hooks/usePosts';

interface UserPostsSectionProps {
  authorId: string;
  isOwnProfile: boolean;
}

// Profile page's "Posts" tab — every status update this user has published,
// reusing the exact card (and its owner-only Edit/Delete menu) the feed
// itself renders, so "manage what I posted" and "see what I posted" are the
// same component wired to the same mutations.
export function UserPostsSection({ authorId, isOwnProfile }: UserPostsSectionProps) {
  const { data, isLoading, isError, refetch } = useUserPosts(authorId);

  if (isLoading) {
    return <CardGridSkeleton count={3} />;
  }

  if (isError) {
    return <ErrorState title="Couldn't load posts" onRetry={() => void refetch()} />;
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No posts yet"
        description={
          isOwnProfile
            ? 'Share something with the community from the Feed page.'
            : "This user hasn't posted anything yet."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.data.map((post) => (
        <UserPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
