import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Email verified',
  description: 'Your Google account has already been verified.',
};

export default function VerifyEmailPage() {
  return (
    <AuthCard title="You're all set" description="Your Google account has already been verified.">
      <div className="flex flex-col items-center gap-4 text-center">
        <BadgeCheck className="size-12 text-brand" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Bangla AI Hub relies on Google&apos;s own email verification, so there&apos;s no separate
          confirmation step to complete.
        </p>
        <Button asChild className="w-full">
          <Link href={ROUTES.home}>Continue</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
