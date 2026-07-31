import { randomUUID } from 'crypto';
import { websiteConfig } from '@/config/website';
import {
  addCredits,
  addLifetimeMonthlyCredits,
  addSubscriptionCredits,
} from '@/credits/credits';
import { getCreditPackageById } from '@/credits/server';
import { CREDIT_TRANSACTION_TYPE } from '@/credits/types';
import { getDb } from '@/db';
import { payment } from '@/db/schema';
import type { Payment } from '@/db/types';
import { findPlanByPlanId } from '@/lib/price-plan';
import { sendNotification } from '@/notification/notification';
import { desc, eq } from 'drizzle-orm';
import {
  type CheckoutResult,
  type CreateCheckoutParams,
  type CreateCreditCheckoutParams,
  type CreatePortalParams,
  type PaymentProvider,
  PaymentScenes,
  PaymentTypes,
  PlanIntervals,
  type PortalResult,
} from '../types';

/**
 * Waffo Pancake payment provider implementation (MoR - Merchant of Record)
 *
 * Uses Waffo's REST API directly (no SDK dependency) to avoid bundling issues.
 *
 * docs:
 * - https://docs.waffo.ai/
 * - https://docs.waffo.ai/api-reference
 *
 * Required environment variables:
 * - WAFFO_STORE_SLUG: Store slug for public checkout auth
 * - WAFFO_MERCHANT_ID: Merchant ID for API key auth (webhooks, management)
 * - WAFFO_PRIVATE_KEY: Private key for request signing
 * - WAFFO_WEBHOOK_SECRET: Webhook signature verification secret
 * - WAFFO_ENVIRONMENT: 'test' or 'prod'
 *
 * Product ID mapping (set these to Waffo product IDs from dashboard):
 * - NEXT_PUBLIC_WAFFO_PRODUCT_PRO_MONTHLY
 * - NEXT_PUBLIC_WAFFO_PRODUCT_PRO_YEARLY
 * - NEXT_PUBLIC_WAFFO_PRODUCT_LIFETIME
 * - NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_BASIC (optional)
 * - NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_STANDARD (optional)
 * - NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_PREMIUM (optional)
 * - NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_ENTERPRISE (optional)
 */
export class WaffoProvider implements PaymentProvider {
  private storeSlug: string;
  private merchantId: string;
  private privateKey: string;
  private webhookSecret: string;
  private environment: string;
  private apiBaseUrl: string;

  constructor() {
    const storeSlug = process.env.WAFFO_STORE_SLUG;
    if (!storeSlug) {
      throw new Error('WAFFO_STORE_SLUG environment variable is not set');
    }

    const merchantId = process.env.WAFFO_MERCHANT_ID;
    if (!merchantId) {
      throw new Error('WAFFO_MERCHANT_ID environment variable is not set');
    }

    const privateKey = process.env.WAFFO_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WAFFO_PRIVATE_KEY environment variable is not set');
    }

