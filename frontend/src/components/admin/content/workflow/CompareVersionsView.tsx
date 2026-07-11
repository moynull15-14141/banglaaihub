'use client';

import type { RevisionDiffOp } from '@/lib/api/articleWorkflow';

// GitHub-style added/removed/modified highlighting over the hand-rolled
// word-level LCS diff computed server-side (see
// backend/src/services/articleRevision.service.ts's wordDiff()) — no diff
// library exists in either package, confirmed before that was written.
function DiffText({ ops }: { ops: RevisionDiffOp[] }) {
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {ops.map((op, index) => {
        if (op.type === 'equal') return <span key={index}>{op.value}</span>;
        if (op.type === 'added') {
          return (
            <span key={index} className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              {op.value}
            </span>
          );
        }
        return (
          <span key={index} className="bg-destructive/20 text-destructive line-through">
            {op.value}
          </span>
        );
      })}
    </p>
  );
}

interface CompareVersionsViewProps {
  title: RevisionDiffOp[];
  body: RevisionDiffOp[];
}

export function CompareVersionsView({ title, body }: CompareVersionsViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Title</p>
        <DiffText ops={title} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Body</p>
        <DiffText ops={body} />
      </div>
    </div>
  );
}
