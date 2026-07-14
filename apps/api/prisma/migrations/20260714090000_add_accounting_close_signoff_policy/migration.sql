BEGIN;

CREATE TYPE "AccountingCloseSignoffMode" AS ENUM ('SEPARATED', 'SINGLE_USER_DEMO');

ALTER TABLE "Organization"
  ADD COLUMN "accountingCloseSingleUserDemoSignoffEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AccountingCloseCycle"
  ADD COLUMN "signoffMode" "AccountingCloseSignoffMode";

COMMIT;
