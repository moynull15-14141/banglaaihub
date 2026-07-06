'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user/UserAvatar';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { useAuth } from '@/lib/hooks/useAuth';
import { ROUTES } from '@/lib/constants/routes';

const NAV_LINKS = [
  { href: ROUTES.datasets, label: 'Datasets' },
  { href: ROUTES.papers, label: 'Papers' },
  { href: ROUTES.tools, label: 'Tools' },
  { href: ROUTES.search, label: 'Search' },
  { href: ROUTES.about, label: 'About' },
];

export function Navbar() {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <MobileMenu />
          <Link href={ROUTES.home} className="font-semibold tracking-tight">
            Bangla AI Hub
          </Link>
          <nav className="hidden items-center gap-4 sm:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <Link href={ROUTES.dashboard} className="flex items-center gap-2">
              <UserAvatar name={user.display_name ?? user.username} className="size-8" />
            </Link>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.login}>Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.register}>Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
