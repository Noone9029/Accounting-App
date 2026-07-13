BEGIN;

ALTER TABLE "AccountingCloseTask"
  ADD COLUMN "reopenReason" TEXT;

COMMIT;
