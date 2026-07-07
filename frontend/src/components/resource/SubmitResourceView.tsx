'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/common/PageContainer';
import { FilterSelect } from '@/components/common/FilterSelect';
import { ResourceTypeFields } from '@/components/resource/ResourceTypeFields';
import { FileDropzone } from '@/components/resource/FileDropzone';
import { ThumbnailUrlInput } from '@/components/resource/ThumbnailUrlInput';
import { SubmitStepIndicator, type SubmitStep } from '@/components/resource/SubmitStepIndicator';
import { useCategories } from '@/lib/hooks/useCategories';
import { useCreateResource, useUploadResourceFile } from '@/lib/hooks/useResources';
import { useAutosaveDraft, readDraft, clearDraft } from '@/lib/hooks/useAutosaveDraft';
import { ROUTES } from '@/lib/constants/routes';
import { RESOURCE_TYPE_LABELS, RESOURCE_TYPE_OPTIONS, LANGUAGE_OPTIONS } from '@/lib/constants/resourceTypes';
import type {
  CreateResourceInput,
  CreateResourceResult,
  DatasetInput,
  PaperInput,
  ResourceLanguage,
  ResourceType,
  ToolInput,
} from '@/types/resource';

// Dataset file uploads reuse the existing StorageService allow-list
// (backend/src/services/storage.service.ts's DATASET_ALLOWED_EXTENSIONS) —
// kept in sync manually since it's server-enforced regardless of what this
// accepts client-side.
const DATASET_FILE_ACCEPT = '.csv,.json,.txt,.zip,.tar,.gz,.parquet,.py,.ipynb';

const DRAFT_KEY = 'banglaai:submit-draft:v1';

const STEPS: SubmitStep[] = [
  { key: 'form', label: 'Details' },
  { key: 'review', label: 'Review' },
  { key: 'success', label: 'Done' },
];

type Step = 'form' | 'review' | 'success';

interface DraftShape {
  form: CreateResourceInput;
  tagsText: string;
}

function emptyForm(): CreateResourceInput {
  return { title: '', description: '', type: 'dataset', language: 'bn' };
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

// Strips empty-string/undefined/empty-array keys so optional `.url()` fields
// (which reject '' but accept being omitted) don't fail validation just
// because the user left them blank.
function cleanObject<T extends object>(obj: T): T {
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value === '' || value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    (result as Record<string, unknown>)[key] = value;
  }
  return result;
}

