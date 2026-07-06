import type { Metadata } from 'next';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusPage } from '@/components/common/StatusPage';
import { ROUTES } from '@/lib/constants/routes';

export const metadata: Metadata = { title: 'Sign in required' };

export default function UnauthorizedPage() {
  return (
    <StatusPage
      icon={LogIn}
      code="401"
      title="Sign in required"
      description="You must sign in to continue."
    >
      <Button asChild>
        <Link href={ROUTES.login}>Login</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href={ROUTES.home}>Home</Link>
      </Button>
    </StatusPage>
  );
}
