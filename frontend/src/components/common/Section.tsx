import { cn } from '@/lib/utils';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Section({ children, className, title }: SectionProps) {
  return (
    <section className={cn('space-y-4 py-6', className)}>
      {title ? <h2 className="text-xl font-semibold tracking-tight">{title}</h2> : null}
      {children}
    </section>
  );
}
