'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Bell, Info, Monitor, Moon, Shield, Sun, User as UserIcon } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/user/UserAvatar';
import { GoogleIcon } from '@/components/auth/GoogleIcon';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!user) return null;

  return (
    <PageContainer className="max-w-4xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>

      <Tabs
        defaultValue="profile"
        orientation="vertical"
        className="mt-6 flex-col md:flex-row md:gap-8"
      >
        <TabsList className="h-fit w-full shrink-0 flex-col items-stretch gap-1 bg-transparent p-0 md:w-48">
          <TabsTrigger value="profile" className="justify-start gap-2 px-3 py-1.5">
            <UserIcon className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="justify-start gap-2 px-3 py-1.5">
            <Sun className="size-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="justify-start gap-2 px-3 py-1.5">
            <Bell className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="justify-start gap-2 px-3 py-1.5">
            <Shield className="size-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="google" className="justify-start gap-2 px-3 py-1.5">
            <GoogleIcon className="size-4" />
            Google Account
          </TabsTrigger>
          <TabsTrigger value="about" className="justify-start gap-2 px-3 py-1.5">
            <Info className="size-4" />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 md:mt-0">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
              <UserAvatar
                avatarUrl={user.avatar_url}
                name={user.display_name ?? user.username}
                size="lg"
                className="size-14"
              />
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-semibold">{user.display_name ?? user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={ROUTES.settingsProfile}>Edit details</Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 md:mt-0">
          <Card>
            <CardContent className="flex flex-col gap-3 py-6">
              <p className="text-sm font-medium">Theme</p>
              <div className="flex flex-wrap gap-2">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 md:mt-0">
          <Card>
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                Notification preferences are coming soon. You can already review your activity
                on the{' '}
                <Link href={ROUTES.notifications} className="font-medium text-brand underline underline-offset-4">
                  notifications page
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 md:mt-0">
          <Card>
            <CardContent className="flex flex-col gap-4 py-6">
              <p className="text-sm text-muted-foreground">
                Bangla AI Hub has no separate password — sign-in is entirely handled by Google,
                including two-factor authentication and account recovery. Signing out below only
                ends the current session on this device.
              </p>
              <div>
                <LogoutButton />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="google" className="mt-4 md:mt-0">
          <Card>
            <CardContent className="flex items-center gap-4 py-6">
              <GoogleIcon className="size-8 shrink-0" />
              <div className="flex flex-1 flex-col gap-1">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">Signed in with Google</p>
              </div>
              <Badge>Connected</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-4 md:mt-0">
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
      </Tabs>
    </PageContainer>
  );
}
