import Link from 'next/link';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { ROUTES } from '@/lib/constants/routes';

const EXPLORE_LINKS = [
  { href: ROUTES.datasets, label: 'Datasets' },
  { href: ROUTES.papers, label: 'Papers' },
  { href: ROUTES.tools, label: 'Tools' },
  { href: ROUTES.search, label: 'Search' },
];

const COMPANY_LINKS = [
  { href: ROUTES.about, label: 'About' },
  { href: ROUTES.support, label: 'Support' },
];

const LEGAL_LINKS = [
  { href: ROUTES.terms, label: 'Terms' },
  { href: ROUTES.privacy, label: 'Privacy' },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-3">
          <Link href={ROUTES.home} className="flex items-center gap-2 font-semibold tracking-tight">
            <BrandLogo size="md" />
            Bangla AI Hub
          </Link>
          <p className="max-w-sm text-sm text-muted-foreground">
            A community-curated hub for Bangla datasets, papers, and tools — built to help
            researchers and builders find what they need faster.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">Explore</p>
          <nav className="flex flex-col gap-2" aria-label="Explore footer navigation">
            {EXPLORE_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">Company</p>
          <nav className="flex flex-col gap-2" aria-label="Company footer navigation">
            {COMPANY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-foreground">Legal</p>
          <nav className="flex flex-col gap-2" aria-label="Legal footer navigation">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} Bangla AI Hub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
