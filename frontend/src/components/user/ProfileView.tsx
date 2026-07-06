'use client';

import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { Download, Eye, Folder } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatsCard } from '@/components/common/StatsCard';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { ProfileHeader } from '@/components/user/ProfileHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicProfile } from '@/lib/hooks/usePublicProfile';

interface ProfileViewProps {
  username: string;
}

export function ProfileView({ username }: ProfileViewProps) {
  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(username);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      notFound();
    }
    return (
      <ErrorState title="Couldn't load this profile" onRetry={() => void refetch()} />
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-8">
      <ProfileHeader
        username={profile.username}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        bio={profile.bio}
        institution={profile.institution}
        reputationScore={profile.reputation_score}
        isVerified={profile.is_verified}
      />

      <div className="grid grid-cols-3 gap-4">
        <StatsCard icon={Folder} label="Resources" value={profile.stats.total_resources} />
        <StatsCard icon={Download} label="Downloads" value={profile.stats.total_downloads} />
        <StatsCard icon={Eye} label="Views" value={profile.stats.total_views} />
      </div>

      <div>
        <SectionHeader title="Published resources" />
        <ResourceGrid resources={profile.resources} isLoading={false} isError={false} />
      </div>
    </div>
  );
}
