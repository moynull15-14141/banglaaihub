'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getPurchaseStatus } from '@/lib/api/payments';
import { ROUTES } from '@/lib/constants/routes';

// SSLCommerz's own success/fail/cancel redirect query params are never
// trusted as proof of payment on their own — this page polls the backend's
// IPN-driven purchase status (same poll-based pattern this codebase already
// uses everywhere instead of WebSockets/SSE) until it settles.
export function PaymentResultView() {
  const searchParams = useSearchParams();
  const tranId = searchParams.get('tran_id');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', 'purchase-status', tranId],
    queryFn: () => getPurchaseStatus(tranId as string),
    enabled: Boolean(tranId),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 2000 : false),
  });

  const status = data?.status;

  return (
    <PageContainer className="flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          {!tranId || isLoading || status === 'pending' ? (
            <>
              <Loader2 className="size-10 animate-spin text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="font-semibold">Confirming your payment…</p>
                <p className="mt-1 text-sm text-muted-foreground">This usually takes a few seconds.</p>
              </div>
            </>
          ) : status === 'completed' ? (
            <>
              <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment successful</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You now have full access to &ldquo;{data?.resource_title}&rdquo;.
                </p>
              </div>
              <Button asChild>
                <Link href={ROUTES.resource(data?.resource_slug ?? '')}>Go to resource</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="size-10 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment not completed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Nothing was charged. You can try again from the resource page.
                </p>
              </div>
              {data?.resource_slug ? (
                <Button asChild variant="outline">
                  <Link href={ROUTES.resource(data.resource_slug)}>Back to resource</Link>
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
