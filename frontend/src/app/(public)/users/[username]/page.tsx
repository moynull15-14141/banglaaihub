import type { Metadata } from 'next';
import { getPublicProfile } from '@/lib/api/users';
import { PageContainer } from '@/components/common/PageContainer';
import { ProfileView } from '@/components/user/ProfileView';

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  try {
    const profile = await getPublicProfile(username);
    const name = profile.display_name ?? profile.username;
    return {
      title: name,
      description: profile.bio ?? `${name}'s profile on Bangla AI Hub.`,
    };
  } catch {
    return { title: 'Profile' };
  }
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  return (
    <PageContainer>
      <ProfileView username={username} />
    </PageContainer>
  );
}
