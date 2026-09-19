import { BillingProvider, BillingSubscriptionStatus } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { BillingProviderDisabledError, BillingProviderValidationError } from "./billing-provider.errors";
import type { BillingCheckoutInspection, BillingCheckoutRequest, BillingCustomerPortalRequest, BillingInvoiceMetadata, BillingProviderReadiness, BillingSubscriptionSnapshot, BillingWebhookVerificationInput, LedgerByteBillingProvider, NormalizedBillingWebhookEvent } from "./billing-provider.types";
import { BILLING_WEBHOOK_EVENT_TYPES } from "./billing-provider.types";

export interface StripeWebhookSignatureVerifier { verify(rawBody: Buffer, signature: string | undefined): Promise<boolean>; }

/** Only synthetic TEST mode exists. No configuration value can enable live keys. */
export class StripeBillingProvider implements LedgerByteBillingProvider {
  readonly provider = BillingProvider.STRIPE;
  private sdk?: Stripe;
  constructor(private readonly signatureVerifier?: StripeWebhookSignatureVerifier, private readonly config?: ConfigService, private readonly injectedSdk?: Stripe) {}

  readiness(): BillingProviderReadiness {
    const enabled = this.enabled();
    return { provider: this.provider, status: enabled ? "READY_FOR_TEST" : "IMPLEMENTED_DISABLED", merchantEligibility: "PENDING_OWNER_EVIDENCE", networkEnabled: enabled, checkoutEnabled: enabled, portalEnabled: enabled, webhookIngressEnabled: enabled && Boolean(this.config?.get<string>("BILLING_STRIPE_WEBHOOK_SECRET")?.startsWith("whsec_")), warnings: ["Stripe live collection is disabled. UAE seller identity, tax treatment and hosted test proof remain launch requirements."] };
  }

  async ensureCustomer(input: { billingAccountId: string; organizationId: string }) {
    return this.execute(async (stripe) => {
      const customer = await stripe.customers.create({ metadata: { ledgerbyte_billing_account: input.billingAccountId, ledgerbyte_organization: input.organizationId } }, { idempotencyKey: `ledgerbyte-customer:${input.billingAccountId}` });
      this.assertTest(customer);
      return customer.id;
    });
  }

  async createCheckoutSession(input: BillingCheckoutRequest) {
    return this.execute(async (stripe) => {
      const price = await stripe.prices.retrieve(input.priceReference);
      this.assertTest(price);
      if (input.expectedAmountMinor !== undefined && price.unit_amount !== input.expectedAmountMinor) throw this.invalid();
      if (!price.active || price.currency !== "sar" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || ![14900, 29900].includes(price.unit_amount ?? -1)) throw this.invalid();
      const session = await stripe.checkout.sessions.create({
        mode: "subscription", customer: input.customerReference,
        line_items: [{ price: price.id, quantity: 1 }],
        client_reference_id: input.subscriptionId,
        metadata: { ledgerbyte_checkout_attempt: input.checkoutAttemptId ?? "" },
        subscription_data: { metadata: { ledgerbyte_subscription: input.subscriptionId ?? "", ledgerbyte_organization: input.organizationId } },
        success_url: `${this.webOrigin()}/settings/billing?checkout=returned`,
        cancel_url: `${this.webOrigin()}/${input.returnRouteKey === "plans" ? "plans" : "settings/billing"}`,
        integration_identifier: "ledgerbyte-saas-qxrmzvna",
      }, { idempotencyKey: input.idempotencyKey });
      this.assertTest(session);
      if (!session.url || new URL(session.url).hostname !== "checkout.stripe.com") throw this.invalid();
      return { provider: this.provider, providerSessionReference: session.id, redirectUrl: session.url, networkCallPerformed: true };
    });
  }

  async inspectCheckoutSession(sessionReference: string, expectedCustomer: string, expectedLocalSubscription: string): Promise<BillingCheckoutInspection> {
    return this.execute(async (stripe) => {
      const session = await stripe.checkout.sessions.retrieve(sessionReference, { expand: ["subscription.latest_invoice"] });
      this.assertTest(session);
      if (reference(session.customer) !== expectedCustomer || session.client_reference_id !== expectedLocalSubscription || !session.status) throw this.invalid();
      if (!["open", "complete", "expired"].includes(session.status)) throw this.invalid();
      const status: BillingCheckoutInspection["status"] = session.status === "open" ? "open" : session.status === "complete" ? "complete" : "expired";
      const subscription = typeof session.subscription === "object" ? session.subscription : null;
      if (subscription && subscription.metadata.ledgerbyte_subscription !== expectedLocalSubscription) throw this.invalid();
      const invoice = subscription && typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
      const safeToRetry = (session.status === "expired" && !session.subscription) || (subscription?.status === "incomplete_expired" && invoice?.status === "void" && invoice.amount_paid === 0 && session.payment_status === "unpaid");
      const redirectUrl = session.status === "open" ? session.url : null;
      if (redirectUrl && new URL(redirectUrl).hostname !== "checkout.stripe.com") throw this.invalid();
      return { providerSessionReference: session.id, status, redirectUrl, safeToRetry, subscription: subscription ? this.snapshot(subscription) : null };
    });
  }

