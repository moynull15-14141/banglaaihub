'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { RichTextEditor } from '@/components/resource/RichTextEditor';
import { ThumbnailUrlInput } from '@/components/resource/ThumbnailUrlInput';
import { SeoScorePanel } from '@/components/admin/content/seo/SeoScorePanel';
import { SeoDetailsPanel } from '@/components/admin/content/seo/SeoDetailsPanel';
import { WorkflowTransitionMenu } from '@/components/admin/content/workflow/WorkflowTransitionMenu';
import { LockBanner } from '@/components/admin/content/workflow/LockBanner';
import { AssignmentPanel } from '@/components/admin/content/workflow/AssignmentPanel';
import { EditorialCommentsPanel } from '@/components/admin/content/workflow/EditorialCommentsPanel';
import { RevisionHistoryPanel } from '@/components/admin/content/workflow/RevisionHistoryPanel';
import { PublishChecklist } from '@/components/admin/content/workflow/PublishChecklist';
import { useCategories } from '@/lib/hooks/useCategories';
import { useCreateResource, useResource, useUpdateResource, useUploadResourceFile } from '@/lib/hooks/useResources';
import { usePublishArticle, useArchiveArticle } from '@/lib/hooks/useArticles';
import { useArticleLockHeartbeat } from '@/lib/hooks/useArticleLock';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';
import { ARTICLE_CONTENT_TYPE_OPTIONS } from '@/lib/constants/resourceTypes';
import type { ArticleContentType, ArticleInput, CreateResourceInput } from '@/types/resource';

const PRE_PUBLISH_STATUSES = new Set([
  'draft',
  'idea',
  'in_review',
  'seo_review',
  'needs_changes',
  'ready_to_publish',
]);
const AUTOSAVE_INTERVAL_MS = 30000;

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface ArticleFormState {
  title: string;
  description: string;
  category_id: number | undefined;
  tagsText: string;
  article: ArticleInput;
}

const EMPTY_FORM: ArticleFormState = {
  title: '',
  description: '',
  category_id: undefined,
  tagsText: '',
  article: { content_type: 'article', allow_comments: true, allow_reactions: true, allow_sharing: true },
};

interface ArticleEditorViewProps {
  // Omitted for "new article" — the resource doesn't exist yet, so there's
  // no slug until the first Save Draft succeeds (same pattern as
  // SubmitResourceView vs. EditResourceView for other resource types).
  slug?: string;
}

