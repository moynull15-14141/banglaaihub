import { logger } from '../config/logger';
import { sslcommerzIsLive as envIsLive, sslcommerzStoreId as envStoreId, sslcommerzStorePassword as envStorePassword } from '../config/sslcommerz';
import { ApiError } from '../utils/ApiError';
import { PlatformSettingsService } from './platform-settings.service';
import type { Currency } from '../generated/prisma/client';

export interface CreateSessionParams {
  tranId: string;
  amountCents: number;
  currency: Currency;
  productName: string;
  customerName: string;
  customerEmail: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

export interface ValidatedTransaction {
  tranId: string;
  amountCents: number;
  currency: string;
  status: string;
}

// The IPN payload itself is never trusted directly (anyone could POST a
// forged one to our public /payments/sslcommerz/ipn endpoint) — this is the
// one server-to-server call that actually confirms a payment happened,
// per SSLCommerz's own documented secure-integration pattern.
export class SslcommerzService {
  // Admin-panel-configured credentials (PlatformSetting table) win when
  // present; falls back to the SSLCOMMERZ_* env vars so an existing
  // env-only deployment keeps working unchanged. Re-read on every call
  // (not cached) so a credential update in the admin panel takes effect on
  // the very next payment attempt, no restart needed.
  private static async resolveCredentials(): Promise<{ storeId: string; storePassword: string; isLive: boolean }> {
    const dbConfig = await PlatformSettingsService.getSslcommerzConfig();
    if (dbConfig?.storeId && dbConfig.storePassword) {
      return dbConfig;
    }
    if (!envStoreId || !envStorePassword) {
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Payments are not configured yet.');
    }
    return { storeId: envStoreId, storePassword: envStorePassword, isLive: envIsLive };
  }

  private static baseUrl(isLive: boolean): string {
    return isLive ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
  }

  static async createSession(params: CreateSessionParams): Promise<{ gatewayPageUrl: string }> {
    const { storeId, storePassword, isLive } = await SslcommerzService.resolveCredentials();
    const sslcommerzBaseUrl = SslcommerzService.baseUrl(isLive);

    const body = new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: (params.amountCents / 100).toFixed(2),
      currency: params.currency,
      tran_id: params.tranId,
      success_url: params.successUrl,
      fail_url: params.failUrl,
      cancel_url: params.cancelUrl,
      ipn_url: params.ipnUrl,
      // Digital goods — no physical shipment, so SSLCommerz's shipping
      // fields are all "N/A"/none, per their own docs for non-physical
      // products.
      shipping_method: 'NO',
      product_name: params.productName,
      product_category: 'Digital Resource',
      product_profile: 'general',
      cus_name: params.customerName,
      cus_email: params.customerEmail,
      cus_add1: 'N/A',
      cus_city: 'N/A',
      cus_country: 'Bangladesh',
      cus_phone: 'N/A',
    });

    let response: Response;
    try {
      response = await fetch(`${sslcommerzBaseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (error) {
      logger.error('SSLCommerz session request failed', { error: error instanceof Error ? error.message : error });
      throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Could not reach the payment gateway. Please try again.');
    }

    const data = (await response.json()) as { status?: string; GatewayPageURL?: string; failedreason?: string };
    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      logger.error('SSLCommerz session rejected', { status: data.status, reason: data.failedreason });
      throw new ApiError(502, 'GATEWAY_ERROR', data.failedreason || 'Could not start the payment. Please try again.');
    }

    return { gatewayPageUrl: data.GatewayPageURL };
  }

  static async validateTransaction(valId: string): Promise<ValidatedTransaction | null> {
    const { storeId, storePassword, isLive } = await SslcommerzService.resolveCredentials();
    const sslcommerzBaseUrl = SslcommerzService.baseUrl(isLive);

    const url = new URL(`${sslcommerzBaseUrl}/validator/api/validationserverAPI.php`);
    url.searchParams.set('val_id', valId);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('store_passwd', storePassword);
    url.searchParams.set('format', 'json');

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      logger.error('SSLCommerz validation request failed', { error: error instanceof Error ? error.message : error });
      return null;
    }

    const data = (await response.json()) as {
      status?: string;
      tran_id?: string;
      amount?: string;
      currency?: string;
    };

    if (data.status !== 'VALID' && data.status !== 'VALIDATED') {
      return null;
    }
    if (!data.tran_id || !data.amount || !data.currency) {
      return null;
    }

    return {
      tranId: data.tran_id,
      amountCents: Math.round(parseFloat(data.amount) * 100),
      currency: data.currency,
      status: data.status,
    };
  }
}
