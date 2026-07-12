import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { writeAuditLog } from '../utils/auditLog';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { SslcommerzService } from './sslcommerz.service';
import { WalletService } from './wallet.service';
import type { Currency } from '../generated/prisma/client';

const PLATFORM_FEE_RATE = 0.1; // 10% platform cut, 90% to the author's wallet.

function formatMoney(amountCents: number, currency: Currency): string {
  return `${currency} ${(amountCents / 100).toFixed(2)}`;
}

export class ResourcePurchaseService {
  // GET /payments/purchases/:id — polled by the frontend's /payments/result
  // page after returning from SSLCommerz. Buyer-only (never leaks purchase
  // status to anyone else by guessing a purchase id).
  static async getStatus(
    purchaseId: string,
    requesterId: string,
  ): Promise<{ status: string; resource_slug: string; resource_title: string }> {
    const purchase = await prisma.resourcePurchase.findUnique({
      where: { id: purchaseId },
      include: { resource: { select: { slug: true, title: true } } },
    });
    if (!purchase || purchase.buyerId !== requesterId) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Purchase not found.');
    }
    return { status: purchase.status, resource_slug: purchase.resource.slug, resource_title: purchase.resource.title };
  }

  static async hasPurchased(userId: string, resourceId: string): Promise<boolean> {
    const purchase = await prisma.resourcePurchase.findUnique({
      where: { resourceId_buyerId_status: { resourceId, buyerId: userId, status: 'completed' } },
      select: { id: true },
    });
    return purchase !== null;
  }

  // Called right before redirecting to the payment gateway (Phase B) — for
  // Phase A this is exercised directly via the temporary admin
  // mark-paid-manually route so the gate/ledger path can be proven end to
  // end before any gateway integration exists.
  static async createPendingPurchase(resourceId: string, buyerId: string): Promise<{ id: string }> {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, authorId: true, priceCents: true, currency: true, deletedAt: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }
    if (!resource.priceCents || !resource.currency) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'This resource is not priced.');
    }
    if (resource.authorId === buyerId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'You already have full access to your own resource.');
    }
    if (await ResourcePurchaseService.hasPurchased(buyerId, resourceId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'You already purchased this resource.');
    }

    const platformFeeCents = Math.round(resource.priceCents * PLATFORM_FEE_RATE);
    const authorEarningsCents = resource.priceCents - platformFeeCents;

    const purchase = await prisma.resourcePurchase.upsert({
      where: { resourceId_buyerId_status: { resourceId, buyerId, status: 'pending' } },
      update: { amountCents: resource.priceCents, currency: resource.currency },
      create: {
        resourceId,
        buyerId,
        amountCents: resource.priceCents,
        currency: resource.currency,
        platformFeeCents,
        authorEarningsCents,
        status: 'pending',
      },
    });

    return { id: purchase.id };
  }

  // The single place a purchase actually becomes "paid" — Phase B's IPN
  // handler calls this after independently validating the transaction with
  // the gateway; Phase A's temporary admin route calls it directly with a
  // synthetic `manual-*` transaction id for end-to-end testing.
  static async markCompleted(purchaseId: string, gatewayTransactionId: string, actorId: string | null): Promise<void> {
    const purchase = await prisma.resourcePurchase.findUnique({
      where: { id: purchaseId },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            slug: true,
            authorId: true,
            author: { select: { email: true, displayName: true, username: true } },
          },
        },
        buyer: { select: { email: true, displayName: true, username: true } },
      },
    });
    if (!purchase) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Purchase not found.');
    }
    if (purchase.status === 'completed') return; // idempotent — a duplicate IPN retry is a no-op, not an error.
    if (!purchase.resource.authorId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'This resource has no author to credit.');
    }

    await prisma.resourcePurchase.update({
      where: { id: purchaseId },
      data: { status: 'completed', gatewayTransactionId, paidAt: new Date() },
    });

    await WalletService.creditEarning(
      purchase.resource.authorId,
      purchase.currency,
      purchase.authorEarningsCents,
      purchase.id,
    );

    await NotificationService.create({
      userId: purchase.resource.authorId,
      type: 'payment_received',
      title: `Someone purchased "${purchase.resource.title}"`,
      link: `/resources/${purchase.resource.slug}`,
    });
    await NotificationService.create({
      userId: purchase.buyerId,
      type: 'purchase_completed',
      title: `Your purchase of "${purchase.resource.title}" is complete`,
      link: `/resources/${purchase.resource.slug}`,
    });

    if (purchase.resource.author) {
      void EmailService.sendPaymentReceived(
        purchase.resource.author.email,
        purchase.resource.author.displayName ?? purchase.resource.author.username,
        purchase.resource.title,
        formatMoney(purchase.amountCents, purchase.currency),
        formatMoney(purchase.authorEarningsCents, purchase.currency),
      );
    }
    void EmailService.sendPurchaseCompleted(
      purchase.buyer.email,
      purchase.buyer.displayName ?? purchase.buyer.username,
      purchase.resource.title,
      purchase.resource.slug,
      formatMoney(purchase.amountCents, purchase.currency),
    );

    await writeAuditLog({
      actorId,
      action: 'resource_purchase.complete',
      targetType: 'resource_purchase',
      targetId: purchase.id,
      newValue: { gatewayTransactionId, amountCents: purchase.amountCents, currency: purchase.currency },
    });
  }

  // POST /resources/:slug/purchase — creates the pending purchase (or
  // reuses the caller's own not-yet-paid one, same idempotent upsert as
  // createPendingPurchase) and opens an SSLCommerz session for it. The
  // success/fail/cancel/ipn URLs are built by the controller (which has the
  // request's own host) and passed in here so this service stays
  // environment-agnostic.
  static async initiateCheckout(
    slug: string,
    buyerId: string,
    urls: { successUrl: string; failUrl: string; cancelUrl: string; ipnUrl: string },
  ): Promise<{ gatewayPageUrl: string }> {
    const resource = await prisma.resource.findUnique({
      where: { slug },
      select: { id: true, title: true, deletedAt: true },
    });
    if (!resource || resource.deletedAt) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource not found.');
    }

    const { id: purchaseId } = await ResourcePurchaseService.createPendingPurchase(resource.id, buyerId);
    const purchase = await prisma.resourcePurchase.findUniqueOrThrow({ where: { id: purchaseId } });

    const buyer = await prisma.user.findUniqueOrThrow({
      where: { id: buyerId },
      select: { email: true, displayName: true, username: true },
    });

    const { gatewayPageUrl } = await SslcommerzService.createSession({
      tranId: purchase.id,
      amountCents: purchase.amountCents,
      currency: purchase.currency,
      productName: resource.title,
      customerName: buyer.displayName ?? buyer.username,
      customerEmail: buyer.email,
      ...urls,
    });

    return { gatewayPageUrl };
  }

  // POST /payments/sslcommerz/ipn — SSLCommerz calls this server-to-server.
  // The posted body is never trusted directly; val_id is re-checked against
  // SSLCommerz's own validation API, and the returned amount/currency are
  // cross-checked against what we actually created the session for, so a
  // tampered/forged IPN POST can't mark an under-paid or wrong-resource
  // purchase as complete.
  static async handleIpn(tranId: string, valId: string): Promise<void> {
    const validated = await SslcommerzService.validateTransaction(valId);
    if (!validated || validated.tranId !== tranId) {
      logger.warn('SSLCommerz IPN failed validation', { tranId, valId });
      return;
    }

    const purchase = await prisma.resourcePurchase.findUnique({ where: { id: tranId } });
    if (!purchase) {
      logger.warn('SSLCommerz IPN for unknown purchase', { tranId });
      return;
    }
    if (purchase.amountCents !== validated.amountCents || purchase.currency !== validated.currency) {
      logger.error('SSLCommerz IPN amount/currency mismatch — refusing to complete', {
        tranId,
        expected: { amountCents: purchase.amountCents, currency: purchase.currency },
        got: validated,
      });
      return;
    }

    await ResourcePurchaseService.markCompleted(purchase.id, valId, null);
  }

  // GET /admin/resource-purchases — every sale (which resource, which
  // buyer, when, how much, and the exact 90/10 split), so a super_admin can
  // audit the platform's cut without trusting any cached/summed number
  // alone — this is the row-level source of truth every summary figure
  // below is computed from.
  static async listForAdmin(status?: 'pending' | 'completed' | 'failed' | 'cancelled'): Promise<unknown[]> {
    const purchases = await prisma.resourcePurchase.findMany({
      where: status ? { status } : { status: 'completed' },
      include: {
        resource: { select: { slug: true, title: true, type: true } },
        buyer: { select: { id: true, username: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return purchases.map((purchase) => ({
      id: purchase.id,
      resource: purchase.resource,
      buyer: purchase.buyer,
      amount_cents: purchase.amountCents,
      currency: purchase.currency,
      platform_fee_cents: purchase.platformFeeCents,
      author_earnings_cents: purchase.authorEarningsCents,
      status: purchase.status,
      gateway_name: purchase.gatewayName,
      gateway_transaction_id: purchase.gatewayTransactionId,
      paid_at: purchase.paidAt,
      created_at: purchase.createdAt,
    }));
  }

  // GET /admin/resource-purchases/summary — total platform revenue (the
  // 10% cut) per currency, computed directly from completed purchases via
  // SQL SUM rather than any cached counter, so it can never drift from the
  // row-level data above.
  static async getRevenueSummary(): Promise<{
    totalPlatformFeeCents: Record<string, number>;
    totalSalesCents: Record<string, number>;
    completedSalesCount: number;
  }> {
    const grouped = await prisma.resourcePurchase.groupBy({
      by: ['currency'],
      where: { status: 'completed' },
      _sum: { platformFeeCents: true, amountCents: true },
      _count: { _all: true },
    });

    const totalPlatformFeeCents: Record<string, number> = {};
    const totalSalesCents: Record<string, number> = {};
    let completedSalesCount = 0;

    for (const row of grouped) {
      totalPlatformFeeCents[row.currency] = row._sum.platformFeeCents ?? 0;
      totalSalesCents[row.currency] = row._sum.amountCents ?? 0;
      completedSalesCount += row._count._all;
    }

    return { totalPlatformFeeCents, totalSalesCents, completedSalesCount };
  }

  // Support/manual-override tool (system:configure-gated route) — grants a
  // buyer access and credits the author without a real gateway transaction,
  // for cases like "buyer paid the author directly" or (Phase A only) for
  // testing the whole gate/ledger path before Phase B's real gateway exists.
  static async grantManually(resourceId: string, buyerId: string, actorId: string): Promise<void> {
    const { id } = await ResourcePurchaseService.createPendingPurchase(resourceId, buyerId);
    await ResourcePurchaseService.markCompleted(id, `manual-${actorId}-${Date.now()}`, actorId);
  }
}
