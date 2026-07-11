'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Camera, ImagePlus, X } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/ui/tag-input';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { UserAvatar } from '@/components/user/UserAvatar';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import {
  useOwnProfile,
  useRemoveCoverImage,
  useUpdateProfile,
  useUploadAvatar,
  useUploadCoverImage,
} from '@/lib/hooks/useProfile';
import { ROUTES } from '@/lib/constants/routes';
import type { ProfileVisibility, UpdateProfileInput } from '@/types/user';

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
  { key: 'gitlab_url', label: 'GitLab', placeholder: 'https://gitlab.com/yourname' },
  { key: 'kaggle_url', label: 'Kaggle', placeholder: 'https://kaggle.com/yourname' },
  { key: 'huggingface_url', label: 'Hugging Face', placeholder: 'https://huggingface.co/yourname' },
  { key: 'scholar_url', label: 'Google Scholar', placeholder: 'https://scholar.google.com/citations?user=...' },
  { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'website_url', label: 'Personal website / portfolio', placeholder: 'https://yourname.dev' },
  { key: 'x_url', label: 'X (Twitter)', placeholder: 'https://x.com/yourname' },
  { key: 'orcid_id', label: 'ORCID iD', placeholder: '0000-0002-1825-0097' },
];

const TEXT_FIELD_KEYS = [
  'display_name',
  'bio',
  'headline',
  'institution',
  'location',
  ...LINK_FIELDS.map((f) => f.key),
] as const;

const VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: 'public', label: 'Public — anyone can view' },
  { value: 'followers_only', label: 'Followers only' },
  { value: 'private', label: 'Private — only you' },
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
  const coverMutation = useUploadCoverImage();
  const removeCoverMutation = useRemoveCoverImage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UpdateProfileInput | null>(null);

  useEffect(() => {
    if (!profile || form) return;
    setForm({
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
      headline: profile.headline ?? '',
      institution: profile.institution ?? '',
      location: profile.location ?? '',
      website_url: profile.website_url ?? '',
      github_url: profile.github_url ?? '',
      gitlab_url: profile.gitlab_url ?? '',
      scholar_url: profile.scholar_url ?? '',
      kaggle_url: profile.kaggle_url ?? '',
      huggingface_url: profile.huggingface_url ?? '',
      linkedin_url: profile.linkedin_url ?? '',
      orcid_id: profile.orcid_id ?? '',
      x_url: profile.x_url ?? '',
      research_interests: profile.research_interests,
      skills: profile.skills,
      languages: profile.languages,
      visibility: profile.profile_visibility,
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

  function handleCoverSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    coverMutation.mutate(file, {
      onSuccess: () => toast.success('Cover image updated.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not upload your cover image.')),
    });
  }

  function handleRemoveCover() {
    removeCoverMutation.mutate(undefined, {
      onSuccess: () => toast.success('Cover image removed.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not remove your cover image.')),
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;

    const trimmed: UpdateProfileInput = {
      research_interests: form.research_interests ?? [],
      skills: form.skills ?? [],
      languages: form.languages ?? [],
      visibility: form.visibility,
    };
    for (const key of TEXT_FIELD_KEYS) {
      const value = form[key];
      if (typeof value === 'string') {
        const next = value.trim();
        if (next) (trimmed as Record<string, string>)[key] = next;
      }
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
    <PageContainer className="max-w-242">
      <SectionHeader title="Edit profile" description="This is what other people see on your public profile." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto]">
            <div className="space-y-3">
              <div>
                <CardTitle>Cover image</CardTitle>
                <CardDescription>Shown at the top of your public profile.</CardDescription>
              </div>
              <ImageLightbox src={profile.cover_image} alt="Your cover image" className="block w-full">
                <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                  {profile.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.cover_image} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-sm text-muted-foreground">No cover image set</span>
                  )}
                </div>
              </ImageLightbox>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={coverMutation.isPending}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" aria-hidden="true" />
                  {coverMutation.isPending ? 'Uploading…' : 'Upload cover'}
                </Button>
                {profile.cover_image ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removeCoverMutation.isPending}
                    onClick={handleRemoveCover}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleCoverSelect}
              />
              <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP — up to 8MB.</p>
            </div>

            <div className="flex flex-col items-center gap-3 sm:w-48 sm:border-l sm:border-border sm:pl-6">
              <CardTitle className="self-start sm:self-center">Avatar</CardTitle>
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
              <p className="text-center text-xs text-muted-foreground">
                PNG, JPG, or WEBP — up to 5MB.
                {avatarMutation.isPending ? <span className="block text-foreground">Uploading…</span> : null}
              </p>
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
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={form.headline ?? ''}
                onChange={(event) => setForm({ ...form, headline: event.target.value })}
                placeholder="AI researcher & Bangla NLP enthusiast"
                maxLength={200}
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
            <CardTitle>Skills & interests</CardTitle>
            <CardDescription>Helps others (and search) find you.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="skills">Skills</Label>
              <TagInput
                id="skills"
                value={form.skills ?? []}
                onChange={(skills) => setForm({ ...form, skills })}
                placeholder="Python, NLP, PyTorch…"
                maxTags={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="research-interests">Research interests</Label>
              <TagInput
                id="research-interests"
                value={form.research_interests ?? []}
                onChange={(research_interests) => setForm({ ...form, research_interests })}
                placeholder="Bangla language models…"
                maxTags={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="languages">Languages</Label>
              <TagInput
                id="languages"
                value={form.languages ?? []}
                onChange={(languages) => setForm({ ...form, languages })}
                placeholder="bn, en…"
                maxTags={10}
              />
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
                  value={(form[field.key] as string) ?? ''}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Who can see your profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="visibility">Profile visibility</Label>
              <FilterSelect
                id="visibility"
                value={form.visibility ?? 'public'}
                onChange={(event) => setForm({ ...form, visibility: event.target.value as ProfileVisibility })}
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
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
