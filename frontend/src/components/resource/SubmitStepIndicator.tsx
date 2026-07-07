'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SubmitStep {
  key: string;
  label: string;
}

interface SubmitStepIndicatorProps {
  steps: SubmitStep[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
}

// Visual "Form → Review → Success" progress used at the top of the
// submission wizard. Completed steps are clickable (jump back); the current
// and future steps aren't, matching how the wizard's own step state works.
export function SubmitStepIndicator({ steps, currentIndex, onStepClick }: SubmitStepIndicatorProps) {
  return (
    <nav aria-label="Submission progress" className="mb-6">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = isCompleted && Boolean(onStepClick);

          return (
            <li key={step.key} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                  !isCompleted && !isCurrent && 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    isCompleted && 'border-brand bg-brand text-brand-foreground',
                    isCurrent && 'border-brand text-brand',
                    !isCompleted && !isCurrent && 'border-border text-muted-foreground',
                  )}
                >
                  {isCompleted ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn('hidden sm:inline', isCurrent && 'text-foreground')}>{step.label}</span>
              </button>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn('mx-3 h-px flex-1 transition-colors', isCompleted ? 'bg-brand' : 'bg-border')}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
