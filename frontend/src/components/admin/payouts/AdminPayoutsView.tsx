'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { PageContainer } from '@/components/common/PageContainer';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet } from 'lucide-react';
import { useAdminPayouts, useApprovePayout, useMarkPayoutPaid, useRejectPayout } from '@/lib/hooks/useWallet';
import type { PayoutRequest, PayoutStatus } from '@/lib/api/wallet';
import { formatDate } from '@/lib/utils/format';

const STATUS_TABS: { value: PayoutStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

const METHOD_LABELS: Record<PayoutRequest['method'], string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  bank_transfer: 'Bank transfer',
};

function formatCents(cents: number, currency: string): string {
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

function MarkPaidDialog({ payout }: { payout: PayoutRequest }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const markPaidMutation = useMarkPayoutPaid();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reference.trim()) {
      toast.error('Enter the bKash/bank transaction reference.');
      return;
    }
    try {
      await markPaidMutation.mutateAsync({ id: payout.id, paidReference: reference.trim() });
      toast.success('Marked as paid.');
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not mark this as paid.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Mark as paid
      </Button>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Mark {formatCents(payout.amountCents, payout.currency)} as paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="paid-reference">Transaction reference</Label>
            <Input
              id="paid-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="bKash TrxID, bank ref no., etc."
            />
          </div>
          <DialogFooter>
            <Button type="submit" loading={markPaidMutation.isPending}>
              Confirm sent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PayoutRow({ payout }: { payout: PayoutRequest }) {
  const approveMutation = useApprovePayout();
  const rejectMutation = useRejectPayout();

  async function handleApprove() {
    try {
      await approveMutation.mutateAsync({ id: payout.id });
      toast.success('Approved — wallet debited.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not approve this request.'));
    }
  }

  async function handleReject() {
    try {
      await rejectMutation.mutateAsync({ id: payout.id });
      toast.success('Rejected.');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not reject this request.'));
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">
          {payout.user?.displayName ?? payout.user?.username ?? 'Unknown user'}
          <span className="ml-2 text-sm font-normal text-muted-foreground">{payout.user?.email}</span>
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatCents(payout.amountCents, payout.currency)} · {METHOD_LABELS[payout.method]} · {payout.destination}
        </p>
        <p className="text-xs text-muted-foreground">Requested {formatDate(payout.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2">
        {payout.status === 'pending' ? (
          <>
            <Button size="sm" variant="outline" onClick={handleReject} disabled={rejectMutation.isPending}>
              Reject
            </Button>
            <Button size="sm" onClick={handleApprove} loading={approveMutation.isPending}>
              Approve
            </Button>
          </>
        ) : payout.status === 'approved' ? (
          <MarkPaidDialog payout={payout} />
        ) : payout.status === 'paid' ? (
          <Badge variant="success">Ref: {payout.paidReference}</Badge>
        ) : (
          <Badge variant="destructive">Rejected</Badge>
        )}
      </div>
    </div>
  );
}

export function AdminPayoutsView() {
  const [status, setStatus] = useState<PayoutStatus>('pending');
  const { data: payouts, isLoading } = useAdminPayouts(status);

  return (
    <PageContainer>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Payouts</h1>
      <p className="mt-1 text-muted-foreground">Review and process contributor withdrawal requests.</p>

      <Tabs value={status} onValueChange={(value) => setStatus(value as PayoutStatus)} className="mt-6">
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="mt-4">
        <CardContent className="py-4">
          {isLoading ? (
            <LoadingScreen label="Loading payout requests…" />
          ) : !payouts || payouts.length === 0 ? (
            <EmptyState icon={Wallet} title="No requests" description={`No ${status} payout requests.`} />
          ) : (
            payouts.map((payout) => <PayoutRow key={payout.id} payout={payout} />)
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
