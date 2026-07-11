'use client';

import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { Download, Eye, Folder } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StatCard } from '@/components/common/StatCard';
import { ResourceGrid } from '@/components/resource/ResourceGrid';
import { ActivityFeed } from '@/components/user/ActivityFeed';
import { ContributionHeatmap } from '@/components/user/ContributionHeatmap';
import { PinnedResourcesSection } from '@/components/user/PinnedResourcesSection';
import { ProfileHeader } from '@/components/user/ProfileHeader';
import { UserPostsSection } from '@/components/user/UserPostsSection';
import { ProfileJsonLd } from '@/components/seo/JsonLd';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RESOURCE_TYPE_LABELS } from '@/lib/constants/resourceTypes';
import { recordProfileView } from '@/lib/api/users';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePublicProfile } from '@/lib/hooks/usePublicProfile';
import type { ResourceType } from '@/types/resource';

interface ProfileViewProps {
  username: string;
}

export function ProfileView({ username }: ProfileViewProps) {
  const { data: profile, isLoading, isError, error, refetch } = usePublicProfile(username);
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all');

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!isOwnProfile) void recordProfileView(username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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
      <ProfileJsonLd profile={profile} />
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Folder} label="Resources" value={profile.stats.total_resources} />
        <StatCard icon={Download} label="Downloads" value={profile.stats.total_downloads} />
        <StatCard icon={Eye} label="Views" value={profile.stats.total_views} />
      </div>

      {profile.pinned_resources.length > 0 ? (
        <div className="space-y-4">
          <SectionHeader title="Pinned" />
          <PinnedResourcesSection resources={profile.pinned_resources} />
        </div>
      ) : null}

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="space-y-4 pt-4">
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
        </TabsContent>

        <TabsContent value="posts" className="pt-4">
          <UserPostsSection authorId={profile.id} isOwnProfile={isOwnProfile} />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <ActivityFeed username={username} />
        </TabsContent>

        <TabsContent value="contributions" className="pt-4">
          <ContributionHeatmap username={username} joinYear={new Date(profile.created_at).getUTCFullYear()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
