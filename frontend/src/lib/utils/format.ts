import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | number | Date, pattern = 'MMM d, yyyy'): string {
  return format(new Date(date), pattern);
}

export function formatRelativeDate(date: string | number | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

// Paid Resource Downloads — priceCents is always a whole-currency-unit
// integer times 100 (e.g. 50000 = 500.00 BDT), same "store cents, format on
// read" convention as any other money value.
export function formatPrice(priceCents: number, currency: 'BDT' | 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'BDT' ? 'code' : 'symbol',
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

export function formatBytes(bytes: number | string | null | undefined): string | null {
  if (bytes === null || bytes === undefined) return null;
  const value = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(value) || value < 0) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