    const webhookSecret = process.env.WAFFO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error(
        'WAFFO_WEBHOOK_SECRET environment variable is not set'
      );
    }

    this.storeSlug = storeSlug;
    this.merchantId = merchantId;
    this.privateKey = privateKey;
    this.webhookSecret = webhookSecret;
    this.environment = process.env.WAFFO_ENVIRONMENT || 'test';
    this.apiBaseUrl = 'https://api.waffo.ai/v1';
  }

  /**
   * Map planId + priceId to Waffo product ID via environment variables
   */
  private getWaffoProductId(planId: string, priceId: string): string {
    const plan = findPlanByPlanId(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} not found`);
    }

    const price = plan.prices.find((p) => p.priceId === priceId);
    if (!price) {
      throw new Error(`Price ID ${priceId} not found in plan ${planId}`);
    }

    let productId: string | undefined;

    if (planId === 'pro') {
      if (price.interval === PlanIntervals.YEAR) {
        productId = process.env.NEXT_PUBLIC_WAFFO_PRODUCT_PRO_YEARLY;
      } else {
        productId = process.env.NEXT_PUBLIC_WAFFO_PRODUCT_PRO_MONTHLY;
      }
    } else if (planId === 'lifetime') {
      productId = process.env.NEXT_PUBLIC_WAFFO_PRODUCT_LIFETIME;
    }

    if (!productId) {
      throw new Error(
        `Waffo product ID not configured for plan ${planId} (interval: ${price.interval}). ` +
          'Set the corresponding NEXT_PUBLIC_WAFFO_PRODUCT_* environment variable.'
      );
    }

    return productId;
  }

  /**
   * Get credit package Waffo product ID
   */
  private getWaffoCreditProductId(packageId: string): string {
    const packageToEnvVar: Record<string, string | undefined> = {
      basic: process.env.NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_BASIC,
      standard: process.env.NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_STANDARD,
      premium: process.env.NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_PREMIUM,
      enterprise: process.env.NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_ENTERPRISE,
    };

    const productId = packageToEnvVar[packageId];
    if (!productId) {
      throw new Error(
        `Waffo product ID not configured for credit package ${packageId}. ` +
          'Set the corresponding NEXT_PUBLIC_WAFFO_PRODUCT_CREDITS_* environment variable.'
      );
    }

    return productId;
  }

  /**
   * Determine product type for Waffo API
   */
  private getProductType(planId: string, priceId: string): string {
    const plan = findPlanByPlanId(planId);
    if (!plan) return 'onetime';

    const price = plan.prices.find((p) => p.priceId === priceId);
    if (!price) return 'onetime';

    return price.type === PaymentTypes.SUBSCRIPTION ? 'subscription' : 'onetime';
  }

  /**
   * Create a checkout session via Waffo REST API
   */
  private async createWaffoCheckoutSession(params: {
    productId: string;
    productType: string;
    customerEmail: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, string>;
  }): Promise<{ checkoutUrl: string; sessionId: string }> {
    const { productId, productType, customerEmail, successUrl, cancelUrl, metadata } = params;

    const body: Record<string, unknown> = {
      productId,
      productType,
      currency: 'USD',
      customerEmail,
      ...(successUrl ? { successUrl } : {}),
      ...(cancelUrl ? { cancelUrl } : {}),
      ...(metadata ? { metadata } : {}),
    };

    const response = await fetch(
      `${this.apiBaseUrl}/actions/checkout/create-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Slug': this.storeSlug,
          'X-Environment': this.environment,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Waffo checkout creation failed:', response.status, errorText);
      throw new Error(
        `Waffo checkout creation failed: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();

    // Waffo returns { data: { checkoutUrl, id } } or similar structure
    const data = result.data || result;
    const checkoutUrl = data.checkoutUrl || data.checkout_url || data.url;
    const sessionId = data.id || data.sessionId || data.session_id || randomUUID();

    if (!checkoutUrl) {
      console.error('Waffo checkout response missing checkoutUrl:', result);
      throw new Error('Waffo checkout response missing checkoutUrl');
    }

    return { checkoutUrl, sessionId };
  }

  /**
   * Create a checkout session for a plan
   */
  public async createCheckout(
    params: CreateCheckoutParams
  ): Promise<CheckoutResult> {
    const {
      planId,
      priceId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata,
    } = params;

    try {
      const plan = findPlanByPlanId(planId);
      if (!plan) {
        throw new Error(`Plan with ID ${planId} not found`);
      }

      const productId = this.getWaffoProductId(planId, priceId);
      const productType = this.getProductType(planId, priceId);

      const customMetadata = {
        ...metadata,
        planId,
        priceId,
      };

      const result = await this.createWaffoCheckoutSession({
        productId,
        productType,
        customerEmail,
        successUrl,
        cancelUrl,
        metadata: customMetadata,
      });

      return {
        url: result.checkoutUrl,
        id: result.sessionId,
      };
    } catch (error) {
      console.error('Waffo createCheckout error:', error);
      throw new Error('Failed to create Waffo checkout session');
    }
  }

  /**
   * Create a checkout session for a credit package
   */
  public async createCreditCheckout(
    params: CreateCreditCheckoutParams
  ): Promise<CheckoutResult> {
    const {
      packageId,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata,
    } = params;

    try {
      const creditPackage = getCreditPackageById(packageId);
      if (!creditPackage) {
        throw new Error(`Credit package with ID ${packageId} not found`);
      }

      const productId = this.getWaffoCreditProductId(packageId);

      const customMetadata = {
        ...metadata,
        packageId,
        type: 'credit_purchase',
        credits: String(creditPackage.amount),
      };

      const result = await this.createWaffoCheckoutSession({
        productId,
        productType: 'onetime',
        customerEmail,
        successUrl,
        cancelUrl,
        metadata: customMetadata,
      });

      return {
        url: result.checkoutUrl,
        id: result.sessionId,
      };
    } catch (error) {
      console.error('Waffo createCreditCheckout error:', error);
      throw new Error('Failed to create Waffo credit checkout session');
    }
  }

  /**
   * Create a customer portal session
   * Waffo doesn't have a direct equivalent of Stripe's billing portal,
   * so we return the Waffo dashboard URL where customers can manage subscriptions
   */
  public async createCustomerPortal(
    params: CreatePortalParams
  ): Promise<PortalResult> {
    // Waffo manages subscriptions through their hosted dashboard
    // Return the customer portal URL
    const portalUrl = `https://pancake.waffo.ai/customer/portal?merchant=${this.merchantId}`;

    return {
      url: portalUrl,
    };
  }

  /**
   * Verify Waffo webhook signature
   * Waffo uses HMAC-SHA256 signature verification (similar to Stripe)
   */
  private verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    try {
      const crypto = require('crypto') as typeof import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      // Compare signatures (timing-safe comparison)
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle webhook event from Waffo
   */
  public async handleWebhookEvent(
    payload: string,
    signature: string
  ): Promise<void> {
    try {
      // Verify signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload);
      const eventType = event.type || event.eventType || event.event;
      console.log(`Waffo webhook event: ${eventType}`);

      const data = event.data || event.payload || event;

      // Handle different event types
      switch (eventType) {
        case 'checkout.completed':
        case 'checkout.session.completed':
          await this.onCheckoutCompleted(data);
          break;
        case 'payment.succeeded':
        case 'payment.paid':
          await this.onPaymentSucceeded(data);
          break;
        case 'subscription.created':
          await this.onSubscriptionCreated(data);
          break;
        case 'subscription.updated':
        case 'subscription.renewed':
          await this.onSubscriptionUpdated(data);
          break;
        case 'subscription.canceled':
        case 'subscription.deleted':
          await this.onSubscriptionCanceled(data);
          break;
        default:
          console.log(`Unhandled Waffo webhook event: ${eventType}`);
      }
    } catch (error) {
      console.error('Waffo handleWebhookEvent error:', error);
      throw error;
    }
  }

  /**
   * Handle checkout completion - create payment record
   */
  private async onCheckoutCompleted(data: any): Promise<void> {
    console.log('>> Waffo checkout completed:', data.id || data.sessionId);

    const metadata = data.metadata || {};
    const userId = metadata.userId;
    if (!userId) {
      console.warn('<< No userId in checkout metadata');
      return;
    }

    const planId = metadata.planId;
    const priceId = metadata.priceId;
    const packageId = metadata.packageId;
    const isCreditPurchase = metadata.type === 'credit_purchase';

    const currentDate = new Date();
    const sessionId = data.id || data.sessionId || randomUUID();
    const customerId = data.customerId || data.customer_id || '';
    const invoiceId = data.orderId || data.order_id || data.id || '';

    // Determine payment type and scene
    let paymentType: PaymentTypes;
    let scene: PaymentScenes;

    if (isCreditPurchase) {
      paymentType = PaymentTypes.ONE_TIME;
      scene = PaymentScenes.CREDIT;
    } else if (planId === 'lifetime') {
      paymentType = PaymentTypes.ONE_TIME;
      scene = PaymentScenes.LIFETIME;
    } else {
      paymentType = PaymentTypes.SUBSCRIPTION;
      scene = PaymentScenes.SUBSCRIPTION;
    }

    const db = await getDb();

    try {
      await db.insert(payment).values({
        id: randomUUID(),
        priceId: priceId || '',
        type: paymentType,
        scene,
        userId,
        customerId,
        subscriptionId: data.subscriptionId || data.subscription_id || null,
        sessionId,
        invoiceId,
        paid: false, // Will be set to true on payment.succeeded
        status: 'processing',
        createdAt: currentDate,
        updatedAt: currentDate,
      });

      console.log('<< Created payment record from Waffo checkout');
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('unique constraint')
      ) {
        console.log('<< Payment record already exists, skipping');
        return;
      }
      throw error;
    }
  }

  /**
   * Handle successful payment - mark as paid and process benefits
   */
  private async onPaymentSucceeded(data: any): Promise<void> {
    console.log('>> Waffo payment succeeded:', data.id || data.orderId);

    const db = await getDb();
    const invoiceId = data.id || data.orderId || data.order_id;
    const subscriptionId = data.subscriptionId || data.subscription_id;

    // Find payment record
    let paymentRecord: Payment | null = null;

    if (invoiceId) {
      const results = await db
        .select()
        .from(payment)
        .where(eq(payment.invoiceId, invoiceId))
        .orderBy(desc(payment.createdAt))
        .limit(1);
      if (results.length > 0) paymentRecord = results[0];
    }

    if (!paymentRecord && subscriptionId) {
      const results = await db
        .select()
        .from(payment)
        .where(eq(payment.subscriptionId, subscriptionId))
        .orderBy(desc(payment.createdAt))
        .limit(1);
      if (results.length > 0) paymentRecord = results[0];
    }

    if (!paymentRecord) {
      console.warn('<< No payment record found for Waffo payment:', invoiceId);
      return;
    }

    const isSubscription = paymentRecord.type === PaymentTypes.SUBSCRIPTION;

    if (isSubscription) {
      // Update subscription payment
      await db
        .update(payment)
        .set({
          paid: true,
          status: 'active',
          periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
          periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Add subscription credits
      if (websiteConfig.credits?.enableCredits && paymentRecord.priceId) {
        await addSubscriptionCredits(paymentRecord.userId, paymentRecord.priceId);
        console.log('Added subscription credits for user:', paymentRecord.userId);
      }
    } else {
      // One-time payment
      await db
        .update(payment)
        .set({
          paid: true,
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id));

      // Process benefits
      if (paymentRecord.sessionId) {
        // Check if it's a credit purchase or lifetime
        if (paymentRecord.scene === PaymentScenes.CREDIT) {
          await this.processCreditPurchase(data, paymentRecord);
        } else if (paymentRecord.scene === PaymentScenes.LIFETIME) {
          await this.processLifetimePurchase(data, paymentRecord);
        }
      }
    }

    console.log('<< Waffo payment succeeded processed');
  }

  /**
   * Process credit purchase benefits
   */
  private async processCreditPurchase(
    data: any,
    paymentRecord: Payment
  ): Promise<void> {
    console.log('>> Process Waffo credit purchase');

    // Get credit amount from payment record or data
    const db = await getDb();
    const sessionRecord = await db
      .select()
      .from(payment)
      .where(eq(payment.id, paymentRecord.id))
      .limit(1);

    // Try to get credits amount from metadata stored in session
    // Since we stored it in metadata during checkout, we need to retrieve it
    // For now, use the packageId to look up credits
    const packageId = (paymentRecord as any).metadata?.packageId;
    if (!packageId) {
      console.warn('<< No packageId found for credit purchase');
      return;
    }

    const creditPackage = getCreditPackageById(packageId);
    if (!creditPackage) {
      console.warn('<< Credit package not found:', packageId);
      return;
    }

    const amount = data.amountPaid ? data.amountPaid / 100 : 0;
    await addCredits({
      userId: paymentRecord.userId,
      amount: creditPackage.amount,
      type: CREDIT_TRANSACTION_TYPE.PURCHASE_PACKAGE,
      description: `+${creditPackage.amount} credits for package ${packageId} ($${amount.toLocaleString()})`,
      paymentId: data.id || data.orderId || '',
      expireDays: creditPackage.expireDays,
    });

    console.log('<< Process Waffo credit purchase success');
  }

  /**
   * Process lifetime plan purchase benefits
   */
  private async processLifetimePurchase(
    data: any,
    paymentRecord: Payment
  ): Promise<void> {
    console.log('>> Process Waffo lifetime purchase');

    if (websiteConfig.credits?.enableCredits && paymentRecord.priceId) {
      await addLifetimeMonthlyCredits(paymentRecord.userId, paymentRecord.priceId);
      console.log('Added lifetime credits for user:', paymentRecord.userId);
    }

    const amount = data.amountPaid ? data.amountPaid / 100 : 0;
    await sendNotification(
      data.id || data.orderId || '',
      paymentRecord.customerId,
      paymentRecord.userId,
      amount
    );

    console.log('<< Process Waffo lifetime purchase success');
  }

  /**
   * Handle subscription creation
   */
  private async onSubscriptionCreated(data: any): Promise<void> {
    console.log('>> Waffo subscription created:', data.id || data.subscriptionId);
    // Payment record is created in checkout.completed handler
  }

  /**
   * Handle subscription update/renewal
   */
  private async onSubscriptionUpdated(data: any): Promise<void> {
    console.log('>> Waffo subscription updated:', data.id || data.subscriptionId);

    const subscriptionId = data.id || data.subscriptionId || data.subscription_id;
    if (!subscriptionId) return;

    const db = await getDb();
    const status = this.mapSubscriptionStatus(data.status);

    await db
      .update(payment)
      .set({
        status,
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
        updatedAt: new Date(),
      })
      .where(eq(payment.subscriptionId, subscriptionId));

    console.log('<< Updated subscription payment record');
  }

  /**
   * Handle subscription cancellation
   */
  private async onSubscriptionCanceled(data: any): Promise<void> {
    console.log('>> Waffo subscription canceled:', data.id || data.subscriptionId);

    const subscriptionId = data.id || data.subscriptionId || data.subscription_id;
    if (!subscriptionId) return;

    const db = await getDb();
    await db
      .update(payment)
      .set({
        status: 'canceled',
        updatedAt: new Date(),
      })
      .where(eq(payment.subscriptionId, subscriptionId));

    console.log('<< Marked subscription as canceled');
  }

  /**
   * Map Waffo subscription status to our PaymentStatus
   */
  private mapSubscriptionStatus(status: string | undefined): string {
    if (!status) return 'active';
    const statusMap: Record<string, string> = {
      active: 'active',
      canceled: 'canceled',
      cancelled: 'canceled',
      past_due: 'past_due',
      trialing: 'trialing',
      paused: 'paused',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
    };
    return statusMap[status.toLowerCase()] || 'active';
  }
}
