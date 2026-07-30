import { BillingProvider } from "@prisma/client";
import { BillingProviderDisabledError } from "./billing-provider.errors";
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

export class DisabledBillingProvider implements LedgerByteBillingProvider {
  readonly provider = BillingProvider.DISABLED;

  readiness(): BillingProviderReadiness {
    return {
      provider: this.provider,
      status: "DISABLED",
      merchantEligibility: "NOT_ASSESSED",
      networkEnabled: false,
      checkoutEnabled: false,
      portalEnabled: false,
      webhookIngressEnabled: false,
      warnings: ["LedgerByte subscription billing is disabled by default."],
    };
  }

  async createCheckoutSession(_input: BillingCheckoutRequest): Promise<BillingCheckoutSession> { throw new BillingProviderDisabledError(); }
  async createCustomerPortalSession(_input: BillingCustomerPortalRequest): Promise<BillingCustomerPortalSession> { throw new BillingProviderDisabledError(); }
  async retrieveSubscription(_reference: string): Promise<BillingSubscriptionSnapshot | null> { return null; }
  async cancelAtPeriodEnd(_reference: string): Promise<BillingSubscriptionSnapshot> { throw new BillingProviderDisabledError(); }
  async reactivateSubscription(_reference: string): Promise<BillingSubscriptionSnapshot> { throw new BillingProviderDisabledError(); }
  async schedulePlanChange(_input: { providerSubscriptionReference: string; priceReference: string; effectiveAt: Date }): Promise<BillingSubscriptionSnapshot> { throw new BillingProviderDisabledError(); }
  async listInvoiceMetadata(_reference: string): Promise<BillingInvoiceMetadata[]> { return []; }
  async verifyWebhook(_input: BillingWebhookVerificationInput): Promise<boolean> { return false; }
  normalizeWebhookEvent(_rawBody: Buffer): NormalizedBillingWebhookEvent { throw new BillingProviderDisabledError(); }
  async reconcileSubscription(_reference: string): Promise<BillingSubscriptionSnapshot | null> { return null; }
}
