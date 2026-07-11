'use client';

import Link from 'next/link';
import { BadgeCheck, Globe, Link2, MapPin, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { BadgeGrid } from '@/components/user/BadgeGrid';
import { FollowButton } from '@/components/user/FollowButton';
import { MessageButton } from '@/components/messaging/MessageButton';
import { ReputationBadge } from '@/components/user/ReputationBadge';
import { UserAvatar } from '@/components/user/UserAvatar';
import { Button } from '@/components/ui/button';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { recordProfileShare, recordSocialLinkClick } from '@/lib/api/users';
import { ROUTES } from '@/lib/constants/routes';
import type { PublicProfile } from '@/types/user';

interface ProfileLink {
  label: string;
  url: string | null;
  icon?: typeof Globe;
}

interface ProfileHeaderProps {
  profile: PublicProfile;
  isOwnProfile: boolean;
}

export function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const name = profile.display_name ?? profile.username;

  const links: ProfileLink[] = [
    { label: 'Website', url: profile.website_url, icon: Globe },
    { label: 'GitHub', url: profile.github_url },
    { label: 'GitLab', url: profile.gitlab_url },
    { label: 'Hugging Face', url: profile.huggingface_url },
    { label: 'Kaggle', url: profile.kaggle_url },
    { label: 'Google Scholar', url: profile.scholar_url },
    { label: 'LinkedIn', url: profile.linkedin_url },
    { label: 'X', url: profile.x_url },
    { label: 'ORCID', url: profile.orcid_id ? `https://orcid.org/${profile.orcid_id}` : null },
  ];
  const visibleLinks = links.filter((link): link is ProfileLink & { url: string } => Boolean(link.url));

  function handleShare() {
    void recordProfileShare(profile.username);
    if (navigator.share) {
      void navigator.share({ title: name, url: window.location.href }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(window.location.href);
      toast.success('Profile link copied.');
    }
  }

  return (
    <div className="space-y-4">
      <ImageLightbox src={profile.cover_image} alt={`${name}'s cover image`} className="block w-full">
        <div className="h-40 w-full overflow-hidden rounded-xl bg-linear-to-br from-brand/20 to-muted sm:h-56">
          {profile.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.cover_image} alt="" className="size-full object-cover" />
          ) : null}
        </div>
      </ImageLightbox>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <ImageLightbox src={profile.avatar_url} alt={`${name}'s avatar`} className="-mt-12 shrink-0 rounded-full sm:-mt-16">
            <UserAvatar avatarUrl={profile.avatar_url} name={name} size="xl" className="ring-4 ring-background" />
          </ImageLightbox>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{name}</h1>
              {profile.is_verified ? (
                <BadgeCheck className="size-5 text-brand" aria-label="Verified" />
              ) : null}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.headline ? <p className="text-sm">{profile.headline}</p> : null}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </Button>
          {isOwnProfile ? (
            <Button asChild variant="outline" size="sm">
              <Link href={ROUTES.settingsProfile}>Edit profile</Link>
            </Button>
          ) : (
            <>
              <MessageButton
                user={{
                  id: profile.id,
                  username: profile.username,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                  is_verified: profile.is_verified,
                }}
              />
              <FollowButton username={profile.username} isFollowing={profile.is_following} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {profile.institution ? <span>{profile.institution}</span> : null}
        {profile.location ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {profile.location}
          </span>
        ) : null}
        <Link href={ROUTES.userFollowers(profile.username)} className="hover:underline">
          <strong className="text-foreground">{profile.follower_count}</strong> followers
        </Link>
        <Link href={ROUTES.userFollowing(profile.username)} className="hover:underline">
          <strong className="text-foreground">{profile.following_count}</strong> following
        </Link>
        {profile.is_mutual ? <span className="text-xs">Follows you</span> : null}
      </div>

      {profile.bio ? <p className="max-w-prose text-sm">{profile.bio}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <ReputationBadge score={profile.reputation_score} />
        {profile.contributor_next_threshold != null ? (
          <span className="text-xs text-muted-foreground">
            {profile.reputation_score} / {profile.contributor_next_threshold} XP to {profile.contributor_next_level}
          </span>
        ) : null}
      </div>

      <BadgeGrid badges={profile.badges} />

      {profile.skills.length > 0 || profile.research_interests.length > 0 ? (
        <div className="space-y-2">
          {profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
          {profile.research_interests.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Interested in: {profile.research_interests.join(', ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {visibleLinks.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          {visibleLinks.map((link) => {
            const Icon = link.icon ?? Link2;
            return (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void recordSocialLinkClick(profile.username)}
                className="flex items-center gap-1 text-sm text-brand hover:underline"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {link.label}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
