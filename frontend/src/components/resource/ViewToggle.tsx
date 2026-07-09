import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ResourceGridView } from '@/components/resource/ResourceGrid';

interface ViewToggleProps {
  value: ResourceGridView;
  onChange: (value: ResourceGridView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-input p-0.5" role="group" aria-label="Layout">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Grid view"
        aria-pressed={value === 'grid'}
        className={cn(value === 'grid' && 'bg-muted')}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="List view"
        aria-pressed={value === 'list'}
        className={cn(value === 'list' && 'bg-muted')}
        onClick={() => onChange('list')}
      >
        <List className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
