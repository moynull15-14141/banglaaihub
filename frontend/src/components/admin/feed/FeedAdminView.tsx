'use client';

import { PageContainer } from '@/components/common/PageContainer';
import { FeedConfigCard } from '@/components/admin/feed/FeedConfigCard';
import { FeedConfigHistory } from '@/components/admin/feed/FeedConfigHistory';
import { FeedPinsManager } from '@/components/admin/feed/FeedPinsManager';
import { FeedAnnouncementsManager } from '@/components/admin/feed/FeedAnnouncementsManager';
import { LiveFeedPreview } from '@/components/admin/feed/LiveFeedPreview';
import { useAuth } from '@/lib/hooks/useAuth';

// Pin management needs resource:feature (editor tier); weight tuning and
// announcements need admin:manage (admin+ tier) — see backend/src/routes/
// admin.routes.ts's Phase 4D section. The backend enforces this either way;
// hiding the admin-only sections for an editor here is just avoiding a
// guaranteed-to-403 form, not the actual security boundary.
const ADMIN_TIER_ROLES = ['admin', 'super_admin'];

export function FeedAdminView() {
  const { user } = useAuth();
  const isAdminTier = user?.roles.some((role) => ADMIN_TIER_ROLES.includes(role)) ?? false;

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Feed Engine</h1>
        <p className="mt-1 text-muted-foreground">
          Tune ranking, curate Featured/Editor&apos;s Pick placement, and manage announcements.
        </p>
      </div>

      <FeedPinsManager />
      {isAdminTier ? (
        <>
          <FeedConfigCard />
          <LiveFeedPreview />
          <FeedConfigHistory />
          <FeedAnnouncementsManager />
        </>
      ) : null}
    </PageContainer>
  );
}
