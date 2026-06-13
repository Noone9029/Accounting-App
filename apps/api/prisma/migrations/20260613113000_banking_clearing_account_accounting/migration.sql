-- Add manual banking clearing-account configuration and explicit journal links.
-- This migration is additive only. It does not create accounts, post journals,
-- or backfill operational banking records.

CREATE TABLE "BankingClearingAccountConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "undepositedFundsAccountId" UUID,
    "chequeInHandAccountId" UUID,
    "outstandingChequesAccountId" UUID,
    "cardClearingAccountId" UUID,
    "creditCardLiabilityAccountId" UUID,
    "prepaidCardAssetAccountId" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankingClearingAccountConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BankDepositBatch" ADD COLUMN "postedJournalEntryId" UUID;
ALTER TABLE "CardSettlement" ADD COLUMN "postedJournalEntryId" UUID;
ALTER TABLE "ChequeInstrument" ADD COLUMN "postedJournalEntryId" UUID;

CREATE UNIQUE INDEX "BankingClearingAccountConfig_organizationId_key" ON "BankingClearingAccountConfig"("organizationId");
CREATE INDEX "BankingClearingAccountConfig_organizationId_idx" ON "BankingClearingAccountConfig"("organizationId");
CREATE INDEX "BankingClearingAccountConfig_undepositedFundsAccountId_idx" ON "BankingClearingAccountConfig"("undepositedFundsAccountId");
CREATE INDEX "BankingClearingAccountConfig_chequeInHandAccountId_idx" ON "BankingClearingAccountConfig"("chequeInHandAccountId");
CREATE INDEX "BankingClearingAccountConfig_outstandingChequesAccountId_idx" ON "BankingClearingAccountConfig"("outstandingChequesAccountId");
CREATE INDEX "BankingClearingAccountConfig_cardClearingAccountId_idx" ON "BankingClearingAccountConfig"("cardClearingAccountId");
CREATE INDEX "BankingClearingAccountConfig_creditCardLiabilityAccountId_idx" ON "BankingClearingAccountConfig"("creditCardLiabilityAccountId");
CREATE INDEX "BankingClearingAccountConfig_prepaidCardAssetAccountId_idx" ON "BankingClearingAccountConfig"("prepaidCardAssetAccountId");

CREATE UNIQUE INDEX "BankDepositBatch_postedJournalEntryId_key" ON "BankDepositBatch"("postedJournalEntryId");
CREATE INDEX "BankDepositBatch_postedJournalEntryId_idx" ON "BankDepositBatch"("postedJournalEntryId");
CREATE UNIQUE INDEX "CardSettlement_postedJournalEntryId_key" ON "CardSettlement"("postedJournalEntryId");
CREATE INDEX "CardSettlement_postedJournalEntryId_idx" ON "CardSettlement"("postedJournalEntryId");
CREATE UNIQUE INDEX "ChequeInstrument_postedJournalEntryId_key" ON "ChequeInstrument"("postedJournalEntryId");
CREATE INDEX "ChequeInstrument_postedJournalEntryId_idx" ON "ChequeInstrument"("postedJournalEntryId");

ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_undepositedFundsAccountId_fkey" FOREIGN KEY ("undepositedFundsAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_chequeInHandAccountId_fkey" FOREIGN KEY ("chequeInHandAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_outstandingChequesAccountId_fkey" FOREIGN KEY ("outstandingChequesAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_cardClearingAccountId_fkey" FOREIGN KEY ("cardClearingAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_creditCardLiabilityAccountId_fkey" FOREIGN KEY ("creditCardLiabilityAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_prepaidCardAssetAccountId_fkey" FOREIGN KEY ("prepaidCardAssetAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BankingClearingAccountConfig" ADD CONSTRAINT "BankingClearingAccountConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BankDepositBatch" ADD CONSTRAINT "BankDepositBatch_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CardSettlement" ADD CONSTRAINT "CardSettlement_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChequeInstrument" ADD CONSTRAINT "ChequeInstrument_postedJournalEntryId_fkey" FOREIGN KEY ("postedJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
