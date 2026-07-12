'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { CreditCard, Lock } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { ErrorState } from '@/components/common/ErrorState';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/user/UserAvatar';
import { useResource } from '@/lib/hooks/useResources';
import { getResourcePreview, purchaseResource } from '@/lib/api/resources';
import { formatPrice } from '@/lib/utils/format';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface CheckoutViewProps {
  slug: string;
}

// The "who's paying whom" order-summary page, shown before a payment gateway
// redirect (Phase B wires the actual "Pay now" call to
// POST /resources/:slug/purchase + a gateway redirect — this phase renders
// the summary and confirms the price/author/buyer are all correct).
function CheckoutContent({ slug }: CheckoutViewProps) {
  const { data: resource, isLoading, isError, refetch } = useResource(slug);
  const { data: preview } = useQuery({
    queryKey: ['resources', 'preview', slug],
    queryFn: () => getResourcePreview(slug),
  });
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (isLoading) {
    return <LoadingScreen label="Loading checkout…" />;
  }

  if (isError || !resource) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Couldn't load this resource" onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  if (!resource.price_cents || !resource.currency) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="This resource is free" description="There's nothing to check out here." />
      </PageContainer>
    );
  }

  if (resource.is_purchased) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <ErrorState title="Already purchased" description="You already have full access to this resource." />
      </PageContainer>
    );
  }

  async function handlePayNow() {
    setIsRedirecting(true);
    try {
      const { gateway_url } = await purchaseResource(slug);
      // Full browser navigation, not a fetch/XHR — SSLCommerz's own hosted
      // page needs the whole tab, never embedded/iframed.
      window.location.href = gateway_url;
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start the payment. Please try again.'));
      setIsRedirecting(false);
    }
  }

  return (
    <PageContainer className="max-w-lg py-12">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Checkout</h1>
      <p className="mt-1 text-muted-foreground">Review your purchase before paying.</p>

      {preview?.available && preview.content ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-h-48 overflow-hidden rounded-lg border bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">{preview.content}</pre>
              {preview.truncated ? (
                <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-linear-to-t from-background to-transparent pb-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Lock className="size-3" aria-hidden="true" />
                    Pay to unlock the full resource
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{resource.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-sm text-muted-foreground">Seller</span>
            {resource.author ? (
              <div className="flex items-center gap-2">
                <UserAvatar
                  avatarUrl={resource.author.avatar_url}
                  name={resource.author.display_name ?? resource.author.username}
                  className="size-6"
                />
                <span className="text-sm font-medium">
                  {resource.author.display_name ?? resource.author.username}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unknown</span>
            )}
          </div>

          <div className="flex items-center justify-between border-b pb-4">
            <span className="text-sm text-muted-foreground">Price</span>
            <span className="text-lg font-semibold tabular-nums">
              {formatPrice(resource.price_cents, resource.currency)}
            </span>
          </div>

          <Button className="w-full" onClick={handlePayNow} loading={isRedirecting}>
            <CreditCard className="size-4" aria-hidden="true" />
            Pay now
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

export function CheckoutView({ slug }: CheckoutViewProps) {
  return (
    <ProtectedRoute>
      <CheckoutContent slug={slug} />
    </ProtectedRoute>
  );
}
