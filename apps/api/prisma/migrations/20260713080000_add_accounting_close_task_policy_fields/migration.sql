BEGIN;

ALTER TABLE "AccountingCloseTask"
  ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "completionNote" TEXT;

COMMIT;
