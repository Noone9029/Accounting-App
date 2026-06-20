-- Add payment instruction template, document default, and render snapshot schema only.
-- Additive only: no backfill, payment execution, bank-transfer posting,
-- provider calls, email sends, storage writes, generated-document rewrites,
-- accounting mutations, or compliance claims.

CREATE TYPE "PaymentInstructionTemplateType" AS ENUM ('BANK_PROFILE', 'MANUAL_BANK_TRANSFER', 'PAYMENT_LINK_TEXT', 'OTHER_TEXT');
CREATE TYPE "PaymentInstructionTemplateStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "PaymentInstructionDocumentScope" AS ENUM ('SALES_INVOICE', 'SALES_QUOTE', 'RECURRING_INVOICE_TEMPLATE', 'CUSTOMER_STATEMENT');

CREATE TABLE "PaymentInstructionTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "type" "PaymentInstructionTemplateType" NOT NULL DEFAULT 'OTHER_TEXT',
    "status" "PaymentInstructionTemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountProfileId" UUID,
    "currency" TEXT,
    "displayBeneficiaryName" TEXT,
    "displayBankName" TEXT,
    "displayAccountReference" TEXT,
    "displayIbanOrRoutingReference" TEXT,
    "instructions" TEXT,
    "metadata" JSONB,
    "createdById" UUID,
    "updatedById" UUID,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstructionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationDocumentDefault" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "documentScope" "PaymentInstructionDocumentScope" NOT NULL,
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "defaultPaymentInstructionTemplateId" UUID,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDocumentDefault_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentInstructionRenderSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "sourceType" "PaymentInstructionDocumentScope" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "paymentInstructionTemplateId" UUID,
    "generatedDocumentId" UUID,
    "label" TEXT NOT NULL,
    "type" "PaymentInstructionTemplateType" NOT NULL,
    "currency" TEXT,
    "displayBeneficiaryName" TEXT,
    "displayBankName" TEXT,
    "displayAccountReference" TEXT,
    "displayIbanOrRoutingReference" TEXT,
    "instructions" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentInstructionRenderSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentInstructionTemplate_organizationId_normalizedLabel_key" ON "PaymentInstructionTemplate"("organizationId", "normalizedLabel");
CREATE UNIQUE INDEX "PaymentInstructionTemplate_one_active_default_per_org" ON "PaymentInstructionTemplate"("organizationId") WHERE "isDefault" = true AND "status" = 'ACTIVE';
CREATE INDEX "PaymentInstructionTemplate_organizationId_idx" ON "PaymentInstructionTemplate"("organizationId");
CREATE INDEX "PaymentInstructionTemplate_organizationId_status_idx" ON "PaymentInstructionTemplate"("organizationId", "status");
CREATE INDEX "PaymentInstructionTemplate_organizationId_type_idx" ON "PaymentInstructionTemplate"("organizationId", "type");
CREATE INDEX "PaymentInstructionTemplate_bankAccountProfileId_idx" ON "PaymentInstructionTemplate"("bankAccountProfileId");
CREATE INDEX "PaymentInstructionTemplate_createdById_idx" ON "PaymentInstructionTemplate"("createdById");
CREATE INDEX "PaymentInstructionTemplate_updatedById_idx" ON "PaymentInstructionTemplate"("updatedById");

CREATE UNIQUE INDEX "OrganizationDocumentDefault_organizationId_documentScope_key" ON "OrganizationDocumentDefault"("organizationId", "documentScope");
CREATE INDEX "OrganizationDocumentDefault_organizationId_idx" ON "OrganizationDocumentDefault"("organizationId");
CREATE INDEX "OrganizationDocumentDefault_organizationId_documentScope_idx" ON "OrganizationDocumentDefault"("organizationId", "documentScope");
CREATE INDEX "OrganizationDocumentDefault_defaultPaymentInstructionTemplateId_idx" ON "OrganizationDocumentDefault"("defaultPaymentInstructionTemplateId");
CREATE INDEX "OrganizationDocumentDefault_createdById_idx" ON "OrganizationDocumentDefault"("createdById");
CREATE INDEX "OrganizationDocumentDefault_updatedById_idx" ON "OrganizationDocumentDefault"("updatedById");

CREATE UNIQUE INDEX "PaymentInstructionRenderSnapshot_generatedDocumentId_key" ON "PaymentInstructionRenderSnapshot"("generatedDocumentId");
CREATE INDEX "PaymentInstructionRenderSnapshot_organizationId_idx" ON "PaymentInstructionRenderSnapshot"("organizationId");
CREATE INDEX "PaymentInstructionRenderSnapshot_organizationId_sourceType_sourceId_idx" ON "PaymentInstructionRenderSnapshot"("organizationId", "sourceType", "sourceId");
CREATE INDEX "PaymentInstructionRenderSnapshot_paymentInstructionTemplateId_idx" ON "PaymentInstructionRenderSnapshot"("paymentInstructionTemplateId");
CREATE INDEX "PaymentInstructionRenderSnapshot_generatedDocumentId_idx" ON "PaymentInstructionRenderSnapshot"("generatedDocumentId");
CREATE INDEX "PaymentInstructionRenderSnapshot_createdById_idx" ON "PaymentInstructionRenderSnapshot"("createdById");

ALTER TABLE "PaymentInstructionTemplate" ADD CONSTRAINT "PaymentInstructionTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentInstructionTemplate" ADD CONSTRAINT "PaymentInstructionTemplate_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentInstructionTemplate" ADD CONSTRAINT "PaymentInstructionTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentInstructionTemplate" ADD CONSTRAINT "PaymentInstructionTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationDocumentDefault" ADD CONSTRAINT "OrganizationDocumentDefault_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationDocumentDefault" ADD CONSTRAINT "OrganizationDocumentDefault_defaultPaymentInstructionTemplateId_fkey" FOREIGN KEY ("defaultPaymentInstructionTemplateId") REFERENCES "PaymentInstructionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationDocumentDefault" ADD CONSTRAINT "OrganizationDocumentDefault_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationDocumentDefault" ADD CONSTRAINT "OrganizationDocumentDefault_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentInstructionRenderSnapshot" ADD CONSTRAINT "PaymentInstructionRenderSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentInstructionRenderSnapshot" ADD CONSTRAINT "PaymentInstructionRenderSnapshot_paymentInstructionTemplateId_fkey" FOREIGN KEY ("paymentInstructionTemplateId") REFERENCES "PaymentInstructionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentInstructionRenderSnapshot" ADD CONSTRAINT "PaymentInstructionRenderSnapshot_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "GeneratedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentInstructionRenderSnapshot" ADD CONSTRAINT "PaymentInstructionRenderSnapshot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
