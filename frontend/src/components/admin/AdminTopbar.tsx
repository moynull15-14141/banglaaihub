'use client';

import Link from 'next/link';
import { ArrowLeft, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user/UserAvatar';
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLogout } from '@/lib/hooks/useLogout';
import { ROUTES } from '@/lib/constants/routes';

export function AdminTopbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const handleLogout = useLogout();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open admin menu">
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <SheetHeader className="flex-row items-center gap-2 border-b">
            <BrandLogo size="sm" />
            <SheetTitle>Admin</SheetTitle>
          </SheetHeader>
          <AdminSidebarNav onNavigate={() => setMobileOpen(false)} />
          <SheetFooter className="border-t p-3">
            <Link
              href={ROUTES.home}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
              Back to site
            </Link>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <p className="flex-1 text-sm font-medium text-muted-foreground">Admin Panel</p>

      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href={ROUTES.home}>Back to site</Link>
      </Button>

      {user ? (
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
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user.display_name ?? user.username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={ROUTES.profile}>
                <UserIcon />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={ROUTES.home}>Back to site</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </header>
  );
}
