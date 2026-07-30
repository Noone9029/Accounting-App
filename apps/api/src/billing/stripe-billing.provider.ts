import { BillingProvider } from "@prisma/client";
import { BillingProviderDisabledError, BillingProviderValidationError } from "./billing-provider.errors";
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

/**
 * The adapter is deliberately transport-injected. No Stripe SDK, credential,
 * HTTP client, or network-enable switch is introduced until LedgerByte's
 * merchant eligibility and test-mode execution packet are owner-approved.
 */
export interface StripeWebhookSignatureVerifier {
  verify(rawBody: Buffer, signature: string | undefined): Promise<boolean>;
}

export class StripeBillingProvider implements LedgerByteBillingProvider {
  readonly provider = BillingProvider.STRIPE;

  constructor(private readonly signatureVerifier?: StripeWebhookSignatureVerifier) {}

  readiness(): BillingProviderReadiness {
    return {
      provider: this.provider,
      status: "IMPLEMENTED_DISABLED",
      merchantEligibility: "PENDING_OWNER_EVIDENCE",
      networkEnabled: false,
      checkoutEnabled: false,
      portalEnabled: false,
      webhookIngressEnabled: false,
      warnings: [
        "Stripe merchant eligibility has not been confirmed for LedgerByte's legal entity.",
        "The Stripe adapter is architecture-only and cannot issue network requests in this ARC.",
        "A separately approved Stripe test-mode execution packet is required before provider execution.",
      ],
    };
  }

  async createCheckoutSession(_input: BillingCheckoutRequest): Promise<BillingCheckoutSession> { throw this.disabled(); }
  async createCustomerPortalSession(_input: BillingCustomerPortalRequest): Promise<BillingCustomerPortalSession> { throw this.disabled(); }
  async retrieveSubscription(_reference: string): Promise<BillingSubscriptionSnapshot | null> { throw this.disabled(); }
  async cancelAtPeriodEnd(_reference: string): Promise<BillingSubscriptionSnapshot> { throw this.disabled(); }
  async reactivateSubscription(_reference: string): Promise<BillingSubscriptionSnapshot> { throw this.disabled(); }
  async schedulePlanChange(_input: { providerSubscriptionReference: string; priceReference: string; effectiveAt: Date }): Promise<BillingSubscriptionSnapshot> { throw this.disabled(); }
  async listInvoiceMetadata(_reference: string): Promise<BillingInvoiceMetadata[]> { throw this.disabled(); }

  async verifyWebhook(input: BillingWebhookVerificationInput): Promise<boolean> {
    if (!this.signatureVerifier) return false;
    return this.signatureVerifier.verify(input.rawBody, input.signature);
  }

  normalizeWebhookEvent(rawBody: Buffer): NormalizedBillingWebhookEvent {
    let parsed: { id?: unknown; type?: unknown; created?: unknown; data?: { object?: Record<string, unknown> } };
    try {
      parsed = JSON.parse(rawBody.toString("utf8")) as typeof parsed;
    } catch {
      throw new BillingProviderValidationError("INVALID_WEBHOOK", "Stripe webhook payload is not valid JSON.");
    }
    if (typeof parsed.id !== "string" || typeof parsed.type !== "string" || !BILLING_WEBHOOK_EVENT_TYPES.includes(parsed.type as (typeof BILLING_WEBHOOK_EVENT_TYPES)[number])) {
      throw new BillingProviderValidationError("UNSUPPORTED_EVENT", "Stripe webhook event is not supported.");
    }
    const object = parsed.data?.object ?? {};
    const created = typeof parsed.created === "number" ? new Date(parsed.created * 1000) : null;
    if (created && Number.isNaN(created.getTime())) throw new BillingProviderValidationError("INVALID_WEBHOOK", "Stripe webhook created time is invalid.");
    return {
      provider: this.provider,
      providerEventId: bounded(parsed.id),
      eventType: parsed.type as (typeof BILLING_WEBHOOK_EVENT_TYPES)[number],
      providerCreatedAt: created,
      providerCustomerReference: stringField(object.customer),
      providerSubscriptionReference: stringField(object.subscription) ?? stringField(object.id, "sub_"),
      providerInvoiceReference: stringField(object.id, "in_") ?? stringField(object.invoice),
    };
  }

  async reconcileSubscription(_reference: string): Promise<BillingSubscriptionSnapshot | null> { throw this.disabled(); }

  private disabled() {
    return new BillingProviderDisabledError("Stripe Billing execution is disabled pending merchant eligibility and explicit test-mode approval.");
  }
}

function bounded(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) throw new BillingProviderValidationError("INVALID_WEBHOOK", "Stripe webhook reference is invalid.");
  return normalized;
}

function stringField(value: unknown, requiredPrefix?: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = bounded(value);
  return requiredPrefix && !normalized.startsWith(requiredPrefix) ? null : normalized;
}
