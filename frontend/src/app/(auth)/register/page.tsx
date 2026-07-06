import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { ROUTES } from '@/lib/constants/routes';

const BENEFITS = [
  'Discover Bangla-language datasets, papers, and tools',
  'Bookmark and track resources across the community',
  'Submit and share your own work with attribution',
  'Build reputation as a contributor',
];

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Join Bangla AI Hub instantly with your Google account.',
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Join Bangla AI Hub"
      description="Create your account instantly with Google — no separate password required."
    >
      <ul className="flex flex-col gap-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <GoogleSignInButton />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={ROUTES.login} className="font-medium text-brand underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
