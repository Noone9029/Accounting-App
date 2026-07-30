BEGIN;

CREATE TYPE "BillingPlanKey" AS ENUM ('CONTROLLED_BETA', 'STARTER', 'GROWTH', 'KSA_COMPLIANCE');
CREATE TYPE "BillingPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED', 'ARCHIVED');
CREATE TYPE "BillingPlanVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "BillingPriceInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "BillingProvider" AS ENUM ('DISABLED', 'FAKE', 'STRIPE');
CREATE TYPE "BillingProviderEnvironment" AS ENUM ('LOCAL_TEST', 'TEST', 'LIVE');
CREATE TYPE "BillingEntitlementValueType" AS ENUM ('BOOLEAN', 'INTEGER', 'STRING');
CREATE TYPE "BillingAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCEL_AT_PERIOD_END', 'CANCELED');
CREATE TYPE "BillingScheduledChangeStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELED', 'SUPERSEDED');
CREATE TYPE "BillingCheckoutAttemptStatus" AS ENUM ('CREATED', 'DISABLED', 'READY', 'PROVIDER_PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "BillingWebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED_DUPLICATE', 'IGNORED_STALE', 'REJECTED', 'FAILED', 'OPERATOR_REVIEW');
CREATE TYPE "BillingInvoiceReferenceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
CREATE TYPE "BillingLifecycleEventType" AS ENUM ('TRIAL_STARTED', 'ACTIVATED', 'PAYMENT_FAILED', 'GRACE_EXPIRED', 'CANCELLATION_SCHEDULED', 'CANCELED', 'REACTIVATED', 'PLAN_CHANGE_SCHEDULED', 'PLAN_CHANGE_APPLIED', 'WEBHOOK_RECONCILED');

CREATE TABLE "BillingPlan" (
  "id" UUID NOT NULL,
  "key" "BillingPlanKey" NOT NULL,
  "displayName" TEXT NOT NULL,
  "internalDescription" TEXT NOT NULL,
  "status" "BillingPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "publiclyVisible" BOOLEAN NOT NULL DEFAULT false,
  "sellable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPlanVersion" (
  "id" UUID NOT NULL,
  "billingPlanId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "BillingPlanVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveAt" TIMESTAMPTZ(3),
  "retiredAt" TIMESTAMPTZ(3),
  "entitlementSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingPlanVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPlanVersion_version_positive" CHECK ("version" > 0),
  CONSTRAINT "BillingPlanVersion_retired_after_effective" CHECK ("retiredAt" IS NULL OR "effectiveAt" IS NULL OR "retiredAt" >= "effectiveAt")
);

CREATE TABLE "BillingPlanEntitlement" (
  "id" UUID NOT NULL,
  "planVersionId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "valueType" "BillingEntitlementValueType" NOT NULL,
  "booleanValue" BOOLEAN,
  "integerValue" INTEGER,
  "stringValue" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingPlanEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPlanEntitlement_value_matches_type" CHECK (
    ("valueType" = 'BOOLEAN' AND "booleanValue" IS NOT NULL AND "integerValue" IS NULL AND "stringValue" IS NULL)
    OR ("valueType" = 'INTEGER' AND "booleanValue" IS NULL AND "integerValue" IS NOT NULL AND "stringValue" IS NULL)
    OR ("valueType" = 'STRING' AND "booleanValue" IS NULL AND "integerValue" IS NULL AND "stringValue" IS NOT NULL)
  )
);

CREATE TABLE "BillingPrice" (
  "id" UUID NOT NULL,
  "planVersionId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "interval" "BillingPriceInterval" NOT NULL,
  "currency" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "providerProductId" TEXT,
  "providerPriceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPrice_amount_nonnegative" CHECK ("amountMinor" >= 0),
  CONSTRAINT "BillingPrice_currency_iso_length" CHECK (char_length("currency") = 3)
);

