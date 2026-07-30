import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { BillingProvider, BillingSubscriptionStatus } from "@prisma/client";
import { BillingProviderValidationError } from "./billing-provider.errors";
import type {
  BillingCheckoutRequest,
  BillingCheckoutSession,
  BillingCustomerPortalRequest,
  BillingCustomerPortalSession,
  BillingInvoiceMetadata,
  BillingProviderReadiness,
  BillingSubscriptionSnapshot,
  BillingWebhookVerificationInput,
  LedgerByteBillingProvider,
  NormalizedBillingWebhookEvent,
} from "./billing-provider.types";
import { BILLING_WEBHOOK_EVENT_TYPES } from "./billing-provider.types";

interface FakeWebhookPayload {
  id: string;
  type: string;
  created?: string;
  customer?: string;
  subscription?: string;
  invoice?: string;
}

/** Deterministic, memory-only local provider. It never performs network I/O. */
@Injectable()
export class FakeBillingProvider implements LedgerByteBillingProvider {
  readonly provider = BillingProvider.FAKE;
  private readonly subscriptions = new Map<string, BillingSubscriptionSnapshot>();

  constructor(private readonly webhookSigningKey = "ledgerbyte-fake-billing-local-only") {}

  readiness(): BillingProviderReadiness {
    return {
      provider: this.provider,
      status: "READY_FOR_LOCAL_PROOF",
      merchantEligibility: "NOT_ASSESSED",
      networkEnabled: false,
      checkoutEnabled: false,
      portalEnabled: false,
      webhookIngressEnabled: false,
      warnings: ["Fake billing is deterministic, memory-only, and local/test-only."],
    };
  }

  async createCheckoutSession(input: BillingCheckoutRequest): Promise<BillingCheckoutSession> {
    const reference = `fake_checkout_${digest(`${input.organizationId}:${input.idempotencyKey}`)}`;
    return { provider: this.provider, providerSessionReference: reference, redirectUrl: `https://billing.local.invalid/checkout/${reference}`, networkCallPerformed: false };
  }

  async createCustomerPortalSession(input: BillingCustomerPortalRequest): Promise<BillingCustomerPortalSession> {
    const reference = `fake_portal_${digest(`${input.organizationId}:${input.customerReference}`)}`;
    return { provider: this.provider, providerSessionReference: reference, redirectUrl: `https://billing.local.invalid/portal/${reference}`, networkCallPerformed: false };
  }

  async retrieveSubscription(reference: string): Promise<BillingSubscriptionSnapshot | null> {
    return this.subscriptions.get(reference) ?? null;
  }

  async cancelAtPeriodEnd(reference: string): Promise<BillingSubscriptionSnapshot> {
    const existing = this.requireSubscription(reference);
    const updated = { ...existing, status: BillingSubscriptionStatus.CANCEL_AT_PERIOD_END, cancelAtPeriodEnd: true, providerUpdatedAt: new Date() };
    this.subscriptions.set(reference, updated);
    return updated;
  }

  async reactivateSubscription(reference: string): Promise<BillingSubscriptionSnapshot> {
    const existing = this.requireSubscription(reference);
    const updated = { ...existing, status: BillingSubscriptionStatus.ACTIVE, cancelAtPeriodEnd: false, providerUpdatedAt: new Date() };
    this.subscriptions.set(reference, updated);
    return updated;
  }

  async schedulePlanChange(input: { providerSubscriptionReference: string; priceReference: string; effectiveAt: Date }): Promise<BillingSubscriptionSnapshot> {
    if (Number.isNaN(input.effectiveAt.getTime()) || input.effectiveAt <= new Date()) throw new BillingProviderValidationError("LOCAL_ONLY", "A future local plan-change time is required.");
    const existing = this.requireSubscription(input.providerSubscriptionReference);
    const updated = { ...existing, providerUpdatedAt: new Date() };
    this.subscriptions.set(input.providerSubscriptionReference, updated);
    return updated;
  }

  async listInvoiceMetadata(_reference: string): Promise<BillingInvoiceMetadata[]> { return []; }

  async verifyWebhook(input: BillingWebhookVerificationInput): Promise<boolean> {
    if (!input.signature) return false;
    const expected = Buffer.from(this.signWebhook(input.rawBody));
    const actual = Buffer.from(input.signature);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  normalizeWebhookEvent(rawBody: Buffer): NormalizedBillingWebhookEvent {
    let parsed: FakeWebhookPayload;
    try {
      parsed = JSON.parse(rawBody.toString("utf8")) as FakeWebhookPayload;
    } catch {
      throw new BillingProviderValidationError("INVALID_WEBHOOK", "Fake billing webhook payload is not valid JSON.");
    }
    if (!parsed.id || !parsed.type || !BILLING_WEBHOOK_EVENT_TYPES.includes(parsed.type as (typeof BILLING_WEBHOOK_EVENT_TYPES)[number])) {
      throw new BillingProviderValidationError("UNSUPPORTED_EVENT", "Fake billing webhook event is not supported.");
    }
    const created = parsed.created ? new Date(parsed.created) : null;
    if (created && Number.isNaN(created.getTime())) throw new BillingProviderValidationError("INVALID_WEBHOOK", "Fake billing webhook created time is invalid.");
    return {
      provider: this.provider,
      providerEventId: bounded(parsed.id),
      eventType: parsed.type as (typeof BILLING_WEBHOOK_EVENT_TYPES)[number],
      providerCreatedAt: created,
      providerCustomerReference: optionalBounded(parsed.customer),
      providerSubscriptionReference: optionalBounded(parsed.subscription),
      providerInvoiceReference: optionalBounded(parsed.invoice),
    };
  }

  async reconcileSubscription(reference: string): Promise<BillingSubscriptionSnapshot | null> {
    return this.retrieveSubscription(reference);
  }

  signWebhook(rawBody: Buffer): string {
    return createHmac("sha256", this.webhookSigningKey).update(rawBody).digest("hex");
  }

  seedSubscription(snapshot: Omit<BillingSubscriptionSnapshot, "provider">): BillingSubscriptionSnapshot {
    const seeded = { ...snapshot, provider: this.provider };
    this.subscriptions.set(seeded.providerSubscriptionReference, seeded);
    return seeded;
  }

  private requireSubscription(reference: string): BillingSubscriptionSnapshot {
    const subscription = this.subscriptions.get(reference);
    if (!subscription) throw new BillingProviderValidationError("UNKNOWN_SUBSCRIPTION", "Fake subscription does not exist.");
    return subscription;
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function bounded(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) throw new BillingProviderValidationError("INVALID_WEBHOOK", "Fake billing webhook reference is invalid.");
  return normalized;
}

function optionalBounded(value: string | undefined): string | null {
  return value ? bounded(value) : null;
}
