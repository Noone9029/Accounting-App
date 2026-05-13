-- CreateEnum
CREATE TYPE "BankStatementImportStatus" AS ENUM ('IMPORTED', 'PARTIALLY_RECONCILED', 'RECONCILED', 'VOIDED');

-- CreateEnum
CREATE TYPE "BankStatementTransactionStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'CATEGORIZED', 'IGNORED', 'VOIDED');

-- CreateEnum
CREATE TYPE "BankStatementTransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "BankStatementMatchType" AS ENUM ('JOURNAL_LINE', 'MANUAL_JOURNAL', 'CASH_EXPENSE', 'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'CUSTOMER_REFUND', 'SUPPLIER_REFUND', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "BankStatementImport" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "bankAccountProfileId" UUID NOT NULL,
    "importedById" UUID,
    "filename" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'CSV',
    "status" "BankStatementImportStatus" NOT NULL DEFAULT 'IMPORTED',
    "statementStartDate" TIMESTAMP(3),
    "statementEndDate" TIMESTAMP(3),
    "openingStatementBalance" DECIMAL(20,4),
    "closingStatementBalance" DECIMAL(20,4),
    "rowCount" INTEGER NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatementTransaction" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "importId" UUID NOT NULL,
    "bankAccountProfileId" UUID NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "type" "BankStatementTransactionType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "status" "BankStatementTransactionStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedJournalLineId" UUID,
    "matchedJournalEntryId" UUID,
    "matchType" "BankStatementMatchType",
    "categorizedAccountId" UUID,
    "createdJournalEntryId" UUID,
    "ignoredReason" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankStatementTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankStatementImport_organizationId_idx" ON "BankStatementImport"("organizationId");

-- CreateIndex
CREATE INDEX "BankStatementImport_bankAccountProfileId_idx" ON "BankStatementImport"("bankAccountProfileId");

-- CreateIndex
CREATE INDEX "BankStatementImport_organizationId_status_idx" ON "BankStatementImport"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BankStatementImport_organizationId_importedAt_idx" ON "BankStatementImport"("organizationId", "importedAt");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_organizationId_idx" ON "BankStatementTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_importId_idx" ON "BankStatementTransaction"("importId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_bankAccountProfileId_idx" ON "BankStatementTransaction"("bankAccountProfileId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_organizationId_status_idx" ON "BankStatementTransaction"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_organizationId_transactionDate_idx" ON "BankStatementTransaction"("organizationId", "transactionDate");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_matchedJournalLineId_idx" ON "BankStatementTransaction"("matchedJournalLineId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_matchedJournalEntryId_idx" ON "BankStatementTransaction"("matchedJournalEntryId");

-- CreateIndex
CREATE INDEX "BankStatementTransaction_createdJournalEntryId_idx" ON "BankStatementTransaction"("createdJournalEntryId");

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "BankStatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_bankAccountProfileId_fkey" FOREIGN KEY ("bankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_matchedJournalLineId_fkey" FOREIGN KEY ("matchedJournalLineId") REFERENCES "JournalLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_matchedJournalEntryId_fkey" FOREIGN KEY ("matchedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_categorizedAccountId_fkey" FOREIGN KEY ("categorizedAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatementTransaction" ADD CONSTRAINT "BankStatementTransaction_createdJournalEntryId_fkey" FOREIGN KEY ("createdJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
