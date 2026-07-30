import { BillingPriceInterval, BillingProvider, BillingProviderEnvironment, BillingSubscriptionStatus } from "@prisma/client";

export const BILLING_WEBHOOK_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "customer.subscription.trial_will_end",
] as const;

export type BillingWebhookEventType = (typeof BILLING_WEBHOOK_EVENT_TYPES)[number];

export interface BillingCheckoutRequest {
  organizationId: string;
  billingAccountId: string;
  customerReference: string;
  priceReference: string;
  interval: BillingPriceInterval;
  idempotencyKey: string;
  returnRouteKey: "billing" | "plans";
}

export interface BillingCheckoutSession {
  provider: BillingProvider;
  providerSessionReference: string;
  redirectUrl: string | null;
  networkCallPerformed: false;
}

export interface BillingCustomerPortalRequest {
  organizationId: string;
  customerReference: string;
  returnRouteKey: "billing";
}

export interface BillingCustomerPortalSession {
  provider: BillingProvider;
  providerSessionReference: string;
  redirectUrl: string | null;
  networkCallPerformed: false;
}

export interface BillingSubscriptionSnapshot {
  provider: BillingProvider;
  providerCustomerReference: string;
  providerSubscriptionReference: string;
  status: BillingSubscriptionStatus;
  interval: BillingPriceInterval;
  providerUpdatedAt: Date;
  currentPeriodEndsAt: Date | null;
  graceDeadline: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface BillingInvoiceMetadata {
  providerInvoiceReference: string;
  status: "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";
  currency: string | null;
  amountDueMinor: bigint | null;
  amountPaidMinor: bigint | null;
  dueAt: Date | null;
  paidAt: Date | null;
}

export interface NormalizedBillingWebhookEvent {
  provider: BillingProvider;
  providerEventId: string;
  eventType: BillingWebhookEventType;
  providerCreatedAt: Date | null;
  providerCustomerReference: string | null;
  providerSubscriptionReference: string | null;
  providerInvoiceReference: string | null;
}

export interface BillingWebhookVerificationInput {
  rawBody: Buffer;
  signature: string | undefined;
  environment: BillingProviderEnvironment;
}

export interface BillingProviderReadiness {
  provider: BillingProvider;
  status: "DISABLED" | "READY_FOR_LOCAL_PROOF" | "IMPLEMENTED_DISABLED";
  merchantEligibility: "NOT_ASSESSED" | "PENDING_OWNER_EVIDENCE" | "CONFIRMED";
  networkEnabled: false;
  checkoutEnabled: false;
  portalEnabled: false;
  webhookIngressEnabled: false;
  warnings: string[];
}

export interface LedgerByteBillingProvider {
  readonly provider: BillingProvider;
  readiness(): BillingProviderReadiness;
  createCheckoutSession(input: BillingCheckoutRequest): Promise<BillingCheckoutSession>;
  createCustomerPortalSession(input: BillingCustomerPortalRequest): Promise<BillingCustomerPortalSession>;
  retrieveSubscription(providerSubscriptionReference: string): Promise<BillingSubscriptionSnapshot | null>;
  cancelAtPeriodEnd(providerSubscriptionReference: string): Promise<BillingSubscriptionSnapshot>;
  reactivateSubscription(providerSubscriptionReference: string): Promise<BillingSubscriptionSnapshot>;
  schedulePlanChange(input: { providerSubscriptionReference: string; priceReference: string; effectiveAt: Date }): Promise<BillingSubscriptionSnapshot>;
  listInvoiceMetadata(providerSubscriptionReference: string): Promise<BillingInvoiceMetadata[]>;
  verifyWebhook(input: BillingWebhookVerificationInput): Promise<boolean>;
  normalizeWebhookEvent(rawBody: Buffer): NormalizedBillingWebhookEvent;
  reconcileSubscription(providerSubscriptionReference: string): Promise<BillingSubscriptionSnapshot | null>;
}
