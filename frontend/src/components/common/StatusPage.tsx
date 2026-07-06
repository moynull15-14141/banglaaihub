import type { LucideIcon } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';

interface StatusPageProps {
  icon: LucideIcon;
  code: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

// Shared shell for full-page status states (404, 401, 403, 500) so they
// present the same layout instead of each re-implementing it.
export function StatusPage({ icon: Icon, code, title, description, children }: StatusPageProps) {
  return (
    <PageContainer className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="size-8" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold tracking-widest text-muted-foreground">{code}</p>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {children ? <div className="flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </PageContainer>
  );
}
