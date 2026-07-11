'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user/UserAvatar';
import { NotificationBell } from '@/components/notification/NotificationBell';
import { SearchBar } from '@/components/search/SearchBar';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { PRIMARY_NAV_LINKS, SECONDARY_NAV_LINKS } from '@/components/layout/mainNavLinks';
import { canAccessAdminPanel } from '@/components/admin/adminNavLinks';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLogout } from '@/lib/hooks/useLogout';
import { useContributorNavStatus } from '@/lib/hooks/useContributorNavStatus';
import { ROUTES } from '@/lib/constants/routes';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const handleLogout = useLogout();
  const pathname = usePathname();
  const router = useRouter();
  const showAdminPanelLink = canAccessAdminPanel(user?.roles ?? []);
  const contributorNavStatus = useContributorNavStatus();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <MobileMenu />
          <Link href={ROUTES.home} className="flex items-center gap-2 font-semibold tracking-tight">
            <BrandLogo size="md" />
            <span className="hidden sm:inline">Bangla AI Hub</span>
          </Link>
          <div className="hidden w-64 md:block">
            <SearchBar
              placeholder="Search…"
              onSubmit={(value) => router.push(`${ROUTES.search}?q=${encodeURIComponent(value)}`)}
              showSuggestions
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
            {PRIMARY_NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                    active ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
                  )}
                </Link>
              );
            })}
            {(() => {
              const activeSecondary = SECONDARY_NAV_LINKS.some((link) => isActive(pathname, link.href));
              return (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-current={activeSecondary ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap outline-none transition-colors',
                        activeSecondary ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      More
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                      {activeSecondary && (
                        <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {SECONDARY_NAV_LINKS.map((link) => (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link href={link.href} aria-current={isActive(pathname, link.href) ? 'page' : undefined}>
                          <link.icon />
                          {link.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })()}
          </nav>
          {isAuthenticated && user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <UserAvatar
                      avatarUrl={user.avatar_url}
                      name={user.display_name ?? user.username}
                      className="size-8"
                    />
                    <span className="hidden text-sm font-medium sm:max-xl:inline 2xl:inline">
                      {user.display_name ?? user.username}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.display_name ?? user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.dashboard}>
                      <LayoutDashboard />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.profile}>
                      <UserIcon />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {contributorNavStatus ? (
                    <DropdownMenuItem asChild>
                      <Link href={contributorNavStatus.href}>
                        <Sparkles />
                        {contributorNavStatus.label}
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {showAdminPanelLink ? (
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.admin}>
                        <ShieldCheck />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
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