  async createCustomerPortalSession(input: BillingCustomerPortalRequest) {
    return this.execute(async (stripe) => {
      const configuration = this.config?.get<string>("BILLING_STRIPE_PORTAL_CONFIGURATION")?.trim();
      if (!configuration) throw this.invalid();
      const policy = await stripe.billingPortal.configurations.retrieve(configuration);
      if (policy.features.subscription_update.enabled || (policy.features.subscription_cancel.enabled && policy.features.subscription_cancel.mode !== "at_period_end")) throw this.invalid();
      const session = await stripe.billingPortal.sessions.create({ customer: input.customerReference, configuration, return_url: `${this.webOrigin()}/settings/billing` });
      if (new URL(session.url).hostname !== "billing.stripe.com") throw this.invalid();
      return { provider: this.provider, providerSessionReference: session.id, redirectUrl: session.url, networkCallPerformed: true };
    });
  }

  async retrieveSubscription(reference: string) { return this.execute(async (stripe) => this.snapshot(await stripe.subscriptions.retrieve(reference, { expand: ["latest_invoice"] }))); }
  async reconcileSubscription(reference: string) { return this.retrieveSubscription(reference); }
  async cancelAtPeriodEnd(reference: string) { return this.execute(async (stripe) => this.snapshot(await stripe.subscriptions.update(reference, { cancel_at_period_end: true }))); }
  async reactivateSubscription(reference: string) { return this.execute(async (stripe) => this.snapshot(await stripe.subscriptions.update(reference, { cancel_at_period_end: false }))); }
  async schedulePlanChange(input: { providerSubscriptionReference: string; priceReference: string; effectiveAt: Date }) {
    return this.execute(async (stripe) => {
      const subscription = await stripe.subscriptions.retrieve(input.providerSubscriptionReference);
      this.assertTest(subscription);
      const item = subscription.items.data[0];
      if (!item || subscription.items.data.length !== 1 || item.quantity !== 1) throw this.invalid();
      const price = await stripe.prices.retrieve(input.priceReference);
      this.assertTest(price);
      if (price.currency !== "sar" || price.recurring?.interval !== "month" || price.recurring.interval_count !== 1 || !price.active || ![14900, 29900].includes(price.unit_amount ?? -1)) throw this.invalid();
      if ((price.unit_amount ?? 0) > (item.price.unit_amount ?? 0)) {
        return this.snapshot(await stripe.subscriptions.update(subscription.id, { items: [{ id: item.id, price: price.id }], payment_behavior: "pending_if_incomplete", proration_behavior: "always_invoice" }, { idempotencyKey: `upgrade:${subscription.id}:${price.id}:${item.current_period_end}` }));
      }
      const schedule = subscription.schedule ? await stripe.subscriptionSchedules.retrieve(typeof subscription.schedule === "string" ? subscription.schedule : subscription.schedule.id) : await stripe.subscriptionSchedules.create({ from_subscription: subscription.id }, { idempotencyKey: `schedule:${subscription.id}:${item.current_period_end}` });
      await stripe.subscriptionSchedules.update(schedule.id, { end_behavior: "release", phases: [
        { start_date: item.current_period_start, end_date: item.current_period_end, items: [{ price: item.price.id, quantity: 1 }], proration_behavior: "none" },
        { items: [{ price: price.id, quantity: 1 }], proration_behavior: "none" },
      ] }, { idempotencyKey: `downgrade:${subscription.id}:${price.id}:${item.current_period_end}` });
      return this.snapshot(subscription);
    });
  }

  async listInvoiceMetadata(reference: string): Promise<BillingInvoiceMetadata[]> {
    return this.execute(async (stripe) => {
      const invoices = await stripe.invoices.list({ subscription: reference, limit: 24 });
      return invoices.data.map((invoice): BillingInvoiceMetadata => { this.assertTest(invoice); return { providerInvoiceReference: invoice.id, status: invoice.status === "paid" ? "PAID" : invoice.status === "void" ? "VOID" : invoice.status === "uncollectible" ? "UNCOLLECTIBLE" : "OPEN", currency: invoice.currency, amountDueMinor: BigInt(invoice.amount_due), amountPaidMinor: BigInt(invoice.amount_paid), dueAt: date(invoice.due_date), paidAt: date(invoice.status_transitions.paid_at) }; });
    });
  }

  async verifyWebhook(input: BillingWebhookVerificationInput) {
    if (this.signatureVerifier) return this.signatureVerifier.verify(input.rawBody, input.signature);
    if (input.environment !== "TEST" || !this.readiness().webhookIngressEnabled || !input.signature) return false;
    try { const event = this.client().webhooks.constructEvent(input.rawBody, input.signature, this.config!.get<string>("BILLING_STRIPE_WEBHOOK_SECRET")!); return event.livemode === false; } catch { return false; }
  }

