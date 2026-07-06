import Link from 'next/link';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';

interface AdminListCardProps {
  title: string;
  viewAllHref?: string;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  isEmpty: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}

// Shared shell for the dashboard's list widgets (recent resources/users,
// pending approvals, activity feed) so loading/error/empty states aren't
// re-implemented four times.
export function AdminListCard({
  title,
  viewAllHref,
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyLabel,
  children,
}: AdminListCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {viewAllHref ? (
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href={viewAllHref}>View all</Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState title="Couldn't load data" onRetry={onRetry} />
        ) : isEmpty ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
