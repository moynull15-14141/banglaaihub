import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

const FOOTER_LINKS = [
  { href: ROUTES.datasets, label: 'Datasets' },
  { href: ROUTES.papers, label: 'Papers' },
  { href: ROUTES.tools, label: 'Tools' },
  { href: ROUTES.about, label: 'About' },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>&copy; {new Date().getFullYear()} Bangla AI Hub. All rights reserved.</p>
        <nav className="flex items-center gap-4" aria-label="Footer navigation">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