CREATE TABLE "OrganizationBillingAccount" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "billingEmailHash" TEXT,
  "billingEmailDomain" TEXT,
  "status" "BillingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "enforcementExempt" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationBillingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingProviderCustomer" (
  "id" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "providerCustomerReference" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingProviderCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationSubscription" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "planVersionId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "providerSubscriptionReference" TEXT,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "interval" "BillingPriceInterval" NOT NULL,
  "trialStartedAt" TIMESTAMPTZ(3),
  "trialEndsAt" TIMESTAMPTZ(3),
  "currentPeriodStartedAt" TIMESTAMPTZ(3),
  "currentPeriodEndsAt" TIMESTAMPTZ(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMPTZ(3),
  "graceDeadline" TIMESTAMPTZ(3),
  "suspendedAt" TIMESTAMPTZ(3),
  "providerUpdatedAt" TIMESTAMPTZ(3),
  "lastReconciledAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationSubscription_version_positive" CHECK ("version" > 0),
  CONSTRAINT "OrganizationSubscription_period_order" CHECK ("currentPeriodEndsAt" IS NULL OR "currentPeriodStartedAt" IS NULL OR "currentPeriodEndsAt" >= "currentPeriodStartedAt"),
  CONSTRAINT "OrganizationSubscription_trial_order" CHECK ("trialEndsAt" IS NULL OR "trialStartedAt" IS NULL OR "trialEndsAt" >= "trialStartedAt")
);

CREATE TABLE "SubscriptionScheduledChange" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "currentPlanVersionId" UUID NOT NULL,
  "targetPlanVersionId" UUID NOT NULL,
  "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "status" "BillingScheduledChangeStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SubscriptionScheduledChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionScheduledChange_distinct_plan_versions" CHECK ("currentPlanVersionId" <> "targetPlanVersionId")
);

CREATE TABLE "BillingCheckoutAttempt" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "subscriptionId" UUID,
  "planVersionId" UUID NOT NULL,
  "billingPriceId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "idempotencyKeyHash" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "returnRouteKey" TEXT NOT NULL,
  "providerSessionReference" TEXT,
  "status" "BillingCheckoutAttemptStatus" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "subscriptionId" UUID,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerCreatedAt" TIMESTAMPTZ(3),
  "payloadHash" TEXT NOT NULL,
  "providerCustomerReference" TEXT,
  "providerSubscriptionReference" TEXT,
  "status" "BillingWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMPTZ(3),
  "safeErrorCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingWebhookEvent_attempt_count_nonnegative" CHECK ("attemptCount" >= 0)
);

CREATE TABLE "BillingInvoiceReference" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "providerInvoiceReference" TEXT NOT NULL,
  "status" "BillingInvoiceReferenceStatus" NOT NULL DEFAULT 'OPEN',
  "currency" TEXT,
  "amountDueMinor" BIGINT,
  "amountPaidMinor" BIGINT,
  "dueAt" TIMESTAMPTZ(3),
  "paidAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingInvoiceReference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingInvoiceReference_currency_iso_length" CHECK ("currency" IS NULL OR char_length("currency") = 3),
  CONSTRAINT "BillingInvoiceReference_due_nonnegative" CHECK ("amountDueMinor" IS NULL OR "amountDueMinor" >= 0),
  CONSTRAINT "BillingInvoiceReference_paid_nonnegative" CHECK ("amountPaidMinor" IS NULL OR "amountPaidMinor" >= 0)
);

CREATE TABLE "BillingLifecycleEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "eventType" "BillingLifecycleEventType" NOT NULL,
  "previousStatus" "BillingSubscriptionStatus",
  "nextStatus" "BillingSubscriptionStatus" NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "correlationId" TEXT,
  "safeMetadataJson" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPlan_key_key" ON "BillingPlan"("key");
