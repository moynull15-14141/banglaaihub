'use client';

import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useResourcePurchases, useRevenueSummary } from '@/lib/hooks/useTransactions';
import { formatDate } from '@/lib/utils/format';
import { ROUTES } from '@/lib/constants/routes';
import type { Currency } from '@/lib/api/wallet';

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'BDT' ? 'code' : 'symbol',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

// Every sale on the platform (which resource, which buyer, when, how much,
// the exact 90/10 split) — super_admin financial oversight, so nothing
// about platform revenue is ever invisible or only inferable from the
// per-contributor wallet pages.
export function AdminTransactionsView() {
  const { data: summary, isLoading: summaryLoading } = useRevenueSummary();
  const { data: purchases, isLoading: purchasesLoading } = useResourcePurchases('completed');

  if (summaryLoading || purchasesLoading) {
    return <LoadingScreen label="Loading transactions…" />;
  }

  const currencies: Currency[] = ['BDT', 'USD'];

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Transactions</h1>
      <p className="mt-1 text-muted-foreground">
        Every completed sale on the platform, and the 10% platform fee collected from each.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Completed sales</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {summary?.completedSalesCount ?? 0}
          </CardContent>
        </Card>
        {currencies.map((currency) => (
          <Card key={currency}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Platform fee ({currency})</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">
              {formatCents(summary?.totalPlatformFeeCents[currency] ?? 0, currency)}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {!purchases || purchases.length === 0 ? (
            <EmptyState icon={Receipt} title="No sales yet" description="Completed purchases will show up here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Resource</th>
                    <th className="py-2 pr-3 font-medium">Buyer</th>
                    <th className="py-2 pr-3 font-medium">Amount</th>
                    <th className="py-2 pr-3 font-medium">Platform fee</th>
                    <th className="py-2 pr-3 font-medium">Author got</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium">Gateway ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={ROUTES.resource(purchase.resource.slug)}
                          className="font-medium text-brand hover:underline"
                        >
                          {purchase.resource.title}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {purchase.buyer.displayName ?? purchase.buyer.username}
                        <span className="ml-1 text-xs text-muted-foreground">{purchase.buyer.email}</span>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                        {formatCents(purchase.amount_cents, purchase.currency)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap font-medium">
                        {formatCents(purchase.platform_fee_cents, purchase.currency)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap text-muted-foreground">
                        {formatCents(purchase.author_earnings_cents, purchase.currency)}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                        {purchase.paid_at ? formatDate(purchase.paid_at) : '—'}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {purchase.gateway_name}
                        {purchase.gateway_transaction_id ? ` · ${purchase.gateway_transaction_id}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
