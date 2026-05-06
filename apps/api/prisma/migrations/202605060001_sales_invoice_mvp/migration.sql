CREATE TYPE "ItemType" AS ENUM ('SERVICE', 'PRODUCT');
CREATE TYPE "ItemStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'VOIDED');

CREATE TABLE "Item" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sku" TEXT,
  "type" "ItemType" NOT NULL,
  "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "sellingPrice" DECIMAL(20,4) NOT NULL,
  "revenueAccountId" UUID NOT NULL,
  "salesTaxRateId" UUID NOT NULL,
  "purchaseCost" DECIMAL(20,4),
  "expenseAccountId" UUID,
  "purchaseTaxRateId" UUID,
  "inventoryTracking" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesInvoice" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "branchId" UUID,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "total" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "balanceDue" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "terms" TEXT,
  "createdById" UUID,
  "finalizedAt" TIMESTAMP(3),
  "journalEntryId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesInvoiceLine" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "itemId" UUID,
  "description" TEXT NOT NULL,
  "accountId" UUID NOT NULL,
  "quantity" DECIMAL(20,4) NOT NULL,
  "unitPrice" DECIMAL(20,4) NOT NULL,
  "discountRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "taxRateId" UUID,
  "taxAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "lineSubtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Item_organizationId_sku_key" ON "Item"("organizationId", "sku");
CREATE UNIQUE INDEX "SalesInvoice_journalEntryId_key" ON "SalesInvoice"("journalEntryId");
CREATE UNIQUE INDEX "SalesInvoice_organizationId_invoiceNumber_key" ON "SalesInvoice"("organizationId", "invoiceNumber");

CREATE INDEX "Item_organizationId_idx" ON "Item"("organizationId");
CREATE INDEX "Item_revenueAccountId_idx" ON "Item"("revenueAccountId");
CREATE INDEX "Item_salesTaxRateId_idx" ON "Item"("salesTaxRateId");
CREATE INDEX "SalesInvoice_organizationId_idx" ON "SalesInvoice"("organizationId");
CREATE INDEX "SalesInvoice_customerId_idx" ON "SalesInvoice"("customerId");
CREATE INDEX "SalesInvoice_status_idx" ON "SalesInvoice"("status");
CREATE INDEX "SalesInvoiceLine_organizationId_idx" ON "SalesInvoiceLine"("organizationId");
CREATE INDEX "SalesInvoiceLine_invoiceId_idx" ON "SalesInvoiceLine"("invoiceId");
CREATE INDEX "SalesInvoiceLine_itemId_idx" ON "SalesInvoiceLine"("itemId");
CREATE INDEX "SalesInvoiceLine_accountId_idx" ON "SalesInvoiceLine"("accountId");

ALTER TABLE "Item" ADD CONSTRAINT "Item_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_salesTaxRateId_fkey" FOREIGN KEY ("salesTaxRateId") REFERENCES "TaxRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Item" ADD CONSTRAINT "Item_purchaseTaxRateId_fkey" FOREIGN KEY ("purchaseTaxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
