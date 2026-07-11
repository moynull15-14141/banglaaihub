'use client';

import { format } from 'date-fns';
import { PageContainer } from '@/components/common/PageContainer';
import { ProfileView } from '@/components/user/ProfileView';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useAuth } from '@/lib/hooks/useAuth';

const ADMIN_ROLES = ['admin', 'super_admin'];

export default function ProfilePage() {
  const { user } = useAuth();

  // ProtectedRoute (via the dashboard layout) guarantees a user is present
  // by the time this renders.
  if (!user) return null;

  const isAdmin = ADMIN_ROLES.some((role) => user.roles.includes(role));

  return (
    <PageContainer className="max-w-[968px]">
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>

      {/* Same rich profile (avatar, cover image, bio, headline, links, badges,
          stats) every visitor sees at /users/[username] — this page is just
          that view pointed at the signed-in user's own username, plus the
          two account-only facts (role, member since) below it. */}
      <div className="mt-6">
        <ProfileView username={user.username} />
      </div>

      <Card className="mt-6">
        <CardContent className="py-5">
          <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Role
              </dt>
              <dd className="mt-1.5">
                <Badge variant={isAdmin ? 'brand' : 'secondary'}>
                  {isAdmin ? 'Administrator' : 'Member'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Member since
              </dt>
              <dd className="mt-1.5 text-sm font-medium">
                {format(new Date(user.created_at), 'MMMM d, yyyy')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </PageContainer>
  );
}
