'use client';

import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { UserPlus, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToggleFollow } from '@/lib/hooks/useFollows';
import { ROUTES } from '@/lib/constants/routes';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface FollowButtonProps {
  username: string;
  isFollowing: boolean;
}

export function FollowButton({ username, isFollowing }: FollowButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const mutation = useToggleFollow(username);

  function handleClick() {
    if (!isAuthenticated) {
      router.push(ROUTES.login);
      return;
    }
    mutation.mutate(
      { follow: !isFollowing },
      {
        onSuccess: () => toast.success(isFollowing ? 'Unfollowed.' : 'Followed.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not update your follow status.')),
      },
    );
  }

  return (
    <Button
      type="button"
      variant={isFollowing ? 'secondary' : 'default'}
      disabled={mutation.isPending}
      onClick={handleClick}
    >
      {isFollowing ? (
        <UserCheck className="size-4" aria-hidden="true" />
      ) : (
        <UserPlus className="size-4" aria-hidden="true" />
      )}
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
