import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const selectClassName =
  'w-full appearance-none rounded-lg border border-input bg-background px-3 py-1.5 pr-8 text-sm shadow-xs transition-colors outline-none hover:border-ring/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export function FilterSelect({ id, className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select id={id} className={cn(selectClassName, className)} {...props} />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
