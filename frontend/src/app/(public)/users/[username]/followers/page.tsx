import { FollowListView } from '@/components/user/FollowListView';

interface FollowersPageProps {
  params: Promise<{ username: string }>;
}

export default async function FollowersPage({ params }: FollowersPageProps) {
  const { username } = await params;
  return <FollowListView username={username} mode="followers" />;
}
