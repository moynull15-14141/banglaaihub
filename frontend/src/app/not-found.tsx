import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPage } from '@/components/common/StatusPage';
import { ROUTES } from '@/lib/constants/routes';

export default function NotFound() {
  return (
    <StatusPage
      icon={FileQuestion}
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or may have been moved."
    >
      <Button asChild>
        <Link href={ROUTES.home}>Go home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={ROUTES.resources}>Explore resources</Link>
      </Button>
    </StatusPage>
  );
}
