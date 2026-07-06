import { cn } from '@/lib/utils';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Section({ children, className, title }: SectionProps) {
  return (
    <section className={cn('space-y-3 border-t border-border/60 py-6 first:border-t-0 first:pt-0', className)}>
      {title ? (
        <h2 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}
