import { BadgeCheck, Link2, MapPin } from 'lucide-react';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { UserAvatar } from '@/components/user/UserAvatar';

interface ProfileLink {
  label: string;
  url: string | null;
}

interface ProfileHeaderProps {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  institution: string | null;
  location?: string | null;
  reputationScore: number;
  isVerified: boolean;
  links?: ProfileLink[];
}

export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
  bio,
  institution,
  location,
  reputationScore,
  isVerified,
  links = [],
}: ProfileHeaderProps) {
  const name = displayName ?? username;
  const visibleLinks = links.filter((link): link is ProfileLink & { url: string } => Boolean(link.url));

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <UserAvatar avatarUrl={avatarUrl} name={name} size="xl" />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{name}</h1>
          {isVerified ? (
            <BadgeCheck className="size-5 text-brand" aria-label="Verified" />
          ) : null}
        </div>
        <p className="text-muted-foreground">@{username}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {institution ? <span>{institution}</span> : null}
          {location ? (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {location}
            </span>
          ) : null}
        </div>
        {bio ? <p className="max-w-prose text-sm">{bio}</p> : null}
        <ReputationBadge score={reputationScore} />
        {visibleLinks.length > 0 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {visibleLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-brand hover:underline"
              >
                <Link2 className="size-3.5" aria-hidden="true" />
                {link.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
