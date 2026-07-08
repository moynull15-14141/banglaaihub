'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { PageContainer } from '@/components/common/PageContainer';
import { UserAvatar } from '@/components/user/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';

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

      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:items-center sm:text-left">
          <UserAvatar
            avatarUrl={user.avatar_url}
            name={user.display_name ?? user.username}
            size="xl"
          />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-lg font-semibold">{user.display_name ?? user.username}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Button asChild variant="outline">
            <Link href={ROUTES.settingsProfile}>Edit profile</Link>
          </Button>
        </CardContent>

        <Separator />

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
