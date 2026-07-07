'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  useSubmitContributorApplication,
  useUpdateContributorApplication,
} from '@/lib/hooks/useContributorApplication';
import type {
  MyContributorApplication,
  SubmitContributorApplicationInput,
} from '@/types/contributor-application';

interface ProfileLinkField {
  key: keyof SubmitContributorApplicationInput;
  label: string;
  placeholder: string;
}

const PROFILE_LINK_FIELDS: ProfileLinkField[] = [
  { key: 'github_url', label: 'GitHub', placeholder: 'https://github.com/yourname' },
  { key: 'kaggle_url', label: 'Kaggle', placeholder: 'https://kaggle.com/yourname' },
  { key: 'huggingface_url', label: 'Hugging Face', placeholder: 'https://huggingface.co/yourname' },
  { key: 'scholar_url', label: 'Google Scholar', placeholder: 'https://scholar.google.com/citations?user=...' },
  { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'website_url', label: 'Personal website / portfolio', placeholder: 'https://yourname.dev' },
  { key: 'x_url', label: 'X (Twitter)', placeholder: 'https://x.com/yourname' },
];

function emptyForm(): SubmitContributorApplicationInput {
  return {
    full_name: '',
    profession: '',
    organization: '',
    country: '',
    bio: '',
    expertise: '',
    experience: '',
    motivation: '',
    sample_works: '',
  };
}

function formFromApplication(application: MyContributorApplication): SubmitContributorApplicationInput {
  return {
    full_name: application.full_name,
    profession: application.profession,
    organization: application.organization,
    country: application.country,
    bio: application.bio,
    expertise: application.expertise,
    experience: application.experience,
    motivation: application.motivation,
    sample_works: application.sample_works ?? '',
    github_url: application.profile_links.github_url.url ?? undefined,
    kaggle_url: application.profile_links.kaggle_url.url ?? undefined,
    huggingface_url: application.profile_links.huggingface_url.url ?? undefined,
    scholar_url: application.profile_links.scholar_url.url ?? undefined,
    linkedin_url: application.profile_links.linkedin_url.url ?? undefined,
    website_url: application.profile_links.website_url.url ?? undefined,
    orcid_id: application.profile_links.orcid_id.url ?? undefined,
    x_url: application.profile_links.x_url.url ?? undefined,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface ContributorApplicationFormProps {
  // 'edit' -> PATCH /me (only valid while needs_revision). 'submit' -> POST /
  // (first-ever application, or reapplying after rejected/withdrawn).
  mode: 'submit' | 'edit';
  // Prefill data, independent of `mode` — a reapply after rejection/withdrawal
  // still POSTs a new application, but should still start from the applicant's
  // last answers rather than a blank form (never make them retype everything).
  initialValues?: MyContributorApplication;
}

export function ContributorApplicationForm({ mode, initialValues }: ContributorApplicationFormProps) {
  const isEditing = mode === 'edit';
  const [form, setForm] = useState<SubmitContributorApplicationInput>(() =>
    initialValues ? formFromApplication(initialValues) : emptyForm(),
  );

  const submitMutation = useSubmitContributorApplication();
  const updateMutation = useUpdateContributorApplication();
  const isPending = submitMutation.isPending || updateMutation.isPending;

  function setField<K extends keyof SubmitContributorApplicationInput>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload: SubmitContributorApplicationInput = {
      ...form,
      sample_works: form.sample_works?.trim() || undefined,
      github_url: form.github_url?.trim() || undefined,
      kaggle_url: form.kaggle_url?.trim() || undefined,
      huggingface_url: form.huggingface_url?.trim() || undefined,
      scholar_url: form.scholar_url?.trim() || undefined,
      linkedin_url: form.linkedin_url?.trim() || undefined,
      website_url: form.website_url?.trim() || undefined,
      orcid_id: form.orcid_id?.trim() || undefined,
      x_url: form.x_url?.trim() || undefined,
    };

    const mutation = isEditing ? updateMutation : submitMutation;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEditing ? 'Application updated and resubmitted.' : 'Application submitted.');
      },
      onError: (error) => {
        toast.error(
          errorMessage(error, 'Could not submit your application. Please check the form and try again.'),
        );
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            Tell us who you are and what you&apos;d like to contribute.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(event) => setField('full_name', event.target.value)}
              required
              maxLength={150}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="profession">Profession</Label>
              <Input
                id="profession"
                value={form.profession}
                onChange={(event) => setField('profession', event.target.value)}
                required
                maxLength={150}
                placeholder="e.g. Data Scientist"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={form.organization}
                onChange={(event) => setField('organization', event.target.value)}
                required
                maxLength={150}
                placeholder="e.g. University, company, or independent"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={form.country}
                onChange={(event) => setField('country', event.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Bangladesh"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(event) => setField('bio', event.target.value)}
              required
              minLength={50}
              maxLength={2000}
              rows={3}
              placeholder="At least 50 characters."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expertise">Area of expertise</Label>
            <Input
              id="expertise"
              value={form.expertise}
              onChange={(event) => setField('expertise', event.target.value)}
              required
              maxLength={300}
              placeholder="e.g. Bangla NLP, speech recognition, dataset curation"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="experience">Experience</Label>
            <Textarea
              id="experience"
              value={form.experience}
              onChange={(event) => setField('experience', event.target.value)}
              required
              minLength={50}
              maxLength={3000}
              rows={4}
              placeholder="Your background, projects, publications, or work history. At least 50 characters."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivation">Why do you want to contribute?</Label>
            <Textarea
              id="motivation"
              value={form.motivation}
              onChange={(event) => setField('motivation', event.target.value)}
              required
              minLength={50}
              maxLength={2000}
              rows={3}
              placeholder="At least 50 characters."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sample_works">Previous contributions (optional)</Label>
            <Textarea
              id="sample_works"
              value={form.sample_works ?? ''}
              onChange={(event) => setField('sample_works', event.target.value)}
              maxLength={3000}
              rows={3}
              placeholder="Links or descriptions of things you've built, published, or contributed to."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio links</CardTitle>
          <CardDescription>
            All optional, but a more complete profile is easier for reviewers to evaluate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PROFILE_LINK_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="url"
                value={(form[key] as string | undefined) ?? ''}
                onChange={(event) => setField(key, event.target.value)}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="orcid_id">ORCID iD (optional)</Label>
            <Input
              id="orcid_id"
              value={form.orcid_id ?? ''}
              onChange={(event) => setField('orcid_id', event.target.value)}
              placeholder="0000-0002-1825-0097"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          {isEditing ? 'Resubmit application' : 'Submit application'}
        </Button>
      </div>
    </form>
  );
}
