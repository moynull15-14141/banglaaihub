'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { MAIN_NAV_LINKS } from '@/components/layout/mainNavLinks';
import { cn } from '@/lib/utils';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="xl:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetHeader className="flex-row items-center gap-2 border-b">
          <BrandLogo size="sm" />
          <SheetTitle>Bangla AI Hub</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3" aria-label="Main navigation">
          {MAIN_NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-brand/10 text-brand' : 'text-foreground/80 hover:bg-muted',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