CREATE INDEX "BillingPlan_status_sellable_idx" ON "BillingPlan"("status", "sellable");
CREATE INDEX "BillingPlan_publiclyVisible_idx" ON "BillingPlan"("publiclyVisible");
CREATE UNIQUE INDEX "BillingPlanVersion_billingPlanId_version_key" ON "BillingPlanVersion"("billingPlanId", "version");
CREATE INDEX "BillingPlanVersion_billingPlanId_status_idx" ON "BillingPlanVersion"("billingPlanId", "status");
CREATE INDEX "BillingPlanVersion_status_effectiveAt_idx" ON "BillingPlanVersion"("status", "effectiveAt");
CREATE UNIQUE INDEX "BillingPlanEntitlement_planVersionId_key_key" ON "BillingPlanEntitlement"("planVersionId", "key");
CREATE INDEX "BillingPlanEntitlement_key_idx" ON "BillingPlanEntitlement"("key");
CREATE UNIQUE INDEX "BillingPrice_provider_environment_providerPriceId_key" ON "BillingPrice"("provider", "environment", "providerPriceId");
CREATE INDEX "BillingPrice_planVersionId_active_idx" ON "BillingPrice"("planVersionId", "active");
CREATE INDEX "BillingPrice_provider_environment_active_idx" ON "BillingPrice"("provider", "environment", "active");
CREATE UNIQUE INDEX "OrganizationBillingAccount_organizationId_provider_key" ON "OrganizationBillingAccount"("organizationId", "provider");
CREATE INDEX "OrganizationBillingAccount_organizationId_status_idx" ON "OrganizationBillingAccount"("organizationId", "status");
CREATE UNIQUE INDEX "BillingProviderCustomer_billingAccountId_provider_environment_key" ON "BillingProviderCustomer"("billingAccountId", "provider", "environment");
CREATE UNIQUE INDEX "BillingProviderCustomer_provider_environment_providerCustomerReference_key" ON "BillingProviderCustomer"("provider", "environment", "providerCustomerReference");
CREATE INDEX "BillingProviderCustomer_billingAccountId_idx" ON "BillingProviderCustomer"("billingAccountId");
CREATE UNIQUE INDEX "OrganizationSubscription_provider_providerSubscriptionReference_key" ON "OrganizationSubscription"("provider", "providerSubscriptionReference");
CREATE UNIQUE INDEX "OrganizationSubscription_one_open_per_organization_key" ON "OrganizationSubscription"("organizationId") WHERE "status" <> 'CANCELED';
CREATE INDEX "OrganizationSubscription_organizationId_status_idx" ON "OrganizationSubscription"("organizationId", "status");
CREATE INDEX "OrganizationSubscription_billingAccountId_status_idx" ON "OrganizationSubscription"("billingAccountId", "status");
CREATE INDEX "OrganizationSubscription_planVersionId_idx" ON "OrganizationSubscription"("planVersionId");
CREATE INDEX "OrganizationSubscription_status_graceDeadline_idx" ON "OrganizationSubscription"("status", "graceDeadline");
CREATE UNIQUE INDEX "SubscriptionScheduledChange_one_pending_per_subscription_key" ON "SubscriptionScheduledChange"("subscriptionId") WHERE "status" = 'PENDING';
CREATE INDEX "SubscriptionScheduledChange_organizationId_status_idx" ON "SubscriptionScheduledChange"("organizationId", "status");
CREATE INDEX "SubscriptionScheduledChange_subscriptionId_status_idx" ON "SubscriptionScheduledChange"("subscriptionId", "status");
CREATE INDEX "SubscriptionScheduledChange_effectiveAt_status_idx" ON "SubscriptionScheduledChange"("effectiveAt", "status");
CREATE UNIQUE INDEX "BillingCheckoutAttempt_organizationId_idempotencyKeyHash_key" ON "BillingCheckoutAttempt"("organizationId", "idempotencyKeyHash");
CREATE INDEX "BillingCheckoutAttempt_organizationId_status_idx" ON "BillingCheckoutAttempt"("organizationId", "status");
CREATE INDEX "BillingCheckoutAttempt_billingAccountId_status_idx" ON "BillingCheckoutAttempt"("billingAccountId", "status");
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_environment_providerEventId_key" ON "BillingWebhookEvent"("provider", "environment", "providerEventId");
CREATE INDEX "BillingWebhookEvent_organizationId_status_idx" ON "BillingWebhookEvent"("organizationId", "status");
CREATE INDEX "BillingWebhookEvent_subscriptionId_status_idx" ON "BillingWebhookEvent"("subscriptionId", "status");
CREATE INDEX "BillingWebhookEvent_status_createdAt_idx" ON "BillingWebhookEvent"("status", "createdAt");
CREATE UNIQUE INDEX "BillingInvoiceReference_provider_environment_providerInvoiceReference_key" ON "BillingInvoiceReference"("provider", "environment", "providerInvoiceReference");
CREATE INDEX "BillingInvoiceReference_organizationId_status_idx" ON "BillingInvoiceReference"("organizationId", "status");
CREATE INDEX "BillingInvoiceReference_subscriptionId_idx" ON "BillingInvoiceReference"("subscriptionId");
CREATE INDEX "BillingLifecycleEvent_organizationId_createdAt_idx" ON "BillingLifecycleEvent"("organizationId", "createdAt");
CREATE INDEX "BillingLifecycleEvent_subscriptionId_createdAt_idx" ON "BillingLifecycleEvent"("subscriptionId", "createdAt");
CREATE INDEX "BillingLifecycleEvent_correlationId_idx" ON "BillingLifecycleEvent"("correlationId");

