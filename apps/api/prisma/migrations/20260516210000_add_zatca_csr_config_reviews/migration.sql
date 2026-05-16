CREATE TYPE "ZatcaCsrConfigReviewStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED', 'REVOKED');

CREATE TABLE "ZatcaCsrConfigReview" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "egsUnitId" UUID NOT NULL,
  "status" "ZatcaCsrConfigReviewStatus" NOT NULL DEFAULT 'DRAFT',
  "configHash" TEXT NOT NULL,
  "configPreviewRedacted" TEXT NOT NULL,
  "configKeyOrder" JSONB NOT NULL,
  "missingFieldsJson" JSONB NOT NULL,
  "reviewFieldsJson" JSONB NOT NULL,
  "blockersJson" JSONB,
  "warningsJson" JSONB,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "revokedById" UUID,
  "revokedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ZatcaCsrConfigReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZatcaCsrConfigReview_organizationId_idx" ON "ZatcaCsrConfigReview"("organizationId");
CREATE INDEX "ZatcaCsrConfigReview_egsUnitId_idx" ON "ZatcaCsrConfigReview"("egsUnitId");
CREATE INDEX "ZatcaCsrConfigReview_organizationId_egsUnitId_idx" ON "ZatcaCsrConfigReview"("organizationId", "egsUnitId");
CREATE INDEX "ZatcaCsrConfigReview_organizationId_egsUnitId_status_idx" ON "ZatcaCsrConfigReview"("organizationId", "egsUnitId", "status");
CREATE INDEX "ZatcaCsrConfigReview_configHash_idx" ON "ZatcaCsrConfigReview"("configHash");
CREATE INDEX "ZatcaCsrConfigReview_approvedById_idx" ON "ZatcaCsrConfigReview"("approvedById");
CREATE INDEX "ZatcaCsrConfigReview_revokedById_idx" ON "ZatcaCsrConfigReview"("revokedById");

ALTER TABLE "ZatcaCsrConfigReview" ADD CONSTRAINT "ZatcaCsrConfigReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaCsrConfigReview" ADD CONSTRAINT "ZatcaCsrConfigReview_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaCsrConfigReview" ADD CONSTRAINT "ZatcaCsrConfigReview_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZatcaCsrConfigReview" ADD CONSTRAINT "ZatcaCsrConfigReview_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
