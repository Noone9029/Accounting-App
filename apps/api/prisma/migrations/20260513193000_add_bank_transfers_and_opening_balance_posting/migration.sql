-- CreateEnum
CREATE TYPE "BankTransferStatus" AS ENUM ('POSTED', 'VOIDED');

-- AlterEnum
ALTER TYPE "NumberSequenceScope" ADD VALUE 'BANK_TRANSFER';

-- AlterTable
ALTER TABLE "BankAccountProfile"
  ADD COLUMN "openingBalanceJournalEntryId" UUID,
  ADD COLUMN "openingBalancePostedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BankTransfer" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromBankAccountProfileId" UUID NOT NULL,
    "toBankAccountProfileId" UUID NOT NULL,
    "fromAccountId" UUID NOT NULL,
    "toAccountId" UUID NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SAR',
    "status" "BankTransferStatus" NOT NULL DEFAULT 'POSTED',
    "amount" DECIMAL(20,4) NOT NULL,
    "description" TEXT,
    "journalEntryId" UUID,
    "voidReversalJournalEntryId" UUID,
    "createdById" UUID,
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankAccountProfile_openingBalanceJournalEntryId_key" ON "BankAccountProfile"("openingBalanceJournalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransfer_journalEntryId_key" ON "BankTransfer"("journalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransfer_voidReversalJournalEntryId_key" ON "BankTransfer"("voidReversalJournalEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransfer_organizationId_transferNumber_key" ON "BankTransfer"("organizationId", "transferNumber");

-- CreateIndex
CREATE INDEX "BankTransfer_organizationId_idx" ON "BankTransfer"("organizationId");

-- CreateIndex
CREATE INDEX "BankTransfer_organizationId_status_idx" ON "BankTransfer"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BankTransfer_fromBankAccountProfileId_idx" ON "BankTransfer"("fromBankAccountProfileId");

-- CreateIndex
CREATE INDEX "BankTransfer_toBankAccountProfileId_idx" ON "BankTransfer"("toBankAccountProfileId");

-- AddForeignKey
ALTER TABLE "BankAccountProfile" ADD CONSTRAINT "BankAccountProfile_openingBalanceJournalEntryId_fkey" FOREIGN KEY ("openingBalanceJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_fromBankAccountProfileId_fkey" FOREIGN KEY ("fromBankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_toBankAccountProfileId_fkey" FOREIGN KEY ("toBankAccountProfileId") REFERENCES "BankAccountProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_voidReversalJournalEntryId_fkey" FOREIGN KEY ("voidReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransfer" ADD CONSTRAINT "BankTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