ALTER TABLE "BillingPlanVersion" ADD CONSTRAINT "BillingPlanVersion_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingPlanEntitlement" ADD CONSTRAINT "BillingPlanEntitlement_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPrice" ADD CONSTRAINT "BillingPrice_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationBillingAccount" ADD CONSTRAINT "OrganizationBillingAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingProviderCustomer" ADD CONSTRAINT "BillingProviderCustomer_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_currentPlanVersionId_fkey" FOREIGN KEY ("currentPlanVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_targetPlanVersionId_fkey" FOREIGN KEY ("targetPlanVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_billingPriceId_fkey" FOREIGN KEY ("billingPriceId") REFERENCES "BillingPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingInvoiceReference" ADD CONSTRAINT "BillingInvoiceReference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingInvoiceReference" ADD CONSTRAINT "BillingInvoiceReference_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingLifecycleEvent" ADD CONSTRAINT "BillingLifecycleEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingLifecycleEvent" ADD CONSTRAINT "BillingLifecycleEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "prevent_active_billing_plan_version_contract_mutation"() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'ACTIVE' AND (
    NEW."billingPlanId" IS DISTINCT FROM OLD."billingPlanId"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."effectiveAt" IS DISTINCT FROM OLD."effectiveAt"
    OR NEW."entitlementSnapshot" IS DISTINCT FROM OLD."entitlementSnapshot"
  ) THEN
    RAISE EXCEPTION 'Activated billing plan versions are immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BillingPlanVersion_prevent_active_contract_mutation"
BEFORE UPDATE ON "BillingPlanVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_active_billing_plan_version_contract_mutation"();

CREATE FUNCTION "prevent_active_billing_plan_entitlement_mutation"() RETURNS TRIGGER AS $$
DECLARE
  "affectedPlanVersionId" UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    "affectedPlanVersionId" := OLD."planVersionId";
  ELSE
    "affectedPlanVersionId" := NEW."planVersionId";
  END IF;
  IF EXISTS (SELECT 1 FROM "BillingPlanVersion" WHERE "id" = "affectedPlanVersionId" AND "status" = 'ACTIVE') THEN
    RAISE EXCEPTION 'Activated billing plan entitlements are immutable.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BillingPlanEntitlement_prevent_active_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "BillingPlanEntitlement"
FOR EACH ROW EXECUTE FUNCTION "prevent_active_billing_plan_entitlement_mutation"();

COMMIT;
