-- Add explicit manual COGS posting links for sales stock issues.
ALTER TABLE "SalesStockIssue"
  ADD COLUMN "cogsJournalEntryId" UUID,
  ADD COLUMN "cogsReversalJournalEntryId" UUID,
  ADD COLUMN "cogsPostedAt" TIMESTAMP(3),
  ADD COLUMN "cogsPostedById" UUID,
  ADD COLUMN "cogsReversedAt" TIMESTAMP(3),
  ADD COLUMN "cogsReversedById" UUID;

CREATE UNIQUE INDEX "SalesStockIssue_cogsJournalEntryId_key" ON "SalesStockIssue"("cogsJournalEntryId");
CREATE UNIQUE INDEX "SalesStockIssue_cogsReversalJournalEntryId_key" ON "SalesStockIssue"("cogsReversalJournalEntryId");
CREATE INDEX "SalesStockIssue_cogsPostedById_idx" ON "SalesStockIssue"("cogsPostedById");
CREATE INDEX "SalesStockIssue_cogsReversedById_idx" ON "SalesStockIssue"("cogsReversedById");

ALTER TABLE "SalesStockIssue"
  ADD CONSTRAINT "SalesStockIssue_cogsJournalEntryId_fkey"
  FOREIGN KEY ("cogsJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesStockIssue"
  ADD CONSTRAINT "SalesStockIssue_cogsReversalJournalEntryId_fkey"
  FOREIGN KEY ("cogsReversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesStockIssue"
  ADD CONSTRAINT "SalesStockIssue_cogsPostedById_fkey"
  FOREIGN KEY ("cogsPostedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesStockIssue"
  ADD CONSTRAINT "SalesStockIssue_cogsReversedById_fkey"
  FOREIGN KEY ("cogsReversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
