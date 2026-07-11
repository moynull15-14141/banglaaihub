import { prisma } from '../config/database';

// Mirrors the fire-and-forget resourceAnalytics write pattern in
// resources.service.ts — never awaited on the caller's critical path,
// never blocks or fails the primary action.
export class UserAnalyticsService {
  static async recordProfileView(profileUserId: string, viewerId: string | null): Promise<void> {
    await prisma.userAnalytics.create({
      data: { profileUserId, eventType: 'profile_view', viewerId },
    });
  }

  static async recordShare(profileUserId: string, viewerId: string | null): Promise<void> {
    await prisma.userAnalytics.create({
      data: { profileUserId, eventType: 'profile_share', viewerId },
    });
  }

  static async recordSocialLinkClick(profileUserId: string, viewerId: string | null): Promise<void> {
    await prisma.userAnalytics.create({
      data: { profileUserId, eventType: 'social_link_click', viewerId },
    });
  }

  static async recordPinnedResourceClick(profileUserId: string, viewerId: string | null): Promise<void> {
    await prisma.userAnalytics.create({
      data: { profileUserId, eventType: 'pinned_resource_click', viewerId },
    });
  }
}
