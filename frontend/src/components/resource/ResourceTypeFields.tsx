import { Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FilterSelect } from '@/components/common/FilterSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TOOL_TYPE_OPTIONS } from '@/lib/constants/resourceTypes';
import type { DatasetInput, PaperInput, ResourceType, ToolInput } from '@/types/resource';

interface ResourceTypeFieldsProps {
  type: ResourceType;
  dataset: DatasetInput;
  onDatasetChange: (patch: Partial<DatasetInput>) => void;
  paper: PaperInput;
  onPaperChange: (patch: Partial<PaperInput>) => void;
  tool: ToolInput;
  onToolChange: (patch: Partial<ToolInput>) => void;
}

// Only dataset/paper/tool have a dedicated metadata table (doc 10) — every
// other type intentionally has no type-specific fields, so this renders
// nothing extra for tutorial/prompt/project/news rather than inventing
// metadata that doesn't exist in the schema.
export function ResourceTypeFields({
  type,
  dataset,
  onDatasetChange,
  paper,
  onPaperChange,
  tool,
  onToolChange,
}: ResourceTypeFieldsProps) {
  if (type === 'dataset') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dataset-version">Version</Label>
          <Input
            id="dataset-version"
            value={dataset.version ?? ''}
            onChange={(event) => onDatasetChange({ version: event.target.value })}
            placeholder="v1.0"
            maxLength={20}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dataset-file-format">File format</Label>
          <Input
            id="dataset-file-format"
            value={dataset.file_format ?? ''}
            onChange={(event) => onDatasetChange({ file_format: event.target.value })}
            placeholder="CSV, JSON, ZIP…"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dataset-record-count">Record count</Label>
          <Input
            id="dataset-record-count"
            type="number"
            min={0}
            value={dataset.record_count ?? ''}
            onChange={(event) =>
              onDatasetChange({ record_count: event.target.value ? Number(event.target.value) : undefined })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dataset-annotation-type">Annotation type</Label>
          <Input
            id="dataset-annotation-type"
            value={dataset.annotation_type ?? ''}
            onChange={(event) => onDatasetChange({ annotation_type: event.target.value })}
            placeholder="classification, NER, POS…"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dataset-domain">Domain</Label>
          <Input
            id="dataset-domain"
            value={dataset.domain ?? ''}
            onChange={(event) => onDatasetChange({ domain: event.target.value })}
            placeholder="news, social media, medical…"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dataset-collection-year">Collection year</Label>
          <Input
            id="dataset-collection-year"
            type="number"
            min={1900}
            max={2100}
            value={dataset.collection_year ?? ''}
            onChange={(event) =>
              onDatasetChange({
                collection_year: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dataset-data-source">Data source</Label>
          <Input
            id="dataset-data-source"
            value={dataset.data_source ?? ''}
            onChange={(event) => onDatasetChange({ data_source: event.target.value })}
            placeholder="Where the raw data came from"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="dataset-methodology">Methodology</Label>
          <Textarea
            id="dataset-methodology"
            value={dataset.methodology ?? ''}
            onChange={(event) => onDatasetChange({ methodology: event.target.value })}
            rows={3}
            placeholder="How the dataset was collected and annotated"
          />
        </div>
      </div>
    );
  }

  if (type === 'paper') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="paper-abstract">Abstract</Label>
          <Textarea
            id="paper-abstract"
            value={paper.abstract ?? ''}
            onChange={(event) => onPaperChange({ abstract: event.target.value })}
            rows={4}
            maxLength={5000}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="paper-authors">Authors</Label>
          <Input
            id="paper-authors"
            value={paper.authors?.join(', ') ?? ''}
            onChange={(event) =>
              onPaperChange({
                authors: event.target.value
                  .split(',')
                  .map((author) => author.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Author One, Author Two"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-venue">Venue</Label>
          <Input
            id="paper-venue"
            value={paper.venue ?? ''}
            onChange={(event) => onPaperChange({ venue: event.target.value })}
            placeholder="ACL 2026, NeurIPS 2026…"
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-year">Year</Label>
          <Input
            id="paper-year"
            type="number"
            min={1900}
            max={2100}
            value={paper.year ?? ''}
            onChange={(event) => onPaperChange({ year: event.target.value ? Number(event.target.value) : undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-doi">DOI</Label>
          <Input
            id="paper-doi"
            value={paper.doi ?? ''}
            onChange={(event) => onPaperChange({ doi: event.target.value })}
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-arxiv">arXiv ID</Label>
          <Input
            id="paper-arxiv"
            value={paper.arxiv_id ?? ''}
            onChange={(event) => onPaperChange({ arxiv_id: event.target.value })}
            placeholder="2601.00000"
            maxLength={50}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-pdf-url">PDF URL</Label>
          <Input
            id="paper-pdf-url"
            type="url"
            value={paper.pdf_url ?? ''}
            onChange={(event) => onPaperChange({ pdf_url: event.target.value })}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paper-code-url">Code URL</Label>
          <Input
            id="paper-code-url"
            type="url"
            value={paper.code_url ?? ''}
            onChange={(event) => onPaperChange({ code_url: event.target.value })}
            placeholder="https://github.com/…"
          />
        </div>
      </div>
    );
  }

  if (type === 'tool') {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tool-type">Tool type</Label>
          <FilterSelect
            id="tool-type"
            value={tool.tool_type ?? ''}
            onChange={(event) =>
              onToolChange({ tool_type: (event.target.value || undefined) as ToolInput['tool_type'] })
            }
          >
            <option value="">Select a type</option>
            {TOOL_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tool-platform">Platform</Label>
          <Input
            id="tool-platform"
            value={tool.platform ?? ''}
            onChange={(event) => onToolChange({ platform: event.target.value })}
            placeholder="Python, JavaScript, HuggingFace…"
            maxLength={100}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tool-demo-url">Demo URL</Label>
          <Input
            id="tool-demo-url"
            type="url"
            value={tool.demo_url ?? ''}
            onChange={(event) => onToolChange({ demo_url: event.target.value })}
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tool-install-command">Install command</Label>
          <Input
            id="tool-install-command"
            value={tool.install_command ?? ''}
            onChange={(event) => onToolChange({ install_command: event.target.value })}
            placeholder="pip install …"
          />
        </div>
      </div>
    );
  }

  return (
    <Alert>
      <Info />
      <AlertDescription>
        This resource type has no additional metadata fields — the shared fields above are all that&apos;s needed.
      </AlertDescription>
    </Alert>
  );
}