export function SubmitResourceView() {
  const router = useRouter();
  const { data: categories } = useCategories();
  const createMutation = useCreateResource();
  const uploadMutation = useUploadResourceFile();

  const thumbnailUploadMutation = useUploadResourceFile();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<CreateResourceInput>(emptyForm);
  const [tagsText, setTagsText] = useState('');
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [result, setResult] = useState<CreateResourceResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  const [hasAttemptedContinue, setHasAttemptedContinue] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Restore an unsaved draft left over from a page refresh/close — browser
  // storage only, cleared automatically on successful submission.
  useEffect(() => {
    const draft = readDraft<DraftShape>(DRAFT_KEY);
    if (draft?.form?.title || draft?.form?.description) {
      setForm(draft.form);
      setTagsText(draft.tagsText ?? '');
      setDraftRestored(true);
    }
  }, []);

  useAutosaveDraft(DRAFT_KEY, useMemo(() => ({ form, tagsText }), [form, tagsText]), step === 'form');

  function setField<K extends keyof CreateResourceInput>(key: K, value: CreateResourceInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setDataset(patch: Partial<DatasetInput>) {
    setForm((prev) => ({ ...prev, dataset: { ...prev.dataset, ...patch } }));
  }
  function setPaper(patch: Partial<PaperInput>) {
    setForm((prev) => ({ ...prev, paper: { ...prev.paper, ...patch } }));
  }
  function setTool(patch: Partial<ToolInput>) {
    setForm((prev) => ({ ...prev, tool: { ...prev.tool, ...patch } }));
  }

  function handleTypeChange(nextType: ResourceType) {
    setForm((prev) => ({ ...prev, type: nextType }));
    if (nextType !== 'dataset') setDatasetFile(null);
  }

  function discardDraft() {
    clearDraft(DRAFT_KEY);
    setForm(emptyForm());
    setTagsText('');
    setDraftRestored(false);
  }

  const tags = tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};
    const title = form.title.trim();
    const description = form.description?.trim() ?? '';
    if (title.length === 0) next.title = 'Title is required.';
    else if (title.length < 5) next.title = 'Title must be at least 5 characters.';
    if (description.length === 0) next.description = 'Description is required.';
    else if (description.length < 50) next.description = `${50 - description.length} more characters needed.`;
    return next;
  }, [form.title, form.description]);

  const isFormValid = Object.keys(errors).length === 0;

  function scrollToFirstError() {
    if (errors.title) {
      titleRef.current?.focus();
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (errors.description) {
      descriptionRef.current?.focus();
      descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function handleReview(event: React.FormEvent) {
    event.preventDefault();
    setHasAttemptedContinue(true);
    if (!isFormValid) {
      scrollToFirstError();
      return;
    }
    setStep('review');
  }

  function buildPayload(): CreateResourceInput {
    return cleanObject({
      title: form.title.trim(),
      description: form.description?.trim(),
      type: form.type,
      category_id: form.category_id,
      tags,
      language: form.language,
      license: form.license?.trim(),
      external_url: form.external_url?.trim(),
      thumbnail_url: thumbnailFile ? undefined : form.thumbnail_url?.trim(),
      dataset: form.type === 'dataset' ? cleanObject(form.dataset ?? {}) : undefined,
      paper: form.type === 'paper' ? cleanObject(form.paper ?? {}) : undefined,
      tool: form.type === 'tool' ? cleanObject(form.tool ?? {}) : undefined,
    });
  }

  function runUpload(slug: string) {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    uploadMutation.mutate(
      {
        slug,
        file: datasetFile as File,
        signal: controller.signal,
        onProgress: (info) => {
          setUploadProgress(info.percent);
          setUploadSpeed(info.bytesPerSecond);
        },
      },
      {
        onSuccess: () => setUploadError(null),
        onError: (error) => {
          if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
            setUploadError('Upload cancelled.');
            return;
          }
          setUploadError(
            errorMessage(error, 'Your resource was created, but the file upload failed. You can retry it below.'),
          );
        },
      },
    );
  }

  function runThumbnailUpload(slug: string) {
    thumbnailUploadMutation.mutate(
      { slug, file: thumbnailFile as File, kind: 'thumbnail' },
      {
        onSuccess: () => setThumbnailUploadError(null),
        onError: (error) =>
          setThumbnailUploadError(errorMessage(error, 'The thumbnail upload failed. You can retry it below.')),
      },
    );
  }

  function handleSubmit() {
    const payload = buildPayload();
    createMutation.mutate(payload, {
      onSuccess: (created) => {
        setResult(created);
        clearDraft(DRAFT_KEY);
        setStep('success');
        if (form.type === 'dataset' && datasetFile) {
          runUpload(created.slug);
        }
        if (thumbnailFile) {
          runThumbnailUpload(created.slug);
        }
      },
      onError: (error) => {
        toast.error(errorMessage(error, 'Could not submit your resource. Please check the form and try again.'));
      },
    });
  }

  function handleCancelUpload() {
    abortControllerRef.current?.abort();
  }

  function handleRetryUpload() {
    if (!result || !datasetFile) return;
    setUploadError(null);
    runUpload(result.slug);
  }

  function handleRetryThumbnailUpload() {
    if (!result || !thumbnailFile) return;
    runThumbnailUpload(result.slug);
  }

  function handleSubmitAnother() {
    setForm(emptyForm());
    setTagsText('');
    setDatasetFile(null);
    setThumbnailFile(null);
    setResult(null);
    setUploadProgress(0);
    setUploadSpeed(null);
    setUploadError(null);
    setThumbnailUploadError(null);
    setHasAttemptedContinue(false);
    setStep('form');
  }

  const selectedCategory = categories?.find((category) => category.id === form.category_id);

  // Local object-URL preview for an uploaded-but-not-yet-submitted thumbnail
  // file — there's no server URL for it until after the resource exists.
  const [thumbnailFilePreview, setThumbnailFilePreview] = useState<string | null>(null);
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailFilePreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [thumbnailFile]);

  const thumbnailPreviewUrl = thumbnailFilePreview ?? form.thumbnail_url;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  if (step === 'success' && result) {
    return (
      <PageContainer className="max-w-2xl">
        <SubmitStepIndicator steps={STEPS} currentIndex={stepIndex} />
        <Card>
          <CardHeader className="items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="size-7" aria-hidden="true" />
            </span>
            <CardTitle className="mt-3 text-2xl">Submission received</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="brand">{RESOURCE_TYPE_LABELS[form.type]}</Badge>
              <Badge variant="warning">Pending review</Badge>
            </div>
            <p className="text-center text-sm font-medium">{form.title}</p>

            {form.type === 'dataset' && datasetFile ? (
              <div className="space-y-2">
                <FileDropzone
                  label="Dataset file"
                  file={datasetFile}
                  onFileSelect={() => {}}
                  uploading={uploadMutation.isPending}
                  progress={uploadProgress}
                  bytesPerSecond={uploadSpeed}
                  uploaded={!uploadError && !uploadMutation.isPending}
                  error={uploadError}
                  onCancel={handleCancelUpload}
                  disabled={!uploadMutation.isPending}
                />
                {uploadError ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleRetryUpload}>
                    Retry upload
                  </Button>
                ) : null}
              </div>
            ) : null}

            {thumbnailFile ? (
              <div className="space-y-2">
                <FileDropzone
                  label="Thumbnail"
                  file={thumbnailFile}
                  onFileSelect={() => {}}
                  uploading={thumbnailUploadMutation.isPending}
                  uploaded={!thumbnailUploadError && !thumbnailUploadMutation.isPending}
                  error={thumbnailUploadError}
                  disabled={!thumbnailUploadMutation.isPending}
                />
                {thumbnailUploadError ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleRetryThumbnailUpload}>
                    Retry upload
                  </Button>
                ) : null}
              </div>
            ) : null}

            <Alert>
              <Info />
              <AlertTitle>What happens next</AlertTitle>
              <AlertDescription>
                A moderator will review your submission — most reviews finish within 48 hours. You&apos;ll get a
                notification and email as soon as there&apos;s a decision.
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button variant="outline" onClick={handleSubmitAnother}>
                Submit another resource
              </Button>
              <Button asChild variant="ghost">
                <a href={ROUTES.dashboard}>Back to dashboard</a>
              </Button>
              <Button onClick={() => router.push(ROUTES.mySubmissions)}>Go to My Submissions</Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (step === 'review') {
    return (
      <PageContainer className="max-w-2xl">
        <SubmitStepIndicator steps={STEPS} currentIndex={stepIndex} onStepClick={() => setStep('form')} />
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Review your submission</h1>
        <p className="mt-1 text-muted-foreground">
          Double-check everything before submitting — you can still go back and edit.
        </p>

        <Card className="mt-6 overflow-hidden py-0">
          {thumbnailPreviewUrl ? (
            <div className="flex h-40 items-center justify-center overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied external URL or local object URL */}
              <img src={thumbnailPreviewUrl} alt="" className="size-full object-cover" />
            </div>
          ) : null}
          <CardHeader className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="brand">{RESOURCE_TYPE_LABELS[form.type]}</Badge>
              {selectedCategory ? <Badge variant="secondary">{selectedCategory.name}</Badge> : null}
              {form.license ? <Badge variant="outline">{form.license}</Badge> : null}
              <Badge variant="outline">{LANGUAGE_OPTIONS.find((option) => option.value === form.language)?.label}</Badge>
            </div>
            <CardTitle className="font-heading text-2xl">{form.title}</CardTitle>
            {form.description ? (
              <CardDescription className="whitespace-pre-line">{form.description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            {form.external_url ? (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">External link</p>
                <p className="mt-1 truncate text-sm">{form.external_url}</p>
              </div>
            ) : null}

            {form.type === 'dataset' ? (
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Dataset file</p>
                {datasetFile ? (
                  <p className="text-sm">{datasetFile.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No file attached — you can upload it now or add it later from My Submissions.
                  </p>
                )}
              </div>
            ) : null}

            {form.type === 'paper' && (form.paper?.venue || form.paper?.year || form.paper?.doi) ? (
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Paper details</p>
                <p className="text-sm text-muted-foreground">
                  {[form.paper?.venue, form.paper?.year, form.paper?.doi].filter(Boolean).join(' · ')}
                </p>
              </div>
            ) : null}

            {form.type === 'tool' && (form.tool?.tool_type || form.tool?.platform) ? (
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Tool details</p>
                <p className="text-sm text-muted-foreground">
                  {[form.tool?.tool_type, form.tool?.platform].filter(Boolean).join(' · ')}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between gap-3">
          <Button variant="outline" onClick={() => setStep('form')}>
            Back to edit
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            Confirm and submit
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-2xl">
      <SubmitStepIndicator steps={STEPS} currentIndex={stepIndex} />
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Submit a resource</h1>
      <p className="mt-1 text-muted-foreground">
        Share a dataset, paper, tool, or other resource with the Bangla AI community. Every submission is reviewed
        before publishing.
      </p>

      {draftRestored ? (
        <Alert className="mt-4">
          <Info />
          <AlertTitle>Draft restored</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>We restored your unsaved form from your last visit.</span>
            <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
              <X className="size-3.5" aria-hidden="true" />
              Discard
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleReview} noValidate className="mt-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resource type</CardTitle>
            <CardDescription>Changing the type changes which fields appear below.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Resource type">
              {RESOURCE_TYPE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={form.type === option.value}
                  variant={form.type === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={titleRef}
                id="title"
                value={form.title}
                onChange={(event) => setField('title', event.target.value)}
                maxLength={300}
                placeholder="Bangla Sentiment Dataset V2"
                aria-required="true"
                aria-invalid={hasAttemptedContinue && Boolean(errors.title) ? true : undefined}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              <div className="flex items-center justify-between">
                {hasAttemptedContinue && errors.title ? (
                  <p id="title-error" className="text-xs text-destructive">
                    {errors.title}
                  </p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-muted-foreground">{form.title.length}/300</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                ref={descriptionRef}
                id="description"
                value={form.description ?? ''}
                onChange={(event) => setField('description', event.target.value)}
                maxLength={5000}
                rows={5}
                placeholder="Describe what this resource is, how it was made, and why it's useful. At least 50 characters — the more detail, the faster it's reviewed."
                aria-required="true"
                aria-invalid={hasAttemptedContinue && Boolean(errors.description) ? true : undefined}
                aria-describedby={errors.description ? 'description-error' : 'description-hint'}
              />
              <div className="flex items-center justify-between">
                {hasAttemptedContinue && errors.description ? (
                  <p id="description-error" className="text-xs text-destructive">
                    {errors.description}
                  </p>
                ) : (
                  <p id="description-hint" className="text-xs text-muted-foreground">
                    Minimum 50 characters.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{(form.description ?? '').length}/5000</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <FilterSelect
                  id="category"
                  value={form.category_id ?? ''}
                  onChange={(event) =>
                    setField('category_id', event.target.value ? Number(event.target.value) : undefined)
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

              <div className="space-y-1.5">
                <Label htmlFor="language">Language</Label>
                <FilterSelect
                  id="language"
                  value={form.language ?? 'bn'}
                  onChange={(event) => setField('language', event.target.value as ResourceLanguage)}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="sentiment, classification, nlp (comma-separated, up to 10)"
                aria-describedby="tags-hint"
              />
              <p id="tags-hint" className="sr-only">
                Separate tags with commas, up to 10.
              </p>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="license">License</Label>
                <Input
                  id="license"
                  value={form.license ?? ''}
                  onChange={(event) => setField('license', event.target.value)}
                  placeholder="MIT, CC-BY-4.0…"
                />
              </div>
              <ThumbnailUrlInput
                id="thumbnail-url"
                value={form.thumbnail_url ?? ''}
                onChange={(value) => setField('thumbnail_url', value)}
                file={thumbnailFile}
                onFileChange={setThumbnailFile}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="external-url">External link (website, repository, or documentation)</Label>
              <Input
                id="external-url"
                type="url"
                value={form.external_url ?? ''}
                onChange={(event) => setField('external_url', event.target.value)}
                placeholder="https://github.com/…"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{RESOURCE_TYPE_LABELS[form.type]} details</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceTypeFields
              type={form.type}
              dataset={form.dataset ?? {}}
              onDatasetChange={setDataset}
              paper={form.paper ?? {}}
              onPaperChange={setPaper}
              tool={form.tool ?? {}}
              onToolChange={setTool}
            />
          </CardContent>
        </Card>

        {form.type === 'dataset' ? (
          <Card>
            <CardHeader>
              <CardTitle>Dataset file</CardTitle>
              <CardDescription>Optional here — you can also attach it after submitting.</CardDescription>
            </CardHeader>
            <CardContent>
              <FileDropzone
                label="Drag & drop your dataset file, or click to browse"
                hint="CSV, JSON, TXT, ZIP, TAR, GZIP, Parquet, Python, or Notebook — up to 500MB"
                accept={DATASET_FILE_ACCEPT}
                file={datasetFile}
                onFileSelect={setDatasetFile}
              />
            </CardContent>
          </Card>
        ) : null}

        {hasAttemptedContinue && !isFormValid ? (
          <Alert variant="destructive" role="alert">
            <AlertTriangle />
            <AlertTitle>Please fix the following before continuing</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {errors.title ? (
                  <li>
                    <button type="button" className="underline" onClick={() => titleRef.current?.focus()}>
                      {errors.title}
                    </button>
                  </li>
                ) : null}
                {errors.description ? (
                  <li>
                    <button type="button" className="underline" onClick={() => descriptionRef.current?.focus()}>
                      {errors.description}
                    </button>
                  </li>
                ) : null}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit">Continue to review</Button>
        </div>
      </form>
    </PageContainer>
  );
}
