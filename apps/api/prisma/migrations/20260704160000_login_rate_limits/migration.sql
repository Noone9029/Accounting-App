CREATE TYPE "LoginRateLimitKeyType" AS ENUM ('IP', 'EMAIL', 'EMAIL_IP');

CREATE TABLE "LoginRateLimit" (
    "id" UUID NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyType" "LoginRateLimitKeyType" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginRateLimit_keyType_keyHash_key" ON "LoginRateLimit"("keyType", "keyHash");
CREATE INDEX "LoginRateLimit_keyType_idx" ON "LoginRateLimit"("keyType");
CREATE INDEX "LoginRateLimit_lockedUntil_idx" ON "LoginRateLimit"("lockedUntil");
CREATE INDEX "LoginRateLimit_windowStartedAt_idx" ON "LoginRateLimit"("windowStartedAt");
