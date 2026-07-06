import { BadgeCheck } from 'lucide-react';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { UserAvatar } from '@/components/user/UserAvatar';

interface ProfileHeaderProps {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  institution: string | null;
  reputationScore: number;
  isVerified: boolean;
}

export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
  bio,
  institution,
  reputationScore,
  isVerified,
}: ProfileHeaderProps) {
  const name = displayName ?? username;

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <UserAvatar avatarUrl={avatarUrl} name={name} className="size-20 text-lg" />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
          {isVerified ? (
            <BadgeCheck className="size-5 text-primary" aria-label="Verified" />
          ) : null}
        </div>
        <p className="text-muted-foreground">@{username}</p>
        {institution ? <p className="text-sm text-muted-foreground">{institution}</p> : null}
        {bio ? <p className="max-w-prose text-sm">{bio}</p> : null}
        <ReputationBadge score={reputationScore} />
      </div>
    </div>
  );
}
