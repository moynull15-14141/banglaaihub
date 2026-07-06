import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ROUTES } from '@/lib/constants/routes';

interface UserCardProps {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  reputationScore?: number;
}

export function UserCard({
  username,
  displayName,
  avatarUrl,
  bio,
  reputationScore,
}: UserCardProps) {
  const name = displayName ?? username;

  return (
    <Link href={ROUTES.userProfile(username)}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center gap-3 py-2">
          <UserAvatar avatarUrl={avatarUrl} name={name} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-muted-foreground">@{username}</p>
            {bio ? <p className="line-clamp-1 text-sm text-muted-foreground">{bio}</p> : null}
          </div>
          {reputationScore !== undefined ? <ReputationBadge score={reputationScore} /> : null}
        </CardContent>
      </Card>
    </Link>
  );
}
