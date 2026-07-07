import type { ResourceType } from './resource';

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
}
