'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, FileUp, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Badge } from '@/components/ui/badge';
import { ResourceTypeFields } from '@/components/resource/ResourceTypeFields';
import { ThumbnailUrlInput } from '@/components/resource/ThumbnailUrlInput';
import { FileDropzone } from '@/components/resource/FileDropzone';
import { DownloadButton } from '@/components/resource/DownloadButton';
import { useCategories } from '@/lib/hooks/useCategories';
import {
  useAddResourceAttachment,
  useDeleteResourceAttachment,
  useReorderResourceAttachments,
  useResource,
  useUpdateResource,
  useUploadResourceFile,
} from '@/lib/hooks/useResources';
import { getFileIcon, getFileBadgeLabel } from '@/lib/utils/fileIcons';
import { formatBytes, formatDate } from '@/lib/utils/format';
import { ROUTES, resourceHref } from '@/lib/constants/routes';
import { MODEL_FILE_ACCEPT, MODEL_FILE_HINT } from '@/lib/constants/resourceTypes';
import type {
  DatasetInput,
  ModelInput,
  PaperInput,
  PromptInput,
  ResourceVisibility,
  ToolInput,
  UpdateResourceInput,
} from '@/types/resource';

const DATASET_FILE_ACCEPT = '.csv,.json,.txt,.zip,.tar,.gz,.parquet,.py,.ipynb';

const VISIBILITY_OPTIONS: { value: ResourceVisibility; label: string; description: string }[] = [
  { value: 'public', label: 'Public', description: 'Anyone can find and view it.' },
  { value: 'unlisted', label: 'Unlisted', description: 'Only people with the direct link.' },
  { value: 'private', label: 'Private', description: 'Only you and moderators.' },
];

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface EditResourceViewProps {
  slug: string;
}

