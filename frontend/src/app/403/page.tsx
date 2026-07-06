import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPage } from '@/components/common/StatusPage';
import { ROUTES } from '@/lib/constants/routes';

export const metadata: Metadata = { title: 'Access denied' };

export default function ForbiddenPage() {
  return (
    <StatusPage
      icon={ShieldAlert}
      code="403"
      title="Access denied"
      description="You don't have permission to access this resource."
    >
      <Button asChild>
        <Link href={ROUTES.home}>Go home</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={ROUTES.support}>Contact support</Link>
      </Button>
    </StatusPage>
  );
}
