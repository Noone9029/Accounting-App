BEGIN;

ALTER TABLE "FixedAssetMovement"
  ADD COLUMN "proceedsAmount" DECIMAL(20,4),
  ADD COLUMN "gainAmount" DECIMAL(20,4),
  ADD COLUMN "lossAmount" DECIMAL(20,4);

COMMIT;
