import Link from 'next/link';
import {
  Award,
  MessageCircle,
  MessageSquarePlus,
  Reply,
  Star,
  TrendingUp,
  Upload,
  UserPlus,
  Heart,
  type LucideIcon,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/format';
import type { Activity, ActivityType } from '@/types/activity';

const ACTIVITY_CONFIG: Record<ActivityType, { icon: LucideIcon; label: (a: Activity) => string }> = {
  resource_uploaded: { icon: Upload, label: (a) => `Uploaded a new ${String(a.metadata?.resourceType ?? 'resource')}` },
  resource_approved: { icon: Upload, label: (a) => `"${String(a.metadata?.slug ?? 'A resource')}" was approved` },
  model_uploaded: { icon: Upload, label: () => 'Uploaded a new model' },
  review_written: { icon: Star, label: () => 'Wrote a review' },
  review_received: { icon: Star, label: (a) => `Received a ${String(a.metadata?.rating ?? '')}★ review` },
  comment_added: { icon: MessageSquarePlus, label: () => 'Posted a comment' },
  reply_added: { icon: Reply, label: () => 'Replied to a comment' },
  badge_received: { icon: Award, label: (a) => `Earned the "${String(a.metadata?.name ?? 'a')}" badge` },
  level_up: { icon: TrendingUp, label: (a) => `Reached ${String(a.metadata?.level ?? 'a new')} tier` },
  started_following: { icon: UserPlus, label: () => 'Started following someone' },
  prompt_forked: { icon: MessageCircle, label: () => 'Forked a prompt' },
  like_received: { icon: Heart, label: () => 'Received a like' },
  milestone_reached: { icon: TrendingUp, label: (a) => `Reached ${String(a.metadata?.count ?? '')} followers` },
};

interface ActivityItemProps {
  activity: Activity;
}

export function ActivityItem({ activity }: ActivityItemProps) {
  const config = ACTIVITY_CONFIG[activity.type];
  if (!config) return null;
  const Icon = config.icon;

  const content = (
    <div className="flex items-center gap-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{config.label(activity)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(activity.created_at)}</p>
      </div>
    </div>
  );

  if (activity.target_type === 'resource' && typeof activity.metadata?.slug === 'string') {
    return (
      <Link href={`/resources/${activity.metadata.slug}`} className="block hover:bg-muted/50 rounded-lg px-1">
        {content}
      </Link>
    );
  }

  return content;
}
