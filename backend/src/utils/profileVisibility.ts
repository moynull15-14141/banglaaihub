import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

// Shared by users.service.ts, activity.service.ts, badge.service.ts, and
// pinned-resource.service.ts so the private/followers_only gate is defined
// exactly once. Mirrors resources.service.ts's assertCanView precedent:
// a blocked profile 404s (doesn't leak existence) unless the viewer is the
// owner or an admin.
export async function assertProfileViewable(
  target: { id: string; profileVisibility: 'public' | 'private' | 'followers_only' },
  viewerId: string | null,
  viewerIsAdmin: boolean,
): Promise<void> {
  if (target.profileVisibility === 'public') return;
  if (viewerId === target.id || viewerIsAdmin) return;

  if (target.profileVisibility === 'private') {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
  }

  // followers_only
  if (!viewerId) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
  }
  const isFollower = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: target.id } },
  });
  if (!isFollower) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User not found.');
  }
}
