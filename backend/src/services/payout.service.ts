import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import type { Currency, PayoutMethod, PayoutStatus } from '../generated/prisma/client';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { WalletService } from './wallet.service';

// 1000 BDT / $10 — confirmed with the site owner. Mobile-wallet methods
// (bKash/Nagad/Rocket) only exist for BDT; a USD payout can only go via
// bank_transfer.
const MIN_PAYOUT_CENTS: Record<Currency, number> = { BDT: 100_000, USD: 1_000 };
const BDT_ONLY_METHODS: PayoutMethod[] = ['bkash', 'nagad', 'rocket'];

const OPEN_STATUSES: PayoutStatus[] = ['pending', 'approved'];

function formatMoney(amountCents: number, currency: Currency): string {
  return `${currency} ${(amountCents / 100).toFixed(2)}`;
}

async function getUserContact(userId: string): Promise<{ email: string; name: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, displayName: true, username: true },
  });
  return { email: user.email, name: user.displayName ?? user.username };
}

export class PayoutService {
  // "How much can this user actually request right now" — balance minus
  // whatever they already have pending/approved (not yet paid), so the same
  // earnings can't be claimed by two overlapping requests.
  static async getAvailableToRequest(userId: string, currency: Currency): Promise<number> {
    const balance = await WalletService.getBalance(userId, currency);
    const reserved = await prisma.payoutRequest.aggregate({
      where: { userId, currency, status: { in: OPEN_STATUSES } },
      _sum: { amountCents: true },
    });
    return balance - (reserved._sum.amountCents ?? 0);
  }

  static async request(
    userId: string,
    input: { amountCents: number; currency: Currency; method: PayoutMethod; destination: string },
  ): Promise<Record<string, unknown>> {
    if (input.amountCents < MIN_PAYOUT_CENTS[input.currency]) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Minimum withdrawal is ${MIN_PAYOUT_CENTS[input.currency] / 100} ${input.currency}.`,
      );
    }
    if (input.currency === 'USD' && BDT_ONLY_METHODS.includes(input.method)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'bKash/Nagad/Rocket are only available for BDT withdrawals.');
    }

    const available = await PayoutService.getAvailableToRequest(userId, input.currency);
    if (input.amountCents > available) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'That amount is more than your available balance.');
    }

    const payout = await prisma.payoutRequest.create({
      data: {
        userId,
        amountCents: input.amountCents,
        currency: input.currency,
        method: input.method,
        destination: input.destination,
      },
    });

    await writeAuditLog({
      actorId: userId,
      action: 'payout_request.create',
      targetType: 'payout_request',
      targetId: payout.id,
      newValue: { amountCents: input.amountCents, currency: input.currency, method: input.method },
    });

    return payout;
  }

  static async listMine(userId: string): Promise<unknown[]> {
    return prisma.payoutRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  static async listForAdmin(status?: PayoutStatus): Promise<unknown[]> {
    return prisma.payoutRequest.findMany({
      where: status ? { status } : undefined,
      include: { user: { select: { id: true, username: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private static async requirePending(id: string): Promise<{ id: string; userId: string; amountCents: number; currency: Currency; status: PayoutStatus }> {
    const payout = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!payout) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Payout request not found.');
    }
    if (payout.status !== 'pending') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'This payout request has already been decided.');
    }
    return payout;
  }

  // Approval is the platform's commitment point — the wallet is debited
  // right here (not at markPaid), same reasoning as the plan: staff might
  // approve now and physically send the money later, but the funds are
  // already earmarked the moment an admin signs off.
  static async approve(id: string, actorId: string, notes?: string): Promise<Record<string, unknown>> {
    const payout = await PayoutService.requirePending(id);

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: { status: 'approved', reviewerId: actorId, reviewedAt: new Date(), reviewNotes: notes ?? null },
    });
    await WalletService.debitForPayout(payout.userId, payout.currency, payout.amountCents, payout.id);

    await writeAuditLog({
      actorId,
      action: 'payout_request.approve',
      targetType: 'payout_request',
      targetId: id,
      oldValue: { status: 'pending' },
      newValue: { status: 'approved' },
    });
    await NotificationService.create({
      userId: payout.userId,
      type: 'payout_approved',
      title: `Your withdrawal request for ${payout.amountCents / 100} ${payout.currency} was approved`,
      link: '/settings/wallet',
    });
    const contact = await getUserContact(payout.userId);
    void EmailService.sendPayoutApproved(contact.email, contact.name, formatMoney(payout.amountCents, payout.currency));

    return updated;
  }

  static async reject(id: string, actorId: string, notes?: string): Promise<Record<string, unknown>> {
    const payout = await PayoutService.requirePending(id);

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: { status: 'rejected', reviewerId: actorId, reviewedAt: new Date(), reviewNotes: notes ?? null },
    });

    await writeAuditLog({
      actorId,
      action: 'payout_request.reject',
      targetType: 'payout_request',
      targetId: id,
      oldValue: { status: 'pending' },
      newValue: { status: 'rejected' },
    });
    await NotificationService.create({
      userId: payout.userId,
      type: 'payout_rejected',
      title: 'Your withdrawal request was not approved',
      message: notes ?? undefined,
      link: '/settings/wallet',
    });
    const contact = await getUserContact(payout.userId);
    void EmailService.sendPayoutRejected(contact.email, contact.name, formatMoney(payout.amountCents, payout.currency), notes);

    return updated;
  }

  // Staff confirms the actual bKash/Nagad/Rocket/bank transfer went out —
  // no balance change here, that already happened at approve() above; this
  // is just a status + reference-number record for the audit trail.
  static async markPaid(id: string, actorId: string, paidReference: string): Promise<Record<string, unknown>> {
    const payout = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!payout) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Payout request not found.');
    }
    if (payout.status !== 'approved') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Only an approved payout request can be marked as paid.');
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: { status: 'paid', paidReference, paidAt: new Date() },
    });

    await writeAuditLog({
      actorId,
      action: 'payout_request.mark_paid',
      targetType: 'payout_request',
      targetId: id,
      oldValue: { status: 'approved' },
      newValue: { status: 'paid', paidReference },
    });
    await NotificationService.create({
      userId: payout.userId,
      type: 'payout_paid',
      title: `Your withdrawal of ${payout.amountCents / 100} ${payout.currency} has been sent`,
      link: '/settings/wallet',
    });
    const contact = await getUserContact(payout.userId);
    void EmailService.sendPayoutPaid(
      contact.email,
      contact.name,
      formatMoney(payout.amountCents, payout.currency),
      payout.method,
      paidReference,
    );

    return updated;
  }
}
