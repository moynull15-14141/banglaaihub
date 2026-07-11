'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Bell, CheckCircle2, Info, Monitor, Moon, Shield, Sun, User as UserIcon } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/user/UserAvatar';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useOwnProfile, useUpdateNotificationPreference } from '@/lib/hooks/useProfile';
import { ROUTES } from '@/lib/constants/routes';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const SETTINGS_TABS = [
  { value: 'profile', label: 'Profile', icon: UserIcon },
  { value: 'appearance', label: 'Appearance', icon: Sun },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'about', label: 'About', icon: Info },
];

// Mirrors backend/src/utils/notificationCategories.ts's NOTIFICATION_CATEGORIES
// exactly — the `key` here must match the backend key byte-for-byte, since
// it's sent straight to PATCH /users/me/notification-preferences and
// compared against OwnProfile.muted_notification_categories.
const NOTIFICATION_CATEGORIES = [
  {
    key: 'comments',
    label: 'Comments & mentions',
    description: 'Replies to your comments and @mentions.',
  },
  {
    key: 'reviews',
    label: 'Reviews & likes',
    description: 'Reviews on your resources and likes they receive.',
  },
  {
    key: 'submissions',
    label: 'Submissions & contributor status',
    description: 'Approval/rejection of your submissions and contributor application.',
  },
  {
    key: 'milestones',
    label: 'Milestones & digests',
    description: 'Reputation milestones, level-ups, and the weekly activity digest.',
  },
  {
    key: 'follows',
    label: 'Follows & badges',
    description: 'New followers and badges you earn.',
  },
];

export default function SettingsPage() {
  const { data: profile, isLoading } = useOwnProfile();
  const { theme, setTheme } = useTheme();
  const updateNotificationPreference = useUpdateNotificationPreference();

  if (isLoading || !profile) {
    return <LoadingScreen label="Loading your settings…" />;
  }

  const name = profile.display_name ?? profile.username;

  return (
    <PageContainer className="max-w-242">
      <SectionHeader title="Settings" description="Manage your profile, appearance, and account security." />

      <Tabs defaultValue="profile" orientation="vertical" className="flex-col gap-6 md:flex-row md:gap-10">
        <TabsList className="h-fit w-full shrink-0 flex-col items-stretch gap-0.5 bg-transparent p-0 md:w-52">
          {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="justify-start gap-2.5 rounded-md border-none px-3 py-2 text-sm font-medium text-muted-foreground shadow-none transition-colors data-active:bg-muted data-active:text-foreground data-active:shadow-none dark:data-active:bg-muted dark:data-active:text-foreground [&_svg]:size-4"
            >
              <Icon aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1">
          <TabsContent value="profile" className="mt-0 flex flex-col gap-6">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
                <ImageLightbox src={profile.avatar_url} alt={`${name}'s avatar`} className="shrink-0 rounded-full">
                  <UserAvatar avatarUrl={profile.avatar_url} name={name} size="lg" className="size-16" />
                </ImageLightbox>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                    <p className="font-semibold">{name}</p>
                    {profile.is_verified ? (
                      <CheckCircle2 className="size-4 text-brand" aria-label="Verified" />
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={ROUTES.settingsProfile}>Edit profile</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Member since</p>
                  <p className="mt-1 text-sm font-medium">{format(new Date(profile.created_at), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Email status</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                    {profile.email_verified ? (
                      <>
                        <CheckCircle2 className="size-4 text-brand" aria-hidden="true" />
                        Verified
                      </>
                    ) : (
                      'Not verified'
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose how Bangla AI Hub looks on this device.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={theme === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(value)}
                    className="gap-1.5"
                  >
                    <Icon className="size-4" />
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications are on</CardTitle>
                <CardDescription>
                  You&apos;re already getting real-time alerts — check the bell icon in the top bar, or the{' '}
                  <Link href={ROUTES.notifications} className="font-medium text-brand underline underline-offset-4">
                    notifications page
                  </Link>
                  .
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What you&apos;re notified about</CardTitle>
                <CardDescription>Turn any category off if you don&apos;t want to hear about it.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border/60">
                {NOTIFICATION_CATEGORIES.map(({ key, label, description }) => {
                  const enabled = !profile.muted_notification_categories.includes(key);
                  return (
                    <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div>
                        <label htmlFor={`notif-${key}`} className="text-sm font-medium">
                          {label}
                        </label>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                      <Switch
                        id={`notif-${key}`}
                        checked={enabled}
                        disabled={updateNotificationPreference.isPending}
                        onCheckedChange={(checked) =>
                          updateNotificationPreference.mutate(
                            { category: key, enabled: checked },
                            {
                              onError: () => toast.error(`Couldn't update "${label}". Please try again.`),
                            },
                          )
                        }
                        aria-label={`${label} notifications`}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sign-in method</CardTitle>
                <CardDescription>How you sign in to this account.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {profile.has_google ? (
                  <div className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                    <GoogleIcon className="size-7 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">Signed in with Google</p>
                    </div>
                    <Badge>Connected</Badge>
                  </div>
                ) : null}
                {profile.has_password ? (
                  <div className="flex items-center gap-4 rounded-lg border border-border/60 p-3">
                    <Shield className="size-7 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Password</p>
                      <p className="text-xs text-muted-foreground">This account also has a password set.</p>
                    </div>
                  </div>
                ) : null}
                {profile.has_google ? (
                  <p className="text-xs text-muted-foreground">
                    Two-factor authentication and account recovery are handled by Google.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>This device</CardTitle>
                <CardDescription>Sign out of Bangla AI Hub on this browser only.</CardDescription>
              </CardHeader>
              <CardContent>
                <LogoutButton />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <Card>
              <CardContent className="flex flex-col gap-3 py-6 text-sm text-muted-foreground">
                <p>Bangla AI Hub — a community hub for Bangla-language AI datasets, papers, and tools.</p>
                <Separator />
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <Link href={ROUTES.terms} className="underline underline-offset-4 transition-colors hover:text-foreground">
                    Terms
                  </Link>
                  <Link href={ROUTES.privacy} className="underline underline-offset-4 transition-colors hover:text-foreground">
                    Privacy
                  </Link>
                  <Link href={ROUTES.support} className="underline underline-offset-4 transition-colors hover:text-foreground">
                    Support
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </PageContainer>
  );
}
