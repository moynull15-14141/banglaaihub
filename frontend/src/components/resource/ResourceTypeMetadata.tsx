'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DownloadButton } from '@/components/resource/DownloadButton';
import { PdfPreviewDialog } from '@/components/resource/PdfPreviewDialog';
import { getResourceDownload } from '@/lib/api/resources';
import { useAuth } from '@/lib/hooks/useAuth';
import { PROMPT_ROLE_OPTIONS } from '@/lib/constants/resourceTypes';
import { formatBytes, formatNumber } from '@/lib/utils/format';
import type { Resource } from '@/types/resource';

interface MetaRowProps {
  label: string;
  value: React.ReactNode;
}

function MetaRow({ label, value }: MetaRowProps) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

interface ResourceTypeMetadataProps {
  resource: Resource;
}

export function ResourceTypeMetadata({ resource }: ResourceTypeMetadataProps) {
  const { user } = useAuth();
  const isOwner = Boolean(user && resource.author?.id === user.id);
  const priceProps = {
    priceCents: resource.price_cents,
    currency: resource.currency,
    isPurchased: resource.is_purchased,
    isOwner,
  };
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [contentCopied, setContentCopied] = useState(false);

  async function handleCopyPromptContent(content: string) {
    await navigator.clipboard.writeText(content);
    setContentCopied(true);
    toast.success('Prompt copied to clipboard.');
    setTimeout(() => setContentCopied(false), 2000);
  }

  async function handlePreviewPdf() {
    setPreviewOpen(true);
    setPreviewUrl(null);
    const { url } = await getResourceDownload(resource.slug);
    setPreviewUrl(url);
  }

  if (resource.type === 'dataset' && resource.dataset) {
    const { dataset } = resource;
    return (
      <div className="space-y-4">
        <Card className="px-4">
          <dl>
            <MetaRow label="Version" value={dataset.version} />
            <MetaRow label="Format" value={dataset.file_format} />
            <MetaRow label="File size" value={formatBytes(dataset.file_size_bytes)} />
            <MetaRow
              label="Records"
              value={dataset.record_count !== null ? formatNumber(dataset.record_count) : null}
            />
            <MetaRow label="Annotation type" value={dataset.annotation_type} />
            <MetaRow label="Domain" value={dataset.domain} />
            <MetaRow label="Collection year" value={dataset.collection_year} />
            <MetaRow label="Data source" value={dataset.data_source} />
            <MetaRow label="Methodology" value={dataset.methodology} />
          </dl>
        </Card>
        {dataset.file_url ? (
          <DownloadButton slug={resource.slug} label="Download dataset" {...priceProps} />
        ) : null}
      </div>
    );
  }

  if (resource.type === 'paper' && resource.paper) {
    const { paper } = resource;
    return (
      <div className="space-y-4">
        {paper.abstract ? (
          <div>
            <h3 className="mb-1 text-sm font-medium">Abstract</h3>
            <p className="text-sm text-muted-foreground">{paper.abstract}</p>
          </div>
        ) : null}
        <Card className="px-4">
          <dl>
            <MetaRow label="Authors" value={paper.authors.join(', ') || null} />
            <MetaRow label="Venue" value={paper.venue} />
            <MetaRow label="Year" value={paper.year} />
            <MetaRow label="DOI" value={paper.doi} />
            <MetaRow label="arXiv ID" value={paper.arxiv_id} />
            <MetaRow label="Citations" value={formatNumber(paper.citation_count)} />
          </dl>
        </Card>
        <div className="flex flex-wrap gap-2">
          {paper.pdf_url ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => void handlePreviewPdf()}>
                Preview
              </Button>
              <DownloadButton slug={resource.slug} label="Download PDF" size="sm" {...priceProps} />
            </>
          ) : null}
          {paper.code_url ? (
            <Button asChild variant="outline" size="sm">
              <a href={paper.code_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                View code
              </a>
            </Button>
          ) : null}
        </div>
        <PdfPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          title={resource.title}
          url={previewUrl}
        />
      </div>
    );
  }

  if (resource.type === 'tool' && resource.tool) {
    const { tool } = resource;
    return (
      <div className="space-y-4">
        <Card className="px-4">
          <dl>
            <MetaRow label="Tool type" value={tool.tool_type} />
            <MetaRow label="Platform" value={tool.platform} />
            <MetaRow label="Install command" value={tool.install_command} />
            {tool.file_url ? <MetaRow label="Asset size" value={formatBytes(tool.file_size_bytes)} /> : null}
          </dl>
        </Card>
        <div className="flex flex-wrap gap-2">
          {tool.file_url ? (
            <DownloadButton slug={resource.slug} label="Download asset" size="sm" {...priceProps} />
          ) : null}
          {tool.demo_url ? (
            <Button asChild variant="outline" size="sm">
              <a href={tool.demo_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                Try demo
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (resource.type === 'model' && resource.model) {
    const { model } = resource;
    return (
      <div className="space-y-4">
        <Card className="px-4">
          <dl>
            <MetaRow label="Architecture" value={model.architecture} />
            <MetaRow label="Base model" value={model.base_model} />
            <MetaRow label="Format" value={model.format} />
            <MetaRow label="Quantization" value={model.quantization} />
            <MetaRow label="Context length" value={model.context_length ? formatNumber(model.context_length) : null} />
            <MetaRow label="Parameters" value={model.parameters} />
            <MetaRow label="Precision" value={model.precision} />
            <MetaRow label="GPU requirement" value={model.gpu_requirement} />
            <MetaRow label="RAM requirement" value={model.ram_requirement} />
            <MetaRow label="Version" value={model.version} />
            <MetaRow label="File size" value={formatBytes(model.file_size_bytes)} />
          </dl>
        </Card>
        {model.benchmark_score && Object.keys(model.benchmark_score).length > 0 ? (
          <div>
            <h3 className="mb-1 text-sm font-medium">Benchmark</h3>
            <Card className="px-4">
              <dl>
                {Object.entries(model.benchmark_score).map(([key, value]) => (
                  <MetaRow key={key} label={key} value={String(value)} />
                ))}
              </dl>
            </Card>
          </div>
        ) : null}
        {model.inference_example ? (
          <div>
            <h3 className="mb-1 text-sm font-medium">Inference example</h3>
            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted p-3 text-xs whitespace-pre-wrap">
              {model.inference_example}
            </pre>
          </div>
        ) : null}
        {model.changelog ? (
          <div>
            <h3 className="mb-1 text-sm font-medium">Changelog</h3>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{model.changelog}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {model.file_url ? (
          <DownloadButton slug={resource.slug} label="Download model" size="sm" {...priceProps} />
        ) : null}
          {model.demo_url ? (
            <Button asChild variant="outline" size="sm">
              <a href={model.demo_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                Try demo
              </a>
            </Button>
          ) : null}
          {model.repository_url ? (
            <Button asChild variant="outline" size="sm">
              <a href={model.repository_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                Repository
              </a>
            </Button>
          ) : null}
          {model.paper_url ? (
            <Button asChild variant="outline" size="sm">
              <a href={model.paper_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                Paper
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (resource.type === 'prompt' && resource.prompt) {
    const { prompt } = resource;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{PROMPT_ROLE_OPTIONS.find((o) => o.value === prompt.role)?.label ?? prompt.role}</Badge>
          {prompt.difficulty ? <Badge variant="outline">{prompt.difficulty}</Badge> : null}
          {prompt.target_platforms.map((platform) => (
            <Badge key={platform} variant="outline">
              {platform}
            </Badge>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-sm font-medium">Prompt content</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCopyPromptContent(prompt.content)}
            >
              {contentCopied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {contentCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted p-3 text-sm whitespace-pre-wrap">
            {prompt.content}
          </pre>
        </div>
        {prompt.variables && prompt.variables.length > 0 ? (
          <div>
            <h3 className="mb-1 text-sm font-medium">Variables</h3>
            <div className="flex flex-wrap gap-1.5">
              {prompt.variables.map((variable) => (
                <Badge key={variable.name} variant="secondary">
                  {variable.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
        {prompt.example_output ? (
          <div>
            <h3 className="mb-1 text-sm font-medium">Example output</h3>
            <p className="text-sm whitespace-pre-line text-muted-foreground">{prompt.example_output}</p>
          </div>
        ) : null}
        <Card className="px-4">
          <dl>
            <MetaRow label="Version" value={prompt.version} />
          </dl>
        </Card>
      </div>
    );
  }

  return null;
}
