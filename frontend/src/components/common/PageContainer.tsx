import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8', className)}>
      {children}
    </div>
  );
}
