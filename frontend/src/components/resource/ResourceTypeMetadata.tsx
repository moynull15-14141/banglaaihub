import { Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils/format';
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
  if (resource.type === 'dataset' && resource.dataset) {
    const { dataset } = resource;
    return (
      <div className="space-y-4">
        <Card className="px-4">
          <dl>
            <MetaRow label="Version" value={dataset.version} />
            <MetaRow label="Format" value={dataset.file_format} />
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
          <Button disabled title="Sign in required — download flow lands in a later phase">
            <Download className="size-4" aria-hidden="true" />
            Download dataset
          </Button>
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
            <Button asChild variant="outline" size="sm">
              <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden="true" />
                View PDF
              </a>
            </Button>
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
          </dl>
        </Card>
        {tool.demo_url ? (
          <Button asChild variant="outline" size="sm">
            <a href={tool.demo_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden="true" />
              Try demo
            </a>
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}
