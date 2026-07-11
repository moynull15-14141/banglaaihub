import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

interface AuthCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

// Shared branding shell for every (auth) page — login, register,
// forgot-password, verify-email — so they all present the same logo,
// centered card, and spacing instead of each re-implementing it.
export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--brand), transparent 90%), transparent)',
        }}
        aria-hidden="true"
      />
      <Card className={cn('w-full max-w-sm', className)}>
        <CardHeader className="items-center gap-2 text-center">
          <Link href={ROUTES.home} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BrandLogo size="md" />
            Bangla AI Hub
          </Link>
          <CardTitle className="font-heading text-2xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  );
}
