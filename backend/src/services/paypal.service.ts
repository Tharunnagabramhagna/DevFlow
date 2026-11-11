import { env } from '../config/env';
import { BadRequestError, InternalServerError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

export interface PayPalOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number; // Timestamp in ms
}

export interface PayPalInvoiceItem {
  name: string;
  quantity: string;
  unit_amount: {
    currency_code: string;
    value: string;
  };
  description?: string;
}

export interface CreateInvoicePayload {
  invoiceNumber: string;
  currency: string;
  recipientEmail: string;
  recipientName?: string;
  items: PayPalInvoiceItem[];
  memo?: string;
  note?: string;
}

export interface PayPalInvoiceResponse {
  id: string;
  status: string;
  href?: string;
  detail?: {
    invoice_number: string;
    invoice_date: string;
    currency_code: string;
  };
}

export interface VerifyWebhookParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId?: string;
  webhookEvent: Record<string, unknown>;
}

export class PayPalService {
  private baseUrl: string;
  private clientId?: string;
  private clientSecret?: string;
  private cachedToken: PayPalOAuthToken | null = null;

  constructor() {
    this.baseUrl = env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';
    this.clientId = env.PAYPAL_CLIENT_ID;
    this.clientSecret = env.PAYPAL_CLIENT_SECRET;
  }

  /**
   * Returns true if valid PayPal credentials are configured.
   * Rejects undefined, empty strings, whitespace-only values, and template/example placeholders.
   */
  isConfigured(): boolean {
    const id = this.clientId?.trim();
    const secret = this.clientSecret?.trim();

    if (!id || !secret) {
      return false;
    }

    const isPlaceholder = (val: string): boolean => {
      const lower = val.toLowerCase();
      return (
        lower.startsWith('your_paypal_') ||
        lower.startsWith('your_') ||
        lower.includes('placeholder') ||
        lower === 'example' ||
        lower.includes('example_')
      );
    };

    if (isPlaceholder(id) || isPlaceholder(secret)) {
      return false;
    }

    return true;
  }

  /**
   * Acquires or reuses an OAuth 2.0 access token with an expiration buffer.
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if valid (with 60-second safety buffer)
    if (this.cachedToken && Date.now() < this.cachedToken.expires_at - 60000) {
      return this.cachedToken.access_token;
    }

    if (!this.isConfigured()) {
      if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') {
        // Safe mock token for testing and local development without credentials
        return 'mock_sandbox_access_token_' + Date.now();
      }
      throw new InternalServerError('PayPal API credentials are not configured');
    }

    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to acquire PayPal OAuth token', { status: response.status, errorText });
        throw new UnauthorizedError('PayPal OAuth authentication failed');
      }

      const data = (await response.json()) as { access_token: string; token_type: string; expires_in: number };
      this.cachedToken = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      return this.cachedToken.access_token;
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
      logger.error('PayPal OAuth request error', { error: err.message });
      throw new InternalServerError('Failed to connect to PayPal OAuth service');
    }
  }

  /**
   * Creates a draft invoice in PayPal Invoicing v2.
   * Includes idempotency key header: PayPal-Request-Id.
   */
  async createInvoice(payload: CreateInvoicePayload, idempotencyKey: string): Promise<PayPalInvoiceResponse> {
    const token = await this.getAccessToken();

    if (!this.isConfigured() && env.NODE_ENV === 'test') {
      // Deterministic mock response for testing
      const invoiceId = `INV2-MOCK-${Date.now()}`;
      return {
        id: invoiceId,
        status: 'DRAFT',
        href: `https://www.sandbox.paypal.com/invoice/payerView/details/${invoiceId}`,
        detail: {
          invoice_number: payload.invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          currency_code: payload.currency,
        },
      };
    }

    const body = {
      detail: {
        invoice_number: payload.invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        currency_code: payload.currency,
        note: payload.note || 'DevFlow Milestone Delivery Invoice',
        memo: payload.memo || 'Milestone delivery via DevFlow',
      },
      invoicer: {
        name: {
          given_name: 'DevFlow',
          surname: 'Platform',
        },
      },
      primary_recipients: [
        {
          billing_info: {
            email_address: payload.recipientEmail,
            name: {
              given_name: payload.recipientName || 'Client',
            },
          },
        },
      ],
      items: payload.items,
    };

    const response = await fetch(`${this.baseUrl}/v2/invoicing/invoices`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('PayPal invoice creation failed', { status: response.status, errorText });
      throw new BadRequestError(`PayPal invoice creation failed: ${errorText}`);
    }

    return (await response.json()) as PayPalInvoiceResponse;
  }

