import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/AuthCard';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { ROUTES } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Log in',
  description: 'Log in to Bangla AI Hub with your Google account.',
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to discover and share Bangla AI datasets, papers, and tools."
    >
      <GoogleSignInButton />
      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link href={ROUTES.register} className="font-medium text-brand underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
