'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, CreditCard, Download } from 'lucide-react';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { useDownloadResource } from '@/lib/hooks/useResources';
import { ROUTES } from '@/lib/constants/routes';
import { formatPrice } from '@/lib/utils/format';

function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.error?.message === 'string') {
    return error.response.data.error.message;
  }
  return fallback;
}

interface DownloadButtonProps {
  slug: string;
  fileId?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon-sm';
  // Paid Resource Downloads — when the resource is priced, the viewer
  // hasn't purchased it, and isn't the author (who can always download
  // free, per assertCanDownload), the button becomes "Buy for X" and skips
  // straight to checkout instead of round-tripping through a 402 first.
  priceCents?: number | null;
  currency?: 'BDT' | 'USD' | null;
  isPurchased?: boolean;
  isOwner?: boolean;
}

// Downloading.../Completed download UX (Part 5) — the actual byte transfer
// happens as a direct browser navigation to a signed R2 URL (cross-origin,
// so true progress can't be observed from the page); "Preparing…" covers the
// URL-issuing round trip, and "Downloaded" confirms the browser was handed a
// working link and the download was recorded.
export function DownloadButton({
  slug,
  fileId,
  label = 'Download',
  variant,
  size,
  priceCents,
  currency,
  isPurchased,
  isOwner,
}: DownloadButtonProps) {
  const router = useRouter();
  const { state, download } = useDownloadResource(slug);

  const needsPurchase = Boolean(priceCents) && !isPurchased && !isOwner;

  async function handleClick() {
    if (needsPurchase) {
      router.push(ROUTES.checkout(slug));
      return;
    }

    try {
      await download(fileId);
    } catch (error) {
      // Paid Resource Downloads — 401 means "not logged in" (the route
      // allows anonymous browsing, but a priced resource forces real auth);
      // 402 means "logged in, but hasn't purchased yet" — sends them to the
      // order-summary/checkout page instead of a plain error toast. Kept as
      // a fallback even with the needsPurchase short-circuit above, in case
      // price/purchase props weren't passed by a particular call site.
      if (isAxiosError(error) && error.response?.status === 401) {
        router.push(ROUTES.login);
        return;
      }
      if (isAxiosError(error) && error.response?.status === 402) {
        router.push(ROUTES.checkout(slug));
        return;
      }
      toast.error(errorMessage(error, 'Could not start the download. Please try again.'));
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={state === 'preparing'}
      onClick={handleClick}
    >
      {state === 'preparing' ? null : state === 'done' ? (
        <CheckCircle2 className="size-4" aria-hidden="true" />
      ) : needsPurchase ? (
        <CreditCard className="size-4" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {state === 'preparing'
        ? 'Preparing…'
        : state === 'done'
          ? 'Downloaded'
          : needsPurchase && priceCents && currency
            ? `Buy for ${formatPrice(priceCents, currency)}`
            : label}
    </Button>
  );
}
