import type { Resource, ResourceType } from './resource';

export interface DashboardResourceSummary {
  id: string;
  slug: string;
  title: string;
  type: ResourceType;
}

export interface MostDownloadedResource extends DashboardResourceSummary {
  download_count: number;
}

export interface RecentDownload {
  resource: DashboardResourceSummary;
  downloaded_at: string;
}

export interface RecentFollower {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  followed_at: string;
}

export interface MonthlyTrend {
  this_month: number;
  last_month: number;
}

export interface MonthlySummary {
  views: MonthlyTrend;
  downloads: MonthlyTrend;
  submissions: MonthlyTrend;
}

export interface CommunityStats {
  total_users: number;
  total_resources: number;
}

export interface UserDashboardStats {
  total_submissions: number;
  published_resources: number;
  pending_resources: number;
  rejected_resources: number;
  bookmark_count: number;
  unread_notifications: number;
  reputation_score: number;
  total_views: number;
  total_downloads: number;
  total_bookmarks_received: number;
  total_shares: number;
  most_downloaded_resource: MostDownloadedResource | null;
  recent_downloads: RecentDownload[];
  // Phase 4B
  follower_count: number;
  following_count: number;
  profile_completion_percent: number;
  recent_followers: RecentFollower[];
  pinned_resources: Resource[];
  community_stats: CommunityStats;
  monthly_summary: MonthlySummary;
}
