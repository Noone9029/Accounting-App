-- Create auth token delivery rate-limit evidence after email auth tokens exist.
ALTER TABLE IF EXISTS "Attachment" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "InventoryVarianceProposal" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE IF EXISTS "InventoryVarianceProposalEvent" ALTER COLUMN "id" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "AuthTokenRateLimitEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "email" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthTokenRateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthTokenRateLimitEvent_organizationId_email_purpose_create_idx"
  ON "AuthTokenRateLimitEvent"("organizationId", "email", "purpose", "createdAt");

CREATE INDEX IF NOT EXISTS "AuthTokenRateLimitEvent_email_purpose_createdAt_idx"
  ON "AuthTokenRateLimitEvent"("email", "purpose", "createdAt");

CREATE INDEX IF NOT EXISTS "AuthTokenRateLimitEvent_ipAddress_purpose_createdAt_idx"
  ON "AuthTokenRateLimitEvent"("ipAddress", "purpose", "createdAt");

CREATE INDEX IF NOT EXISTS "AuthTokenRateLimitEvent_organizationId_purpose_createdAt_idx"
  ON "AuthTokenRateLimitEvent"("organizationId", "purpose", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'AuthTokenRateLimitEvent_organizationId_fkey'
  ) THEN
    ALTER TABLE "AuthTokenRateLimitEvent"
      ADD CONSTRAINT "AuthTokenRateLimitEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'InventoryVarianceProposalEvent_organizationId_proposalId_create'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'i'
      AND relname = 'InventoryVarianceProposalEvent_organizationId_proposalId_cr_idx'
  ) THEN
    ALTER INDEX "InventoryVarianceProposalEvent_organizationId_proposalId_create"
      RENAME TO "InventoryVarianceProposalEvent_organizationId_proposalId_cr_idx";
  END IF;
END $$;
