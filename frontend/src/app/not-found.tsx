import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/common/PageContainer';
import { ROUTES } from '@/lib/constants/routes';

export default function NotFound() {
  return (
    <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground">This page could not be found.</p>
      <Button asChild>
        <Link href={ROUTES.home}>Back to home</Link>
      </Button>
    </PageContainer>
  );
}
