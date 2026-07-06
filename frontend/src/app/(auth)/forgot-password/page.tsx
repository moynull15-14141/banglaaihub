import type { Metadata } from 'next';
import { KeyRound } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';

const GOOGLE_SECURITY_URL = 'https://myaccount.google.com/security';

export const metadata: Metadata = {
  title: 'Forgot password',
  description: 'Password reset is managed through your Google Account.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="No password to reset"
      description="This platform uses Google Sign-In. Password reset is managed through your Google Account."
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <KeyRound className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          Password changes, two-factor authentication, and account recovery are all handled
          directly by Google.
        </p>
        <Button asChild className="w-full">
          <a href={GOOGLE_SECURITY_URL} target="_blank" rel="noopener noreferrer">
            Open Google Account
          </a>
        </Button>
      </div>
    </AuthCard>
  );
}
