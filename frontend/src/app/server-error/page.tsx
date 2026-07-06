'use client';

import Link from 'next/link';
import { ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPage } from '@/components/common/StatusPage';
import { ROUTES } from '@/lib/constants/routes';

export default function ServerErrorPage() {
  return (
    <StatusPage
      icon={ServerCrash}
      code="500"
      title="Something went wrong on our end"
      description="An unexpected server error occurred. Please try again in a moment."
    >
      <Button onClick={() => window.location.reload()}>Retry</Button>
      <Button asChild variant="outline">
        <Link href={ROUTES.home}>Go home</Link>
      </Button>
    </StatusPage>
  );
}
