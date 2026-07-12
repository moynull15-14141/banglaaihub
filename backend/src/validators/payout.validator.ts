import { z } from 'zod';

const CURRENCIES = ['BDT', 'USD'] as const;
const PAYOUT_METHODS = ['bkash', 'nagad', 'rocket', 'bank_transfer'] as const;
const PAYOUT_STATUSES = ['pending', 'approved', 'rejected', 'paid'] as const;

export const requestPayoutSchema = z.object({
  amount_cents: z.number().int().positive(),
  currency: z.enum(CURRENCIES),
  method: z.enum(PAYOUT_METHODS),
  // Phone number (bKash/Nagad/Rocket) or bank account details (bank_transfer)
  // — free text, staff reads this when actually sending the money.
  destination: z.string().min(3).max(300).trim(),
});
export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>;

export const payoutDecisionSchema = z.object({
  notes: z.string().max(500).trim().optional(),
});
export type PayoutDecisionInput = z.infer<typeof payoutDecisionSchema>;

export const markPayoutPaidSchema = z.object({
  paid_reference: z.string().min(1).max(200).trim(),
});
export type MarkPayoutPaidInput = z.infer<typeof markPayoutPaidSchema>;

export const listPayoutsQuerySchema = z.object({
  status: z.enum(PAYOUT_STATUSES).optional(),
});
export type ListPayoutsQuery = z.infer<typeof listPayoutsQuerySchema>;