  normalizeWebhookEvent(rawBody: Buffer): NormalizedBillingWebhookEvent {
    let parsed: { id?: unknown; type?: unknown; created?: unknown; data?: { object?: Record<string, unknown> } };
    try { parsed = JSON.parse(rawBody.toString("utf8")) as typeof parsed; } catch { throw this.invalid(); }
    if (typeof parsed.id !== "string" || typeof parsed.type !== "string" || !BILLING_WEBHOOK_EVENT_TYPES.includes(parsed.type as (typeof BILLING_WEBHOOK_EVENT_TYPES)[number])) throw this.invalid();
    const object = parsed.data?.object ?? {};
    const parent = object.parent as { subscription_details?: { subscription?: unknown } } | undefined;
    return { provider: this.provider, providerEventId: bounded(parsed.id), eventType: parsed.type as (typeof BILLING_WEBHOOK_EVENT_TYPES)[number], providerCreatedAt: typeof parsed.created === "number" ? date(parsed.created) : null, providerCustomerReference: reference(object.customer), providerSubscriptionReference: reference(object.subscription) ?? reference(parent?.subscription_details?.subscription) ?? (typeof object.id === "string" && object.id.startsWith("sub_") ? object.id : null), providerInvoiceReference: typeof object.id === "string" && object.id.startsWith("in_") ? object.id : reference(object.invoice) };
  }

  private snapshot(subscription: Stripe.Subscription): BillingSubscriptionSnapshot {
    this.assertTest(subscription);
    const item = subscription.items.data[0];
    if (!item || subscription.items.data.length !== 1 || item.quantity !== 1 || item.price.currency !== "sar" || item.price.recurring?.interval !== "month" || item.price.recurring.interval_count !== 1) throw this.invalid();
    const states: Record<string, BillingSubscriptionStatus> = { active: "ACTIVE", trialing: "TRIALING", past_due: "GRACE", unpaid: "SUSPENDED", canceled: "CANCELED", incomplete: "PENDING", incomplete_expired: "CANCELED", paused: "SUSPENDED" };
    const status = subscription.cancel_at_period_end && subscription.status === "active" ? "CANCEL_AT_PERIOD_END" : states[subscription.status];
    if (!status) throw this.invalid();
    const invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    const graceStartedAt = invoice?.created ?? item.current_period_start;
    return { provider: this.provider, providerCustomerReference: reference(subscription.customer)!, providerSubscriptionReference: subscription.id, status, interval: "MONTH", providerUpdatedAt: new Date(), currentPeriodStartedAt: date(item.current_period_start), currentPeriodEndsAt: date(item.current_period_end), graceDeadline: status === "GRACE" ? new Date(graceStartedAt * 1000 + 7 * 86400000) : null, cancelAtPeriodEnd: subscription.cancel_at_period_end, providerPriceReference: item.price.id, localSubscriptionId: subscription.metadata.ledgerbyte_subscription, trialEndsAt: date(subscription.trial_end), initialPaymentIncomplete: ["incomplete", "incomplete_expired"].includes(subscription.status) };
  }
  private enabled() { return this.config?.get("LEDGERBYTE_STRIPE_TEST_MODE_ENABLED") === "true" && /^(sk|rk)_test_/.test(this.config?.get<string>("BILLING_STRIPE_SECRET_KEY") ?? ""); }
  private client() { if (!this.enabled()) throw new BillingProviderDisabledError("Stripe test execution is disabled; live keys are never accepted."); return this.injectedSdk ?? (this.sdk ??= new Stripe(this.config!.get<string>("BILLING_STRIPE_SECRET_KEY")!, { maxNetworkRetries: 0, timeout: 15000, telemetry: false })); }
  private async execute<T>(action: (stripe: Stripe) => Promise<T>): Promise<T> { const client = this.client(); try { return await action(client); } catch { throw new BillingProviderValidationError("INVALID_WEBHOOK", "Stripe test operation did not complete. Reconcile status before retrying."); } }
  private webOrigin() { const url = new URL(this.config?.get<string>("APP_WEB_URL") ?? ""); if (url.username || url.password || (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))) throw this.invalid(); return url.origin; }
  private assertTest(object: { livemode?: boolean }) { if (object.livemode !== false) throw this.invalid(); }
  private invalid() { return new BillingProviderValidationError("INVALID_WEBHOOK", "Stripe test response or configuration is invalid."); }
}
function bounded(value: string) { const result = value.trim(); if (!result || result.length > 255) throw new BillingProviderValidationError("INVALID_WEBHOOK", "Invalid provider reference."); return result; }
function reference(value: unknown): string | null { return typeof value === "string" ? bounded(value) : value && typeof value === "object" && "id" in value && typeof value.id === "string" ? bounded(value.id) : null; }
function date(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null; }
