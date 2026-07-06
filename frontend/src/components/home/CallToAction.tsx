import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants/routes';

export function CallToAction() {
  return (
    <section className="border-t bg-muted/30 py-14 text-center">
      <div className="mx-auto max-w-xl space-y-4 px-4">
        <h2 className="text-2xl font-semibold tracking-tight">Have a resource to share?</h2>
        <p className="text-muted-foreground">
          Submit a dataset, paper, or tool and help grow the Bengali AI community.
        </p>
        <Button asChild size="lg">
          <Link href={ROUTES.register}>Get started</Link>
        </Button>
      </div>
    </section>
  );
}
