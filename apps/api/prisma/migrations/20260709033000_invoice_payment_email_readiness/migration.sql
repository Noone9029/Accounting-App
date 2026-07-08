-- Invoice/payment email delivery readiness.
-- Stores local-safe delivery preview/block metadata only; no SMTP credentials, provider payloads, raw bodies, or secrets.

ALTER TYPE "EmailTemplateType" ADD VALUE 'SALES_INVOICE';
ALTER TYPE "EmailTemplateType" ADD VALUE 'INVOICE_PAYMENT_LINK';
ALTER TYPE "EmailTemplateType" ADD VALUE 'PAYMENT_RECEIPT';
ALTER TYPE "EmailTemplateType" ADD VALUE 'FAILED_DELIVERY_NOTIFICATION';

CREATE TYPE "EmailDeliveryEventStatus" AS ENUM (
    'PREVIEWED',
    'BLOCKED'
);

CREATE TYPE "EmailDeliveryTargetType" AS ENUM (
    'SALES_INVOICE',
    'INVOICE_PAYMENT_LINK',
    'CUSTOMER_PAYMENT',
    'SYSTEM_NOTIFICATION'
);

CREATE TABLE "EmailDeliveryEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" "EmailDeliveryEventStatus" NOT NULL,
    "templateType" "EmailTemplateType" NOT NULL,
    "targetType" "EmailDeliveryTargetType" NOT NULL,
    "targetId" UUID,
    "redactedRecipient" TEXT NOT NULL,
    "providerState" TEXT NOT NULL,
    "requestId" TEXT,
    "eventSummaryJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDeliveryEvent_organizationId_idx" ON "EmailDeliveryEvent"("organizationId");
CREATE INDEX "EmailDeliveryEvent_organizationId_status_idx" ON "EmailDeliveryEvent"("organizationId", "status");
CREATE INDEX "EmailDeliveryEvent_organizationId_templateType_idx" ON "EmailDeliveryEvent"("organizationId", "templateType");
CREATE INDEX "EmailDeliveryEvent_organizationId_targetType_targetId_idx" ON "EmailDeliveryEvent"("organizationId", "targetType", "targetId");
CREATE INDEX "EmailDeliveryEvent_requestId_idx" ON "EmailDeliveryEvent"("requestId");

ALTER TABLE "EmailDeliveryEvent"
ADD CONSTRAINT "EmailDeliveryEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
