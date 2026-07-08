CREATE TYPE "DocumentInboxStatus" AS ENUM (
    'UPLOADED',
    'EXTRACTION_DISABLED',
    'EXTRACTION_FAILED',
    'REVIEW_REQUIRED',
    'REVIEWED',
    'REJECTED'
);

CREATE TYPE "DocumentInboxSourceType" AS ENUM (
    'BILL',
    'RECEIPT',
    'OTHER'
);

CREATE TYPE "DocumentExtractionProviderType" AS ENUM (
    'NONE',
    'MOCK',
    'FUTURE_PROVIDER'
);

CREATE TYPE "DocumentExtractionStatus" AS ENUM (
    'SKIPPED_DISABLED',
    'EXTRACTED_MOCK',
    'FAILED'
);

CREATE TYPE "DocumentReviewDecisionType" AS ENUM (
    'MARK_REVIEWED',
    'REJECT',
    'CREATE_DRAFT_PURCHASE_BILL',
    'CREATE_DRAFT_CASH_EXPENSE'
);

CREATE TYPE "PaymentProviderType" AS ENUM (
    'NONE',
    'STRIPE'
);

CREATE TYPE "PaymentProviderConfigStatus" AS ENUM (
    'DISABLED',
    'READY_FOR_NON_PRODUCTION_TEST',
    'ENABLED'
);

CREATE TYPE "PaymentProviderEventStatus" AS ENUM (
    'REJECTED_UNVERIFIED',
    'ACCEPTED_VERIFIED'
);

CREATE TYPE "InvoicePaymentLinkStatus" AS ENUM (
    'BLOCKED_PROVIDER_DISABLED',
    'READY_FOR_NON_PRODUCTION_TEST',
    'CREATED_MOCK',
    'CREATED_PROVIDER',
    'FAILED'
);

CREATE TABLE "DocumentInboxItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "attachmentId" UUID NOT NULL,
    "sourceType" "DocumentInboxSourceType" NOT NULL DEFAULT 'BILL',
    "status" "DocumentInboxStatus" NOT NULL DEFAULT 'UPLOADED',
    "title" TEXT NOT NULL,
    "supplierName" TEXT,
    "documentDate" TIMESTAMP(3),
    "currency" VARCHAR(3),
    "totalAmount" DECIMAL(20,4),
    "taxAmount" DECIMAL(20,4),
    "notes" TEXT,
    "createdById" UUID,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentInboxItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentExtractionResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "documentInboxItemId" UUID NOT NULL,
    "provider" "DocumentExtractionProviderType" NOT NULL,
    "status" "DocumentExtractionStatus" NOT NULL,
    "confidence" DECIMAL(7,4),
    "extractedJson" JSONB,
    "redactedRawJson" JSONB,
    "blockers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentExtractionResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentReviewDecision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "documentInboxItemId" UUID NOT NULL,
    "decisionType" "DocumentReviewDecisionType" NOT NULL,
    "targetType" TEXT,
    "targetId" UUID,
    "reviewerNote" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReviewDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentProviderConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "status" "PaymentProviderConfigStatus" NOT NULL DEFAULT 'DISABLED',
    "displayName" TEXT NOT NULL,
    "publishableKeyLast4" TEXT,
    "webhookSecretLast4" TEXT,
    "metadataJson" JSONB,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentProviderEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "status" "PaymentProviderEventStatus" NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT,
    "redactedPayloadJson" JSONB,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoicePaymentLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "salesInvoiceId" UUID NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "status" "InvoicePaymentLinkStatus" NOT NULL,
    "paymentUrl" TEXT,
    "externalReference" TEXT,
    "redactedMetadataJson" JSONB,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicePaymentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentInboxItem_attachmentId_key" ON "DocumentInboxItem"("attachmentId");
CREATE INDEX "DocumentInboxItem_organizationId_idx" ON "DocumentInboxItem"("organizationId");
CREATE INDEX "DocumentInboxItem_organizationId_status_idx" ON "DocumentInboxItem"("organizationId", "status");
CREATE INDEX "DocumentInboxItem_organizationId_sourceType_idx" ON "DocumentInboxItem"("organizationId", "sourceType");
CREATE INDEX "DocumentInboxItem_createdById_idx" ON "DocumentInboxItem"("createdById");
CREATE INDEX "DocumentInboxItem_reviewedById_idx" ON "DocumentInboxItem"("reviewedById");

