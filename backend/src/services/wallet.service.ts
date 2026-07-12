import { prisma } from '../config/database';
import type { Currency } from '../generated/prisma/client';

// The one write path for every wallet balance change — WalletBalance is a
// fast-read cache, WalletLedgerEntry is the append-only history; both are
// always written inside the same transaction so they can never drift apart,
// same "cache + ledger" convention as User.reputationScore + ReputationEvent.
export class WalletService {
  static async creditEarning(
    userId: string,
    currency: Currency,
    amountCents: number,
    relatedPurchaseId: string,
  ): Promise<void> {
    await WalletService.applyEntry(userId, currency, 'sale_earning', amountCents, { relatedPurchaseId });
  }

  // amountCents is positive here too — the caller (PayoutService.approve)
  // decides the sign meaning via `type`; this just does the debit math.
  static async debitForPayout(
    userId: string,
    currency: Currency,
    amountCents: number,
    relatedPayoutId: string,
  ): Promise<void> {
    await WalletService.applyEntry(userId, currency, 'withdrawal', -amountCents, { relatedPayoutId });
  }

  static async getBalance(userId: string, currency: Currency): Promise<number> {
    const balance = await prisma.walletBalance.findUnique({ where: { userId_currency: { userId, currency } } });
    return balance?.balanceCents ?? 0;
  }

  // GET /users/me/wallet — both currencies' balances (0 when no
  // WalletBalance row exists yet, same "never seeded, always zero" read
  // pattern as getBalance above) plus the last 50 ledger entries across
  // both currencies for the earnings/withdrawals history table.
  static async getSummary(userId: string): Promise<{
    balances: Record<Currency, number>;
    ledger: {
      id: string;
      currency: Currency;
      type: string;
      amountCents: number;
      balanceAfterCents: number;
      createdAt: Date;
    }[];
  }> {
    const [bdt, usd, ledger] = await Promise.all([
      WalletService.getBalance(userId, 'BDT'),
      WalletService.getBalance(userId, 'USD'),
      prisma.walletLedgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, currency: true, type: true, amountCents: true, balanceAfterCents: true, createdAt: true },
      }),
    ]);

    return { balances: { BDT: bdt, USD: usd }, ledger };
  }

  private static async applyEntry(
    userId: string,
    currency: Currency,
    type: 'sale_earning' | 'withdrawal' | 'adjustment',
    amountCents: number,
    related: { relatedPurchaseId?: string; relatedPayoutId?: string },
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const balance = await tx.walletBalance.upsert({
        where: { userId_currency: { userId, currency } },
        update: { balanceCents: { increment: amountCents } },
        create: { userId, currency, balanceCents: amountCents },
      });

      await tx.walletLedgerEntry.create({
        data: {
          userId,
          currency,
          type,
          amountCents,
          balanceAfterCents: balance.balanceCents,
          relatedPurchaseId: related.relatedPurchaseId,
          relatedPayoutId: related.relatedPayoutId,
        },
      });
    });
  }
}
