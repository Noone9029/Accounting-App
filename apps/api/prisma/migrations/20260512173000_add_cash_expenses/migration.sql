CREATE TYPE "CashExpenseStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

ALTER TYPE "DocumentType" ADD VALUE 'CASH_EXPENSE';

ALTER TYPE "NumberSequenceScope" ADD VALUE 'CASH_EXPENSE';

CREATE TABLE "CashExpense" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "contactId" UUID,
    "branchId" UUID,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "CashExpenseStatus" NOT NULL DEFAULT 'POSTED',
    "subtotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "taxableTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "total" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "description" TEXT,
    "notes" TEXT,
    "paidThroughAccountId" UUID NOT NULL,
    "createdById" UUID,
    "postedAt" TIMESTAMP(3),
    "journalEntryId" UUID,
    "voidReversalJournalEntryId" UUID,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashExpenseLine" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "cashExpenseId" UUID NOT NULL,
    "itemId" UUID,
    "description" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "quantity" DECIMAL(20,4) NOT NULL,
    "unitPrice" DECIMAL(20,4) NOT NULL,
    "discountRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "taxRateId" UUID,
    "lineGrossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashExpenseLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashExpense_journalEntryId_key" ON "CashExpense"("journalEntryId");
CREATE UNIQUE INDEX "CashExpense_voidReversalJournalEntryId_key" ON "CashExpense"("voidReversalJournalEntryId");
CREATE UNIQUE INDEX "CashExpense_organizationId_expenseNumber_key" ON "CashExpense"("organizationId", "expenseNumber");
CREATE INDEX "CashExpense_organizationId_idx" ON "CashExpense"("organizationId");
CREATE INDEX "CashExpense_contactId_idx" ON "CashExpense"("contactId");
CREATE INDEX "CashExpense_branchId_idx" ON "CashExpense"("branchId");
CREATE INDEX "CashExpense_paidThroughAccountId_idx" ON "CashExpense"("paidThroughAccountId");
CREATE INDEX "CashExpense_status_idx" ON "CashExpense"("status");

CREATE INDEX "CashExpenseLine_organizationId_idx" ON "CashExpenseLine"("organizationId");
CREATE INDEX "CashExpenseLine_cashExpenseId_idx" ON "CashExpenseLine"("cashExpenseId");
CREATE INDEX "CashExpenseLine_itemId_idx" ON "CashExpenseLine"("itemId");
CREATE INDEX "CashExpenseLine_accountId_idx" ON "CashExpenseLine"("accountId");

ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_paidThroughAccountId_fkey" FOREIGN KEY ("paidThroughAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashExpense" ADD CONSTRAINT "CashExpense_voidReversalJournalEntryId_fkey" FOREIGN KEY ("voidReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_cashExpenseId_fkey" FOREIGN KEY ("cashExpenseId") REFERENCES "CashExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_taxRateId_fkey" FOREIGN KEY ("taxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