CREATE INDEX "DocumentExtractionResult_organizationId_idx" ON "DocumentExtractionResult"("organizationId");
CREATE INDEX "DocumentExtractionResult_documentInboxItemId_idx" ON "DocumentExtractionResult"("documentInboxItemId");
CREATE INDEX "DocumentExtractionResult_organizationId_status_idx" ON "DocumentExtractionResult"("organizationId", "status");
CREATE INDEX "DocumentExtractionResult_createdById_idx" ON "DocumentExtractionResult"("createdById");

CREATE INDEX "DocumentReviewDecision_organizationId_idx" ON "DocumentReviewDecision"("organizationId");
CREATE INDEX "DocumentReviewDecision_documentInboxItemId_idx" ON "DocumentReviewDecision"("documentInboxItemId");
CREATE INDEX "DocumentReviewDecision_organizationId_decisionType_idx" ON "DocumentReviewDecision"("organizationId", "decisionType");
CREATE INDEX "DocumentReviewDecision_reviewedById_idx" ON "DocumentReviewDecision"("reviewedById");

CREATE UNIQUE INDEX "PaymentProviderConfig_organizationId_provider_key" ON "PaymentProviderConfig"("organizationId", "provider");
CREATE INDEX "PaymentProviderConfig_organizationId_idx" ON "PaymentProviderConfig"("organizationId");
CREATE INDEX "PaymentProviderConfig_organizationId_status_idx" ON "PaymentProviderConfig"("organizationId", "status");
CREATE INDEX "PaymentProviderConfig_createdById_idx" ON "PaymentProviderConfig"("createdById");
CREATE INDEX "PaymentProviderConfig_updatedById_idx" ON "PaymentProviderConfig"("updatedById");

CREATE INDEX "PaymentProviderEvent_organizationId_idx" ON "PaymentProviderEvent"("organizationId");
CREATE INDEX "PaymentProviderEvent_organizationId_provider_idx" ON "PaymentProviderEvent"("organizationId", "provider");
CREATE INDEX "PaymentProviderEvent_organizationId_status_idx" ON "PaymentProviderEvent"("organizationId", "status");
CREATE INDEX "PaymentProviderEvent_externalEventId_idx" ON "PaymentProviderEvent"("externalEventId");

CREATE INDEX "InvoicePaymentLink_organizationId_idx" ON "InvoicePaymentLink"("organizationId");
CREATE INDEX "InvoicePaymentLink_salesInvoiceId_idx" ON "InvoicePaymentLink"("salesInvoiceId");
CREATE INDEX "InvoicePaymentLink_organizationId_provider_idx" ON "InvoicePaymentLink"("organizationId", "provider");
CREATE INDEX "InvoicePaymentLink_organizationId_status_idx" ON "InvoicePaymentLink"("organizationId", "status");
CREATE INDEX "InvoicePaymentLink_createdById_idx" ON "InvoicePaymentLink"("createdById");

ALTER TABLE "DocumentInboxItem"
    ADD CONSTRAINT "DocumentInboxItem_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentInboxItem"
    ADD CONSTRAINT "DocumentInboxItem_attachmentId_fkey"
    FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentInboxItem"
    ADD CONSTRAINT "DocumentInboxItem_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentInboxItem"
    ADD CONSTRAINT "DocumentInboxItem_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentExtractionResult"
    ADD CONSTRAINT "DocumentExtractionResult_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentExtractionResult"
    ADD CONSTRAINT "DocumentExtractionResult_documentInboxItemId_fkey"
    FOREIGN KEY ("documentInboxItemId") REFERENCES "DocumentInboxItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentExtractionResult"
    ADD CONSTRAINT "DocumentExtractionResult_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentReviewDecision"
    ADD CONSTRAINT "DocumentReviewDecision_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewDecision"
    ADD CONSTRAINT "DocumentReviewDecision_documentInboxItemId_fkey"
    FOREIGN KEY ("documentInboxItemId") REFERENCES "DocumentInboxItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentReviewDecision"
    ADD CONSTRAINT "DocumentReviewDecision_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentProviderConfig"
    ADD CONSTRAINT "PaymentProviderConfig_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderConfig"
    ADD CONSTRAINT "PaymentProviderConfig_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentProviderConfig"
    ADD CONSTRAINT "PaymentProviderConfig_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentProviderEvent"
    ADD CONSTRAINT "PaymentProviderEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoicePaymentLink"
    ADD CONSTRAINT "InvoicePaymentLink_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoicePaymentLink"
    ADD CONSTRAINT "InvoicePaymentLink_salesInvoiceId_fkey"
    FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoicePaymentLink"
    ADD CONSTRAINT "InvoicePaymentLink_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
