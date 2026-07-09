'use client';

import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { Download, Eye, Folder } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatCard } from '@/components/common/StatCard';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { ProfileHeader } from '@/components/user/ProfileHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { usePublicProfile } from '@/lib/hooks/usePublicProfile';
import type { ResourceType } from '@/types/resource';

interface ProfileViewProps {
  username: string;
}

export function ProfileView({ username }: ProfileViewProps) {
  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(username);
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');

  // Phase 3B (Part 7 — Author Page) — groups the already-fetched resource
  // list by type into tabs, purely client-side: profile.resources already
  // carries `.type` on every item, so no extra request is needed.
  const resourcesByType = useMemo(() => {
    const counts = new Map<ResourceType, number>();
    for (const resource of profile?.resources ?? []) {
      counts.set(resource.type, (counts.get(resource.type) ?? 0) + 1);
    }
    return counts;
  }, [profile?.resources]);

  const visibleResources = useMemo(() => {
    if (!profile) return [];
    if (typeFilter === 'all') return profile.resources;
    return profile.resources.filter((resource) => resource.type === typeFilter);
  }, [profile, typeFilter]);

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
        location={profile.location}
        reputationScore={profile.reputation_score}
        isVerified={profile.is_verified}
        links={[
          { label: 'Website', url: profile.website_url },
          { label: 'GitHub', url: profile.github_url },
          { label: 'Hugging Face', url: profile.huggingface_url },
          { label: 'Kaggle', url: profile.kaggle_url },
          { label: 'Google Scholar', url: profile.scholar_url },
          { label: 'LinkedIn', url: profile.linkedin_url },
          { label: 'X', url: profile.x_url },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Folder} label="Resources" value={profile.stats.total_resources} />
        <StatCard icon={Download} label="Downloads" value={profile.stats.total_downloads} />
        <StatCard icon={Eye} label="Views" value={profile.stats.total_views} />
      </div>

      <div className="space-y-4">
        <SectionHeader title="Published resources" />
        {resourcesByType.size > 1 ? (
          <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as ResourceType | 'all')}>
            <TabsList>
              <TabsTrigger value="all">All ({profile.resources.length})</TabsTrigger>
              {Array.from(resourcesByType.entries()).map(([type, count]) => (
                <TabsTrigger key={type} value={type}>
                  {RESOURCE_TYPE_LABELS[type] ?? type} ({count})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
        <ResourceGrid resources={visibleResources} isLoading={false} isError={false} />
      </div>
    </div>
  );
}
