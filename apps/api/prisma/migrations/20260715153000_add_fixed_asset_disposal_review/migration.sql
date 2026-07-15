BEGIN;

ALTER TABLE "FixedAsset"
  ADD COLUMN "disposalReviewedByUserId" UUID,
  ADD COLUMN "disposalReviewedAt" TIMESTAMP(3),
  ADD COLUMN "disposalReviewReason" TEXT;

COMMIT;
