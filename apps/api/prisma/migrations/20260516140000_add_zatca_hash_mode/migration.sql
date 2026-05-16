CREATE TYPE "ZatcaHashMode" AS ENUM ('LOCAL_DETERMINISTIC', 'SDK_GENERATED');

ALTER TABLE "ZatcaEgsUnit"
  ADD COLUMN "hashMode" "ZatcaHashMode" NOT NULL DEFAULT 'LOCAL_DETERMINISTIC',
  ADD COLUMN "hashModeEnabledAt" TIMESTAMP(3),
  ADD COLUMN "hashModeEnabledById" UUID,
  ADD COLUMN "hashModeResetReason" TEXT,
  ADD COLUMN "sdkHashChainStartedAt" TIMESTAMP(3);

ALTER TABLE "ZatcaInvoiceMetadata"
  ADD COLUMN "hashModeSnapshot" "ZatcaHashMode" NOT NULL DEFAULT 'LOCAL_DETERMINISTIC';

ALTER TABLE "ZatcaEgsUnit"
  ADD CONSTRAINT "ZatcaEgsUnit_hashModeEnabledById_fkey"
  FOREIGN KEY ("hashModeEnabledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ZatcaEgsUnit_organizationId_hashMode_idx" ON "ZatcaEgsUnit"("organizationId", "hashMode");
CREATE INDEX "ZatcaEgsUnit_hashModeEnabledById_idx" ON "ZatcaEgsUnit"("hashModeEnabledById");
CREATE INDEX "ZatcaInvoiceMetadata_hashModeSnapshot_idx" ON "ZatcaInvoiceMetadata"("hashModeSnapshot");
