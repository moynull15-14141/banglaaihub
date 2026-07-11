import { FollowListView } from '@/components/user/FollowListView';

interface FollowingPageProps {
  params: Promise<{ username: string }>;
}

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { username } = await params;
  return <FollowListView username={username} mode="following" />;
}
