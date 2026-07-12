'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyPayouts, useMyWallet, useRequestPayout } from '@/lib/hooks/useWallet';
import type { Currency, PayoutMethod, PayoutStatus } from '@/lib/api/wallet';
import { formatDate } from '@/lib/utils/format';

// Mirrors backend/src/services/payout.service.ts's MIN_PAYOUT_CENTS exactly
// — kept in sync manually, same convention as other client-side hints that
// mirror a server-enforced constant (the server is still the real gate).
const MIN_PAYOUT_CENTS: Record<Currency, number> = { BDT: 100_000, USD: 1_000 };
const BDT_ONLY_METHODS: PayoutMethod[] = ['bkash', 'nagad', 'rocket'];
const METHOD_LABELS: Record<PayoutMethod, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bank_transfer: 'Bank transfer',
};
const STATUS_VARIANT: Record<PayoutStatus, 'warning' | 'brand' | 'destructive' | 'success'> = {
  pending: 'warning',
  approved: 'brand',
  rejected: 'destructive',
  paid: 'success',
};

function formatCents(cents: number, currency: Currency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'BDT' ? 'code' : 'symbol',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

function WithdrawDialog({ currency, available }: { currency: Currency; available: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayoutMethod>(currency === 'USD' ? 'bank_transfer' : 'bkash');
  const [destination, setDestination] = useState('');
  const requestMutation = useRequestPayout();

  const methods = currency === 'USD' ? (['bank_transfer'] as PayoutMethod[]) : (['bkash', 'nagad', 'rocket', 'bank_transfer'] as PayoutMethod[]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amountCents = Math.round(parseFloat(amount || '0') * 100);
    if (amountCents < MIN_PAYOUT_CENTS[currency]) {
      toast.error(`Minimum withdrawal is ${formatCents(MIN_PAYOUT_CENTS[currency], currency)}.`);
      return;
    }
    if (amountCents > available) {
      toast.error("That's more than your available balance.");
      return;
    }
    if (!destination.trim()) {
      toast.error(currency === 'BDT' && BDT_ONLY_METHODS.includes(method) ? 'Enter your phone number.' : 'Enter your bank account details.');
      return;
    }

    try {
      await requestMutation.mutateAsync({ amount_cents: amountCents, currency, method, destination: destination.trim() });
      toast.success('Withdrawal requested — an admin will review it.');
      setOpen(false);
      setAmount('');
      setDestination('');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not submit the request. Please try again.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={available < MIN_PAYOUT_CENTS[currency]}>
          Withdraw {currency}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Withdraw {currency}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Available: {formatCents(available, currency)}. Minimum {formatCents(MIN_PAYOUT_CENTS[currency], currency)}.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="withdraw-amount">Amount ({currency})</Label>
            <Input
              id="withdraw-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Method</Label>
            <div className="flex flex-wrap gap-2">
              {methods.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    method === option ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {METHOD_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="withdraw-destination">
              {BDT_ONLY_METHODS.includes(method) ? 'Phone number' : 'Bank account details'}
            </Label>
            <Input
              id="withdraw-destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={BDT_ONLY_METHODS.includes(method) ? '01XXXXXXXXX' : 'Bank name, account number, branch'}
            />
          </div>

          <DialogFooter>
            <Button type="submit" loading={requestMutation.isPending}>
              Request withdrawal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WalletView() {
  const { data: wallet, isLoading: walletLoading } = useMyWallet();
  const { data: payouts, isLoading: payoutsLoading } = useMyPayouts();

  if (walletLoading || payoutsLoading) {
    return <LoadingScreen label="Loading your wallet…" />;
  }

  const balances = wallet?.balances ?? { BDT: 0, USD: 0 };

  return (
    <PageContainer className="max-w-3xl py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Wallet</h1>
      <p className="mt-1 text-muted-foreground">Earnings from your paid resources — 90% of every sale, minus platform fees.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(['BDT', 'USD'] as Currency[]).map((currency) => (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
                {currency} balance
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-2xl font-semibold tabular-nums">{formatCents(balances[currency], currency)}</span>
              <WithdrawDialog currency={currency} available={balances[currency]} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Withdrawal requests</CardTitle>
        </CardHeader>
        <CardContent>
          {!payouts || payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{formatCents(payout.amountCents, payout.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {METHOD_LABELS[payout.method]} · {formatDate(payout.createdAt)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[payout.status]} className="capitalize">
                    {payout.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Earnings history</CardTitle>
        </CardHeader>
        <CardContent>
          {!wallet || wallet.ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border/60">
              {wallet.ledger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    {entry.amountCents >= 0 ? (
                      <ArrowDownLeft className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-medium capitalize">{entry.type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {entry.amountCents >= 0 ? '+' : ''}
                    {formatCents(entry.amountCents, entry.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
