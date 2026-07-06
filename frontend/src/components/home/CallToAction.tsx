import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';

export function CallToAction() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-foreground px-6 py-14 text-center shadow-md sm:py-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(50% 100% at 50% 100%, color-mix(in oklch, var(--brand), transparent 70%), transparent)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-xl space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight text-background sm:text-3xl">
            Have a resource to share?
          </h2>
          <p className="text-background/70">
            Submit a dataset, paper, or tool and help grow the Bengali AI community.
          </p>
          <Button asChild size="lg" className="bg-background text-foreground hover:bg-background/90">
            <Link href={ROUTES.register}>Get started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
