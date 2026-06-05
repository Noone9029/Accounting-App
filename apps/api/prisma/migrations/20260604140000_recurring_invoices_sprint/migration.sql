-- Add manual recurring invoice template workflow. Templates are non-posting.
ALTER TYPE "NumberSequenceScope" ADD VALUE IF NOT EXISTS 'RECURRING_INVOICE_TEMPLATE';

CREATE TYPE "RecurringInvoiceTemplateStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'ENDED',
  'CANCELLED'
);

CREATE TYPE "RecurringInvoiceFrequency" AS ENUM (
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY'
);

CREATE TYPE "RecurringInvoiceDateMode" AS ENUM (
  'RUN_DATE'
);

CREATE TABLE "RecurringInvoiceTemplate" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "templateNumber" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "branchId" UUID,
  "status" "RecurringInvoiceTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "nextRunDate" TIMESTAMP(3) NOT NULL,
  "lastRunDate" TIMESTAMP(3),
  "frequency" "RecurringInvoiceFrequency" NOT NULL,
  "interval" INTEGER NOT NULL DEFAULT 1,
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "monthOfYear" INTEGER,
  "invoiceDateMode" "RecurringInvoiceDateMode" NOT NULL DEFAULT 'RUN_DATE',
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 0,
  "reference" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "taxMode" "SalesInvoiceTaxMode" NOT NULL DEFAULT 'TAX_EXCLUSIVE',
  "subtotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxableTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "total" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringInvoiceTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringInvoiceTemplateLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "quantity" DECIMAL(20, 4) NOT NULL,
  "unitPrice" DECIMAL(20, 4) NOT NULL,
  "discountRate" DECIMAL(7, 4) NOT NULL DEFAULT 0,
  "taxRateId" UUID,
  "lineGrossAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxableAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "lineSubtotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(20, 4) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringInvoiceTemplateLine_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SalesInvoice"
ADD COLUMN "recurringInvoiceTemplateId" UUID;

CREATE TABLE "RecurringInvoiceRun" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "runDate" TIMESTAMP(3) NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "generatedInvoiceId" UUID,
  "generatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringInvoiceRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecurringInvoiceTemplate_organizationId_templateNumber_key" ON "RecurringInvoiceTemplate"("organizationId", "templateNumber");
CREATE INDEX "RecurringInvoiceTemplate_organizationId_idx" ON "RecurringInvoiceTemplate"("organizationId");
CREATE INDEX "RecurringInvoiceTemplate_customerId_idx" ON "RecurringInvoiceTemplate"("customerId");
CREATE INDEX "RecurringInvoiceTemplate_branchId_idx" ON "RecurringInvoiceTemplate"("branchId");
CREATE INDEX "RecurringInvoiceTemplate_status_idx" ON "RecurringInvoiceTemplate"("status");
CREATE INDEX "RecurringInvoiceTemplate_nextRunDate_idx" ON "RecurringInvoiceTemplate"("nextRunDate");

CREATE INDEX "RecurringInvoiceTemplateLine_organizationId_idx" ON "RecurringInvoiceTemplateLine"("organizationId");
CREATE INDEX "RecurringInvoiceTemplateLine_templateId_idx" ON "RecurringInvoiceTemplateLine"("templateId");
CREATE INDEX "RecurringInvoiceTemplateLine_itemId_idx" ON "RecurringInvoiceTemplateLine"("itemId");
CREATE INDEX "RecurringInvoiceTemplateLine_accountId_idx" ON "RecurringInvoiceTemplateLine"("accountId");
CREATE INDEX "RecurringInvoiceTemplateLine_taxRateId_idx" ON "RecurringInvoiceTemplateLine"("taxRateId");

CREATE INDEX "SalesInvoice_recurringInvoiceTemplateId_idx" ON "SalesInvoice"("recurringInvoiceTemplateId");

CREATE UNIQUE INDEX "RecurringInvoiceRun_generatedInvoiceId_key" ON "RecurringInvoiceRun"("generatedInvoiceId");
CREATE UNIQUE INDEX "RecurringInvoiceRun_organizationId_templateId_runDate_key" ON "RecurringInvoiceRun"("organizationId", "templateId", "runDate");
CREATE INDEX "RecurringInvoiceRun_organizationId_idx" ON "RecurringInvoiceRun"("organizationId");
CREATE INDEX "RecurringInvoiceRun_templateId_idx" ON "RecurringInvoiceRun"("templateId");
CREATE INDEX "RecurringInvoiceRun_runDate_idx" ON "RecurringInvoiceRun"("runDate");
CREATE INDEX "RecurringInvoiceRun_generatedById_idx" ON "RecurringInvoiceRun"("generatedById");

ALTER TABLE "RecurringInvoiceTemplate"
  ADD CONSTRAINT "RecurringInvoiceTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplate_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringInvoiceTemplateLine"
  ADD CONSTRAINT "RecurringInvoiceTemplateLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplateLine_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringInvoiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplateLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplateLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceTemplateLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesInvoice"
  ADD CONSTRAINT "SalesInvoice_recurringInvoiceTemplateId_fkey" FOREIGN KEY ("recurringInvoiceTemplateId") REFERENCES "RecurringInvoiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringInvoiceRun"
  ADD CONSTRAINT "RecurringInvoiceRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceRun_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RecurringInvoiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceRun_generatedInvoiceId_fkey" FOREIGN KEY ("generatedInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "RecurringInvoiceRun_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