export function EditResourceView({ slug }: EditResourceViewProps) {
  const router = useRouter();
  const { data: resource, isLoading, isError, refetch } = useResource(slug);
  const { data: categories } = useCategories();
  const updateMutation = useUpdateResource(slug);
  const addAttachmentMutation = useAddResourceAttachment();
  const deleteAttachmentMutation = useDeleteResourceAttachment(slug);
  const reorderMutation = useReorderResourceAttachments(slug);
  const thumbnailUploadMutation = useUploadResourceFile();
  const datasetUploadMutation = useUploadResourceFile();
  const modelUploadMutation = useUploadResourceFile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UpdateResourceInput | null>(null);
  const [tagsText, setTagsText] = useState('');
  const [dataset, setDataset] = useState<DatasetInput>({});
  const [paper, setPaper] = useState<PaperInput>({});
  const [tool, setTool] = useState<ToolInput>({});
  const [model, setModel] = useState<ModelInput>({});
  const [prompt, setPrompt] = useState<PromptInput>({});
  const [initialized, setInitialized] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailUploadError, setThumbnailUploadError] = useState<string | null>(null);
  // `resource.thumbnail_url` is a resolved URL — for an R2-backed thumbnail
  // that's a short-lived *signed* URL, not the permanent value. Tracking what
  // it was on load lets handleSubmit tell "user actually typed a new URL"
  // apart from "field just reflects what we loaded" — sending that unchanged
  // signed URL back as thumbnail_url would make the backend store it
  // verbatim as if it were a real external link, breaking once it expires.
  const [initialThumbnailUrl, setInitialThumbnailUrl] = useState('');
  // Same hazard as thumbnail_url above, for paper.pdf_url: `resource.paper.pdf_url`
  // is a resolved (possibly signed) URL, and resending it unchanged on every
  // save would make the backend store the signed URL verbatim as the
  // permanent value, breaking once it expires.
  const [initialPaperPdfUrl, setInitialPaperPdfUrl] = useState('');
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [datasetUploadError, setDatasetUploadError] = useState<string | null>(null);
  // Same hazard as thumbnail_url/paper.pdf_url above, for model.file_url —
  // resource.model.file_url is a resolved (possibly signed) URL; resending it
  // unchanged would make the backend store the signed URL verbatim as the
  // permanent value, breaking once it expires. Model has no UI field that
  // edits file_url directly (it's system-set by upload only), but the create/
  // update service still only writes it when a new upload happens, so no
  // dirty-check comparison is actually needed on the payload side — kept here
  // only so a future direct-URL-entry field for model files has the same
  // guard already in place.
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelUploadError, setModelUploadError] = useState<string | null>(null);

  if (resource && !initialized) {
    setForm({
      title: resource.title,
      description: resource.description ?? '',
      category_id: resource.category?.id,
      language: resource.language,
      license: resource.license ?? '',
      external_url: resource.external_url ?? '',
      thumbnail_url: resource.thumbnail_url ?? '',
      visibility: resource.visibility,
    });
    setInitialThumbnailUrl(resource.thumbnail_url ?? '');
    setTagsText(resource.tags.join(', '));
    if (resource.dataset) {
      setDataset({
        version: resource.dataset.version,
        file_format: resource.dataset.file_format ?? undefined,
        record_count: resource.dataset.record_count ?? undefined,
        annotation_type: resource.dataset.annotation_type ?? undefined,
        domain: resource.dataset.domain ?? undefined,
        collection_year: resource.dataset.collection_year ?? undefined,
        data_source: resource.dataset.data_source ?? undefined,
        methodology: resource.dataset.methodology ?? undefined,
      });
    }
    if (resource.paper) {
      setPaper({
        abstract: resource.paper.abstract ?? undefined,
        authors: resource.paper.authors,
        venue: resource.paper.venue ?? undefined,
        year: resource.paper.year ?? undefined,
        doi: resource.paper.doi ?? undefined,
        arxiv_id: resource.paper.arxiv_id ?? undefined,
        pdf_url: resource.paper.pdf_url ?? undefined,
        code_url: resource.paper.code_url ?? undefined,
      });
      setInitialPaperPdfUrl(resource.paper.pdf_url ?? '');
    }
    if (resource.tool) {
      setTool({
        tool_type: resource.tool.tool_type ?? undefined,
        platform: resource.tool.platform ?? undefined,
        demo_url: resource.tool.demo_url ?? undefined,
        install_command: resource.tool.install_command ?? undefined,
      });
    }
    if (resource.model) {
      setModel({
        architecture: resource.model.architecture ?? undefined,
        base_model: resource.model.base_model ?? undefined,
        format: resource.model.format ?? undefined,
        quantization: resource.model.quantization ?? undefined,
        context_length: resource.model.context_length ?? undefined,
        parameters: resource.model.parameters ?? undefined,
        precision: resource.model.precision ?? undefined,
        gpu_requirement: resource.model.gpu_requirement ?? undefined,
        ram_requirement: resource.model.ram_requirement ?? undefined,
        inference_example: resource.model.inference_example ?? undefined,
        version: resource.model.version,
        changelog: resource.model.changelog ?? undefined,
        demo_url: resource.model.demo_url ?? undefined,
        repository_url: resource.model.repository_url ?? undefined,
        paper_url: resource.model.paper_url ?? undefined,
      });
    }
    if (resource.prompt) {
      setPrompt({
        role: resource.prompt.role,
        content: resource.prompt.content,
        target_platforms: resource.prompt.target_platforms,
        variables: resource.prompt.variables ?? undefined,
        difficulty: resource.prompt.difficulty ?? undefined,
        example_output: resource.prompt.example_output ?? undefined,
        version: resource.prompt.version,
      });
    }
    setInitialized(true);
  }

  if (isLoading || !form) {
    return <LoadingScreen label="Loading resource…" />;
  }

  if (isError || !resource) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Couldn't load this resource" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  const tags = tagsText
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !resource) return;

    const payload: UpdateResourceInput = {
      ...form,
      description: form.description?.trim() || undefined,
      license: form.license?.trim() || undefined,
      external_url: form.external_url?.trim() || undefined,
      // Only send thumbnail_url if the user actually changed it (typed a new
      // one, or cleared it) — see initialThumbnailUrl's comment above for why
      // resending an untouched, possibly-signed URL would be wrong.
      thumbnail_url:
        form.thumbnail_url !== initialThumbnailUrl ? form.thumbnail_url?.trim() || undefined : undefined,
      tags,
      dataset: resource.type === 'dataset' ? dataset : undefined,
      // Only send pdf_url if the user actually changed it — see
      // initialPaperPdfUrl's comment above for why resending an untouched,
      // possibly-signed URL would silently corrupt the permanent link.
      paper:
        resource.type === 'paper'
          ? { ...paper, pdf_url: paper.pdf_url !== initialPaperPdfUrl ? paper.pdf_url?.trim() || undefined : undefined }
          : undefined,
      tool: resource.type === 'tool' ? tool : undefined,
      model: resource.type === 'model' ? model : undefined,
      prompt: resource.type === 'prompt' ? prompt : undefined,
    };

    updateMutation.mutate(payload, {
      onSuccess: (updated) => {
        toast.success(
          resource.status === 'approved' && updated.status === 'pending'
            ? 'Saved — this resource is back under review.'
            : 'Changes saved.',
        );
        router.push(resourceHref(resource.type, resource.slug));
      },
      onError: (error) => toast.error(errorMessage(error, 'Could not save your changes.')),
    });
  }

  // Unlike Submit (where the resource doesn't exist yet, so the file is held
  // and uploaded only after creation succeeds), the resource here already has
  // a slug — so a newly selected thumbnail uploads immediately, same
  // kind=thumbnail endpoint Submit uses after creation.
  function handleThumbnailFileChange(file: File | null) {
    setThumbnailFile(file);
    setThumbnailUploadError(null);
    if (!file) return;

    thumbnailUploadMutation.mutate(
      { slug, file, kind: 'thumbnail' },
      {
        onSuccess: async () => {
          toast.success('Thumbnail updated.');
          const fresh = await refetch();
          const newUrl = fresh.data?.thumbnail_url ?? '';
          // Both updated together so the field again looks "unchanged" —
          // this new value is itself a signed URL if R2-backed, and must
          // stay excluded from the next Save unless the user edits it again.
          setForm((prev) => (prev ? { ...prev, thumbnail_url: newUrl } : prev));
          setInitialThumbnailUrl(newUrl);
          // thumbnailFile is deliberately left set (not reset to null) — the
          // dropzone stays showing the uploaded file with its checkmark
          // instead of collapsing back to an empty "drag & drop" box, which
          // looked like the upload had silently failed/vanished.
        },
        onError: (error) => setThumbnailUploadError(errorMessage(error, 'The thumbnail upload failed.')),
      },
    );
  }

  // Replaces the dataset's primary file (the legacy single-slot field shown
  // as the main Download button) — same immediate-upload pattern as the
  // thumbnail above, distinct from the universal Attachments list below.
  function handleDatasetFileChange(file: File | null) {
    setDatasetFile(file);
    setDatasetUploadError(null);
    if (!file) return;

    datasetUploadMutation.mutate(
      { slug, file, kind: 'dataset' },
      {
        onSuccess: async () => {
          toast.success('Dataset file updated.');
          await refetch();
        },
        onError: (error) => setDatasetUploadError(errorMessage(error, 'The file upload failed.')),
      },
    );
  }

  // Replaces the model's primary weight file — same immediate-upload pattern
  // as handleDatasetFileChange above, distinct from the universal Attachments
  // list below.
  function handleModelFileChange(file: File | null) {
    setModelFile(file);
    setModelUploadError(null);
    if (!file) return;

    modelUploadMutation.mutate(
      { slug, file, kind: 'model' },
      {
        onSuccess: async () => {
          toast.success('Model file updated.');
          await refetch();
        },
        onError: (error) => setModelUploadError(errorMessage(error, 'The file upload failed.')),
      },
    );
  }

  function handleAttachmentUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    addAttachmentMutation.mutate(
      { slug, file },
      {
        onSuccess: () => toast.success('File attached.'),
        onError: (error) => toast.error(errorMessage(error, 'Could not upload this file.')),
      },
    );
  }

  function moveAttachment(index: number, direction: -1 | 1) {
    if (!resource) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= resource.attachments.length) return;
    const ids = resource.attachments.map((file) => file.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    reorderMutation.mutate(ids, {
      onError: (error) => toast.error(errorMessage(error, 'Could not reorder attachments.')),
    });
  }

  return (
    <PageContainer className="max-w-3xl">
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Edit resource</h1>
      <p className="mt-1 text-muted-foreground">
        {resource.status === 'approved'
          ? 'Saving changes will send this resource back for review before it goes live again.'
          : 'Update your submission below.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title ?? ''}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                minLength={5}
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description ?? ''}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={5}
                minLength={50}
                maxLength={5000}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div className="space-y-1.5">
                <Label htmlFor="license">License</Label>
                <Input
                  id="license"
                  value={form.license ?? ''}
                  onChange={(event) => setForm({ ...form, license: event.target.value })}
                  placeholder="CC-BY-4.0, MIT…"
                />
              </div>
            </div>
            <ThumbnailUrlInput
              id="thumbnail-url"
              value={form.thumbnail_url ?? ''}
              onChange={(value) => {
                setForm({ ...form, thumbnail_url: value });
                setThumbnailUploadError(null);
              }}
              file={thumbnailFile}
              onFileChange={handleThumbnailFileChange}
              uploading={thumbnailUploadMutation.isPending}
              uploaded={thumbnailUploadMutation.isSuccess}
              uploadError={thumbnailUploadError}
            />
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="sentiment, classification, social-media"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="external-url">External URL</Label>
              <Input
                id="external-url"
                type="url"
                value={form.external_url ?? ''}
                onChange={(event) => setForm({ ...form, external_url: event.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <div className="flex flex-wrap gap-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm({ ...form, visibility: option.value })}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      form.visibility === option.value
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Type-specific details</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceTypeFields
              type={resource.type}
              dataset={dataset}
              onDatasetChange={(patch) => setDataset((prev) => ({ ...prev, ...patch }))}
              paper={paper}
              onPaperChange={(patch) => setPaper((prev) => ({ ...prev, ...patch }))}
              tool={tool}
              onToolChange={(patch) => setTool((prev) => ({ ...prev, ...patch }))}
              model={model}
              onModelChange={(patch) => setModel((prev) => ({ ...prev, ...patch }))}
              prompt={prompt}
              onPromptChange={(patch) => setPrompt((prev) => ({ ...prev, ...patch }))}
            />
          </CardContent>
        </Card>

        {resource.type === 'dataset' ? (
          <Card>
            <CardHeader>
              <CardTitle>Dataset file</CardTitle>
              <CardDescription>The primary downloadable file for this dataset.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {resource.dataset?.file_url && !datasetFile ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">Current file</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatBytes(resource.dataset.file_size_bytes) ?? 'Unknown size'}
                      {resource.dataset.checksum_sha256
                        ? ` · ${resource.dataset.checksum_sha256.slice(0, 12)}…`
                        : ''}
                    </p>
                  </div>
                  <DownloadButton slug={slug} size="sm" variant="outline" />
                </div>
              ) : null}
              <FileDropzone
                label="Drag & drop a replacement file, or click to browse"
                hint="CSV, JSON, TXT, ZIP, TAR, GZIP, Parquet, Python, or Notebook — up to 500MB"
                accept={DATASET_FILE_ACCEPT}
                file={datasetFile}
                onFileSelect={handleDatasetFileChange}
                uploading={datasetUploadMutation.isPending}
                uploaded={datasetUploadMutation.isSuccess}
                error={datasetUploadError}
              />
            </CardContent>
          </Card>
        ) : null}

        {resource.type === 'model' ? (
          <Card>
            <CardHeader>
              <CardTitle>Model file</CardTitle>
              <CardDescription>The primary weight file for this model.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {resource.model?.file_url && !modelFile ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">Current file</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatBytes(resource.model.file_size_bytes) ?? 'Unknown size'}
                      {resource.model.checksum_sha256 ? ` · ${resource.model.checksum_sha256.slice(0, 12)}…` : ''}
                    </p>
                  </div>
                  <DownloadButton slug={slug} size="sm" variant="outline" />
                </div>
              ) : null}
              <FileDropzone
                label="Drag & drop a replacement file, or click to browse"
                hint={MODEL_FILE_HINT}
                accept={MODEL_FILE_ACCEPT}
                file={modelFile}
                onFileSelect={handleModelFileChange}
                uploading={modelUploadMutation.isPending}
                uploaded={modelUploadMutation.isSuccess}
                error={modelUploadError}
              />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>
              Attachments
              <Badge variant="secondary" className="ml-2">
                {resource.attachments.length}
              </Badge>
            </CardTitle>
            <CardDescription>Add, replace, delete, or reorder downloadable files.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {resource.attachments.map((file, index) => {
              const Icon = getFileIcon(file.extension);
              return (
                <div
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.display_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getFileBadgeLabel(file.extension)}
                        {formatBytes(file.size_bytes) ? ` · ${formatBytes(file.size_bytes)}` : ''}
                        {` · ${formatDate(file.uploaded_at)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => moveAttachment(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === resource.attachments.length - 1 || reorderMutation.isPending}
                      onClick={() => moveAttachment(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      loading={deleteAttachmentMutation.isPending}
                      onClick={() =>
                        deleteAttachmentMutation.mutate(file.id, {
                          onSuccess: () => toast.success('Attachment deleted.'),
                          onError: (error) =>
                            toast.error(errorMessage(error, 'Could not delete this attachment.')),
                        })
                      }
                      aria-label="Delete attachment"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}

            <div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleAttachmentUpload} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={addAttachmentMutation.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="size-4" aria-hidden="true" />
                Add attachment
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push(ROUTES.mySubmissions)}>
            Cancel
          </Button>
          <Button type="submit" loading={updateMutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
