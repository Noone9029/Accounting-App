-- Add read-only purchase matching exception review tracking.
CREATE TYPE "PurchaseMatchingReviewStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'WAITING_FOR_SUPPLIER',
  'WAITING_FOR_RECEIPT',
  'WAITING_FOR_BILL',
  'ACCEPTED_AS_TIMING_DIFFERENCE',
  'NEEDS_VARIANCE_REVIEW',
  'NEEDS_RETURN_REVIEW',
  'RESOLVED',
  'CANCELLED'
);

CREATE TYPE "PurchaseMatchingReviewReason" AS ENUM (
  'QUANTITY_MISMATCH',
  'PRICE_MISMATCH',
  'RECEIPT_MISSING',
  'BILL_MISSING',
  'OVER_RECEIVED',
  'OVER_BILLED',
  'SUPPLIER_DISPUTE',
  'TIMING_DIFFERENCE',
  'DATA_ENTRY_REVIEW',
  'OTHER'
);

CREATE TABLE "PurchaseMatchingReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "supplierId" UUID,
  "sourceType" TEXT NOT NULL,
  "sourceId" UUID NOT NULL,
  "exceptionType" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" "PurchaseMatchingReviewStatus" NOT NULL DEFAULT 'OPEN',
  "reasonCode" "PurchaseMatchingReviewReason",
  "assignedToUserId" UUID,
  "reviewedByUserId" UUID,
  "reviewedAt" TIMESTAMP(3),
  "nextReviewDate" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseMatchingReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseMatchingReview_organizationId_sourceType_sourceId_exceptionType_key"
  ON "PurchaseMatchingReview"("organizationId", "sourceType", "sourceId", "exceptionType");
CREATE INDEX "PurchaseMatchingReview_organizationId_status_idx" ON "PurchaseMatchingReview"("organizationId", "status");
CREATE INDEX "PurchaseMatchingReview_organizationId_supplierId_idx" ON "PurchaseMatchingReview"("organizationId", "supplierId");
CREATE INDEX "PurchaseMatchingReview_organizationId_severity_idx" ON "PurchaseMatchingReview"("organizationId", "severity");
CREATE INDEX "PurchaseMatchingReview_organizationId_sourceType_sourceId_idx" ON "PurchaseMatchingReview"("organizationId", "sourceType", "sourceId");
CREATE INDEX "PurchaseMatchingReview_assignedToUserId_idx" ON "PurchaseMatchingReview"("assignedToUserId");
CREATE INDEX "PurchaseMatchingReview_reviewedByUserId_idx" ON "PurchaseMatchingReview"("reviewedByUserId");

ALTER TABLE "PurchaseMatchingReview"
  ADD CONSTRAINT "PurchaseMatchingReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseMatchingReview_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseMatchingReview_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PurchaseMatchingReview_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