export function ArticleEditorView({ slug }: ArticleEditorViewProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isEditing = Boolean(slug);
  const { data: resource, isLoading, isError, refetch } = useResource(slug ?? '');
  const { data: categories } = useCategories();
  const createMutation = useCreateResource();
  const updateMutation = useUpdateResource(slug ?? '');
  const publishMutation = usePublishArticle(slug ?? '');
  const archiveMutation = useArchiveArticle(slug ?? '');
  const featuredImageUploadMutation = useUploadResourceFile();

  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [initialized, setInitialized] = useState(!isEditing);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [featuredImageUploadError, setFeaturedImageUploadError] = useState<string | null>(null);
  // Same signed-URL-resend hazard as EditResourceView's thumbnail handling —
  // resource.article.featured_image_url is a resolved (possibly signed) URL,
  // so only send it back if the user actually changed it.
  const [initialFeaturedImageUrl, setInitialFeaturedImageUrl] = useState('');
  const [currentSlug, setCurrentSlug] = useState(slug);
  const [scheduledAt, setScheduledAt] = useState('');
  const [slugValue, setSlugValue] = useState(slug ?? '');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [checklistOverride, setChecklistOverride] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Content locking (Phase 5A-3) — poll-based, no WebSocket infra exists in
  // this codebase. `rejected` means someone else currently holds the lock.
  const { rejected: lockRejected } = useArticleLockHeartbeat(currentSlug ?? '', Boolean(currentSlug));
  const isAdmin = user?.roles.some((role) => role === 'admin' || role === 'super_admin') ?? false;

  // Autosave (Phase 5A-3) — every 30s while dirty, but never for an already-
  // published article (status !== a pre-publish state), so a live article is
  // never silently overwritten; only the explicit "Save changes" button
  // applies there. buildPayload() is defined further down in this component
  // (a plain function, not a hook) — read through a ref here so this
  // unconditional hook registration doesn't have to be reordered around it.
  const buildPayloadRef = useRef<() => CreateResourceInput>(() => ({ title: '', type: 'article' }));
  const lastSavedSnapshotRef = useRef<string>('');

  useEffect(() => {
    if (!initialized) return;
    const snapshot = JSON.stringify(form);
    if (lastSavedSnapshotRef.current === '') {
      lastSavedSnapshotRef.current = snapshot;
      return;
    }
    if (snapshot !== lastSavedSnapshotRef.current) {
      setIsDirty(true);
    }
  }, [form, initialized]);

  useEffect(() => {
    if (!currentSlug || !resource || !PRE_PUBLISH_STATUSES.has(resource.status)) return undefined;

    const interval = setInterval(() => {
      if (!isDirty) return;
      updateMutation.mutate(buildPayloadRef.current(), {
        onSuccess: () => {
          lastSavedSnapshotRef.current = JSON.stringify(form);
          setIsDirty(false);
        },
        // Silent on failure — a 30s autosave shouldn't spam a toast; the
        // explicit Save button surfaces real errors.
      });
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form/updateMutation intentionally excluded: the interval re-reads the latest form via buildPayloadRef each tick rather than recreating the timer on every keystroke
  }, [currentSlug, resource?.status, isDirty]);

  if (isEditing && resource && !initialized) {
    setForm({
      title: resource.title,
      description: resource.description ?? '',
      category_id: resource.category?.id,
      tagsText: resource.tags.join(', '),
      article: {
        excerpt: resource.article?.excerpt ?? '',
        body: resource.article?.body ?? '',
        content_type: resource.article?.content_type ?? 'article',
        seo_title: resource.article?.seo_title ?? '',
        seo_description: resource.article?.seo_description ?? '',
        canonical_url: resource.article?.canonical_url ?? '',
        focus_keyword: resource.article?.focus_keyword ?? '',
        meta_keywords: resource.article?.meta_keywords ?? '',
        featured_image_alt: resource.article?.featured_image_alt ?? '',
        featured_image_url: resource.article?.featured_image_url ?? '',
        allow_comments: resource.article?.allow_comments ?? true,
        allow_reactions: resource.article?.allow_reactions ?? true,
        allow_sharing: resource.article?.allow_sharing ?? true,
      },
    });
    setInitialFeaturedImageUrl(resource.article?.featured_image_url ?? '');
    setSlugValue(resource.slug);
    setInitialized(true);
  }

  if (isEditing && (isLoading || !initialized)) {
    return <LoadingScreen label="Loading article…" />;
  }

  if (isEditing && (isError || !resource)) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Couldn't load this article" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  function buildPayload(): CreateResourceInput {
    const tags = form.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);

    return {
      title: form.title,
      description: form.description.trim() || undefined,
      type: 'article',
      // Only sent when the permalink was actually touched — omitting it
      // keeps the auto-derived-from-title slug behavior on create, and
      // avoids a spurious re-slug on every save while editing.
      slug: slugValue.trim() && slugValue.trim() !== currentSlug ? slugValue.trim() : undefined,
      category_id: form.category_id,
      tags,
      article: {
        ...form.article,
        featured_image_url:
          isEditing && form.article.featured_image_url === initialFeaturedImageUrl
            ? undefined
            : form.article.featured_image_url?.trim() || undefined,
        // canonical_url is validated as a URL server-side (z.string().url()) —
        // an empty string isn't a valid URL, so "no canonical URL" must be
        // sent as omitted, not ''. Editing an existing article whose
        // canonical_url was never set loads it as '' (see the ?? '' below),
        // and without this it round-trips straight back out as '' on save,
        // 400ing every update to that article until the field is touched.
        canonical_url: form.article.canonical_url?.trim() || undefined,
      },
    };
  }
  buildPayloadRef.current = buildPayload;

  function handleSaveDraft(event: React.FormEvent) {
    event.preventDefault();
    const payload = buildPayload();

    if (isEditing && currentSlug) {
      updateMutation.mutate(payload, {
        onSuccess: (updated) => {
          toast.success('Draft saved.');
          lastSavedSnapshotRef.current = JSON.stringify(form);
          setIsDirty(false);
          const updatedSlug = (updated as { slug?: string }).slug;
          if (updatedSlug && updatedSlug !== currentSlug) {
            setCurrentSlug(updatedSlug);
            setSlugValue(updatedSlug);
            router.replace(ROUTES.adminContentArticleEdit(updatedSlug));
          }
        },
        onError: (error) => toast.error(errorMessage(error, 'Could not save this draft.')),
      });
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        toast.success('Draft saved.');
        lastSavedSnapshotRef.current = JSON.stringify(form);
        setIsDirty(false);
        setCurrentSlug(created.slug);
        setSlugValue(created.slug);
        router.replace(ROUTES.adminContentArticleEdit(created.slug));
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not create this article.')),
    });
  }

  function handlePublish() {
    if (!currentSlug) {
      toast.error('Save the draft before publishing.');
      return;
    }
    publishMutation.mutate(
      {
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        override: checklistOverride,
      },
      {
        onSuccess: () => toast.success(scheduledAt ? 'Article scheduled.' : 'Article published.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not publish this article.')),
      },
    );
  }

  function handleArchive() {
    if (!currentSlug) return;
    archiveMutation.mutate(undefined, {
      onSuccess: () => toast.success('Article archived.'),
      onError: (error) => toast.error(errorMessage(error, 'Could not archive this article.')),
    });
  }

  function handleFeaturedImageChange(file: File | null) {
    setFeaturedImageFile(file);
    setFeaturedImageUploadError(null);
    if (!file || !currentSlug) return;

    featuredImageUploadMutation.mutate(
      { slug: currentSlug, file, kind: 'article_image' },
      {
        onSuccess: async () => {
          toast.success('Featured image updated.');
          const fresh = await refetch();
          const newUrl = fresh.data?.article?.featured_image_url ?? '';
          setForm((prev) => ({ ...prev, article: { ...prev.article, featured_image_url: newUrl } }));
          setInitialFeaturedImageUrl(newUrl);
        },
        onError: (error) =>
          setFeaturedImageUploadError(errorMessage(error, 'The featured image upload failed.')),
      },
    );
  }

  const isDraft = !resource || PRE_PUBLISH_STATUSES.has(resource.status);
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const previewTags = form.tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
  // Shared by SeoScorePanel (score + checklist, in the sticky sidebar) and
  // SeoDetailsPanel (previews + advanced fields, in the main column) so
  // both stay in sync off one object instead of two separately-built ones.
  const seoInput = {
    title: form.title,
    slug: currentSlug ?? '',
    excerpt: form.article.excerpt,
    bodyHtml: form.article.body,
    focusKeyword: form.article.focus_keyword,
    seoTitle: form.article.seo_title,
    seoDescription: form.article.seo_description,
    canonicalUrl: form.article.canonical_url,
    featuredImageUrl: form.article.featured_image_url,
    featuredImageAlt: form.article.featured_image_alt,
    categoryId: form.category_id,
    tags: previewTags,
    siteOrigin: typeof window !== 'undefined' ? window.location.origin : '',
  };

  return (
    <PageContainer className="max-w-6xl">
      {currentSlug ? <LockBanner slug={currentSlug} enabled /> : null}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {isEditing ? 'Edit article' : 'New article'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isDraft
              ? 'Save as a draft, then move it through review and publish or schedule it when ready.'
              : 'This article is live. Changes save immediately.'}
          </p>
        </div>
        {resource && currentSlug ? <WorkflowTransitionMenu slug={currentSlug} status={resource.status} /> : null}
      </div>

      <form
        onSubmit={handleSaveDraft}
        className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start"
      >
        {/* SEO sidebar — sticky on the left so the live score/checklist stays
            visible while writing, instead of only being reachable by
            scrolling past the whole Content card. */}
        <div className="order-2 flex flex-col gap-6 lg:sticky lg:top-20 lg:order-1 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>SEO overrides</CardTitle>
              <CardDescription>Overrides for search engines and social sharing previews.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="seo-title">SEO title</Label>
                <Input
                  id="seo-title"
                  value={form.article.seo_title ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, article: { ...form.article, seo_title: event.target.value } })
                  }
                  maxLength={70}
                  placeholder="Defaults to the article title."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seo-description">SEO description</Label>
                <Textarea
                  id="seo-description"
                  value={form.article.seo_description ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, article: { ...form.article, seo_description: event.target.value } })
                  }
                  rows={2}
                  maxLength={200}
                  placeholder="Defaults to the excerpt."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="canonical-url">Canonical URL</Label>
                <Input
                  id="canonical-url"
                  type="url"
                  value={form.article.canonical_url ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, article: { ...form.article, canonical_url: event.target.value } })
                  }
                  placeholder="https://… (only if this content is republished from elsewhere)"
                />
              </div>
            </CardContent>
          </Card>

          <SeoScorePanel input={seoInput} />
        </div>

        <div className="order-1 flex flex-col gap-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                  minLength={5}
                  maxLength={300}
                  disabled={lockRejected}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={form.article.excerpt ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, article: { ...form.article, excerpt: event.target.value } })
                  }
                  rows={2}
                  maxLength={500}
                  placeholder="A short summary shown in listings and search results."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Body</Label>
                <RichTextEditor
                  value={form.article.body ?? ''}
                  onChange={(html) => setForm({ ...form, article: { ...form.article, body: html } })}
                  placeholder="Write your article…"
                  onEditorReady={setEditor}
                  editable={!lockRejected}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="content-type">Content type</Label>
                  <FilterSelect
                    id="content-type"
                    value={form.article.content_type ?? 'article'}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        article: { ...form.article, content_type: event.target.value as ArticleContentType },
                      })
                    }
                  >
                    {ARTICLE_CONTENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category</Label>
                  <FilterSelect
                    id="category"
                    value={form.category_id ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        category_id: event.target.value ? Number(event.target.value) : undefined,
                      })
                    }
                  >
                    <option value="">No category</option>
                    {(categories ?? []).map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </FilterSelect>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={form.tagsText}
                  onChange={(event) => setForm({ ...form, tagsText: event.target.value })}
                  placeholder="bangla-nlp, tutorial, release"
                />
              </div>
              <ThumbnailUrlInput
                id="featured-image"
                label="Featured image"
                value={form.article.featured_image_url ?? ''}
                onChange={(value) =>
                  setForm({ ...form, article: { ...form.article, featured_image_url: value } })
                }
                file={featuredImageFile}
                onFileChange={handleFeaturedImageChange}
                uploading={featuredImageUploadMutation.isPending}
                uploaded={featuredImageUploadMutation.isSuccess}
                uploadError={featuredImageUploadError}
              />
            </CardContent>
          </Card>

          {currentSlug ? <AssignmentPanel slug={currentSlug} /> : null}
          {currentSlug ? <EditorialCommentsPanel slug={currentSlug} /> : null}
          {currentSlug ? <RevisionHistoryPanel slug={currentSlug} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>Engagement</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {(
                [
                  ['allow_comments', 'Allow comments'],
                  ['allow_reactions', 'Allow reactions'],
                  ['allow_sharing', 'Allow sharing'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Switch
                    id={key}
                    checked={form.article[key] ?? true}
                    onCheckedChange={(checked) => setForm({ ...form, article: { ...form.article, [key]: checked } })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <SeoDetailsPanel
            input={seoInput}
            editor={editor}
            focusKeyword={form.article.focus_keyword ?? ''}
            onFocusKeywordChange={(value) => setForm({ ...form, article: { ...form.article, focus_keyword: value } })}
            metaKeywords={form.article.meta_keywords ?? ''}
            onMetaKeywordsChange={(value) => setForm({ ...form, article: { ...form.article, meta_keywords: value } })}
            featuredImageAlt={form.article.featured_image_alt ?? ''}
            onFeaturedImageAltChange={(value) =>
              setForm({ ...form, article: { ...form.article, featured_image_alt: value } })
            }
            slugValue={slugValue}
            onSlugChange={setSlugValue}
            slugEditable={Boolean(currentSlug)}
          />

          {currentSlug && isDraft ? (
            <>
              <PublishChecklist
                input={{
                  title: form.title,
                  slug: slugValue,
                  excerpt: form.article.excerpt,
                  bodyHtml: form.article.body,
                  focusKeyword: form.article.focus_keyword,
                  seoTitle: form.article.seo_title,
                  seoDescription: form.article.seo_description,
                  canonicalUrl: form.article.canonical_url,
                  featuredImageUrl: form.article.featured_image_url,
                  featuredImageAlt: form.article.featured_image_alt,
                  categoryId: form.category_id,
                  tags: previewTags,
                  siteOrigin: typeof window !== 'undefined' ? window.location.origin : '',
                }}
                isAdmin={isAdmin}
                override={checklistOverride}
                onOverrideChange={setChecklistOverride}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Publish</CardTitle>
                  <CardDescription>Publish immediately, or schedule a future publish time.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="scheduled-at">Schedule for (optional)</Label>
                    <Input
                      id="scheduled-at"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={handlePublish} loading={publishMutation.isPending}>
                    {scheduledAt ? 'Schedule' : 'Publish now'}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : null}

          {currentSlug && resource && !isDraft && resource.status !== 'archived' ? (
            <Card>
              <CardHeader>
                <CardTitle>Archive</CardTitle>
                <CardDescription>Pulls this article out of public view without deleting it.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" variant="outline" onClick={handleArchive} loading={archiveMutation.isPending}>
                  Archive
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(ROUTES.adminContentArticles)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              {isEditing ? 'Save changes' : 'Save draft'}
            </Button>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}
