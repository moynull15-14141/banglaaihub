'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useOwnProfile, useUpdateProfile, useUploadAvatar } from '@/lib/hooks/useProfile';
import { ROUTES } from '@/lib/constants/routes';
import type { UpdateProfileInput } from '@/types/user';

interface LinkField {
  key: keyof UpdateProfileInput;
  label: string;
  placeholder: string;
}

// Same field set/order as ContributorApplicationForm's PROFILE_LINK_FIELDS —
// intentionally kept in sync (not imported directly, since that one's typed
// against the application input shape, not this profile's).
const LINK_FIELDS: LinkField[] = [
  { key: 'github_url', label: 'GitHub', placeholder: 'https://github.com/yourname' },
  { key: 'kaggle_url', label: 'Kaggle', placeholder: 'https://kaggle.com/yourname' },
  { key: 'huggingface_url', label: 'Hugging Face', placeholder: 'https://huggingface.co/yourname' },
  { key: 'scholar_url', label: 'Google Scholar', placeholder: 'https://scholar.google.com/citations?user=...' },
  { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'website_url', label: 'Personal website / portfolio', placeholder: 'https://yourname.dev' },
  { key: 'x_url', label: 'X (Twitter)', placeholder: 'https://x.com/yourname' },
  { key: 'orcid_id', label: 'ORCID iD', placeholder: '0000-0002-1825-0097' },
];

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

export function ProfileSettingsView() {
  const router = useRouter();
  const { data: profile, isLoading, isError, refetch } = useOwnProfile();
  const updateMutation = useUpdateProfile();
  const avatarMutation = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UpdateProfileInput | null>(null);

  useEffect(() => {
    if (!profile || form) return;
    setForm({
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
      institution: profile.institution ?? '',
      location: profile.location ?? '',
      website_url: profile.website_url ?? '',
      github_url: profile.github_url ?? '',
      scholar_url: profile.scholar_url ?? '',
      kaggle_url: profile.kaggle_url ?? '',
      huggingface_url: profile.huggingface_url ?? '',
      linkedin_url: profile.linkedin_url ?? '',
      orcid_id: profile.orcid_id ?? '',
      x_url: profile.x_url ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (isLoading || !form) {
    return <LoadingScreen label="Loading your profile…" />;
  }

  if (isError || !profile) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Couldn't load your profile" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  function handleAvatarSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    avatarMutation.mutate(file, {
      onSuccess: () => toast.success('Avatar updated.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not upload your avatar.')),
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;

    const trimmed: UpdateProfileInput = {};
    for (const [key, value] of Object.entries(form) as [keyof UpdateProfileInput, string][]) {
      const next = value.trim();
      if (next) trimmed[key] = next;
    }

    updateMutation.mutate(trimmed, {
      onSuccess: () => {
        toast.success('Profile updated.');
        router.push(ROUTES.settings);
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not save your changes.')),
    });
  }

  return (
    <PageContainer className="max-w-2xl">
      <SectionHeader title="Edit profile" description="This is what other people see on your public profile." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="relative">
              <UserAvatar
                avatarUrl={profile.avatar_url}
                name={profile.display_name ?? profile.username}
                size="xl"
              />
              <button
                type="button"
                className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="Change avatar"
                disabled={avatarMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="size-3.5" aria-hidden="true" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              PNG, JPG, or WEBP — up to 5MB.
              {avatarMutation.isPending ? <span className="block text-foreground">Uploading…</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={form.display_name ?? ''}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={form.bio ?? ''}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                rows={4}
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="institution">Institution</Label>
                <Input
                  id="institution"
                  value={form.institution ?? ''}
                  onChange={(event) => setForm({ ...form, institution: event.target.value })}
                  placeholder="University, company…"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location ?? ''}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  placeholder="Dhaka, Bangladesh"
                  maxLength={100}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>Shown on your public profile.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {LINK_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  value={form[field.key] ?? ''}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(ROUTES.settings)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