  /**
   * Sends a draft invoice to the recipient.
   */
  async sendInvoice(invoiceId: string): Promise<{ success: boolean; invoiceUrl?: string }> {
    const token = await this.getAccessToken();

    if (!this.isConfigured() && env.NODE_ENV === 'test') {
      return {
        success: true,
        invoiceUrl: `https://www.sandbox.paypal.com/invoice/payerView/details/${invoiceId}`,
      };
    }

    const response = await fetch(`${this.baseUrl}/v2/invoicing/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ send_to_recipient: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('PayPal invoice send failed', { invoiceId, status: response.status, errorText });
      throw new BadRequestError(`PayPal invoice send failed: ${errorText}`);
    }

    const invoiceUrl = `https://www.sandbox.paypal.com/invoice/payerView/details/${invoiceId}`;
    return { success: true, invoiceUrl };
  }

  /**
   * Retrieves an invoice from PayPal by its ID.
   */
  async getInvoice(invoiceId: string): Promise<any> {
    const token = await this.getAccessToken();

    if (!this.isConfigured() && env.NODE_ENV === 'test') {
      return {
        id: invoiceId,
        status: 'SENT',
        detail: { invoice_number: 'INV-12345', currency_code: 'USD' },
      };
    }

    const response = await fetch(`${this.baseUrl}/v2/invoicing/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestError(`Failed to fetch PayPal invoice: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Cancels an unpaid invoice in PayPal.
   */
  async cancelInvoice(invoiceId: string, reason?: string): Promise<{ success: boolean }> {
    const token = await this.getAccessToken();

    if (!this.isConfigured() && env.NODE_ENV === 'test') {
      return { success: true };
    }

    const response = await fetch(`${this.baseUrl}/v2/invoicing/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: 'Invoice Cancelled',
        note: reason || 'Cancelled by project administrator',
        send_to_recipient: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('PayPal invoice cancellation failed', { invoiceId, errorText });
      throw new BadRequestError(`PayPal invoice cancel failed: ${errorText}`);
    }

    return { success: true };
  }

  /**
   * Refunds a captured payment.
   * Dispatched with PayPal-Request-Id matching the client's idempotency key.
   */
  async refundCapture(
    captureId: string,
    params: {
      amount: string;
      currency: string;
      note?: string;
    },
    idempotencyKey: string
  ): Promise<{ id: string; status: string; net_amount_breakdown?: any }> {
    const token = await this.getAccessToken();

    if (!this.isConfigured() && env.NODE_ENV === 'test') {
      return {
        id: `REFUND-MOCK-${Date.now()}`,
        status: 'COMPLETED',
        net_amount_breakdown: {
          gross_amount: { value: params.amount, currency_code: params.currency },
          paypal_fee: { value: '0.00', currency_code: params.currency },
          net_amount: { value: params.amount, currency_code: params.currency },
        },
      };
    }

    const response = await fetch(`${this.baseUrl}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
      body: JSON.stringify({
        amount: {
          value: params.amount,
          currency_code: params.currency,
        },
        note_to_payer: params.note || 'Milestone refund issued via DevFlow',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('PayPal capture refund failed', { captureId, status: response.status, errorText });
      throw new BadRequestError(`PayPal refund failed: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Verifies PayPal webhook signature via PayPal REST endpoint.
   * /v1/notifications/verify-webhook-signature
   */
  async verifyWebhookSignature(params: VerifyWebhookParams): Promise<boolean> {
    if (!this.isConfigured() && env.NODE_ENV === 'test') {
      // In test mode without credentials: verify required headers are present
      return Boolean(params.authAlgo && params.certUrl && params.transmissionId && params.transmissionSig);
    }

    const webhookId = params.webhookId || env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      logger.warn('PAYPAL_WEBHOOK_ID is not configured; rejecting webhook verification');
      return false;
    }

    const token = await this.getAccessToken();

    try {
      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: params.authAlgo,
          cert_url: params.certUrl,
          transmission_id: params.transmissionId,
          transmission_sig: params.transmissionSig,
          transmission_time: params.transmissionTime,
          webhook_id: webhookId,
          webhook_event: params.webhookEvent,
        }),
      });

      if (!response.ok) {
        logger.error('Webhook signature verification call failed', { status: response.status });
        return false;
      }

      const data = (await response.json()) as { verification_status: string };
      return data.verification_status === 'SUCCESS';
    } catch (err: any) {
      logger.error('Webhook signature verification error', { error: err.message });
      return false;
    }
  }
}

export const paypalService = new PayPalService();

