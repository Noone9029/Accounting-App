-- CreateEnum
CREATE TYPE "EmailProviderEventType" AS ENUM ('DELIVERED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'OPENED', 'CLICKED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "EmailOutbox" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "nextAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN "lastErrorRedacted" TEXT,
ADD COLUMN "providerEventStatus" TEXT,
ADD COLUMN "bouncedAt" TIMESTAMP(3),
ADD COLUMN "complainedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "retryLockedAt" TIMESTAMP(3),
ADD COLUMN "retryLockedBy" TEXT;

-- CreateTable
CREATE TABLE "EmailProviderEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "emailOutboxId" UUID,
    "provider" TEXT NOT NULL,
    "eventType" "EmailProviderEventType" NOT NULL,
    "providerMessageIdRedacted" TEXT,
    "payloadSummaryJson" JSONB NOT NULL,
    "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
    "productionReadyContribution" BOOLEAN NOT NULL DEFAULT false,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOutbox_organizationId_nextAttemptAt_idx" ON "EmailOutbox"("organizationId", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailOutbox_organizationId_providerEventStatus_idx" ON "EmailOutbox"("organizationId", "providerEventStatus");

-- CreateIndex
CREATE INDEX "EmailProviderEvent_organizationId_idx" ON "EmailProviderEvent"("organizationId");

-- CreateIndex
CREATE INDEX "EmailProviderEvent_organizationId_eventType_idx" ON "EmailProviderEvent"("organizationId", "eventType");

-- CreateIndex
CREATE INDEX "EmailProviderEvent_organizationId_emailOutboxId_idx" ON "EmailProviderEvent"("organizationId", "emailOutboxId");

-- CreateIndex
CREATE INDEX "EmailProviderEvent_organizationId_signatureVerified_idx" ON "EmailProviderEvent"("organizationId", "signatureVerified");

-- AddForeignKey
ALTER TABLE "EmailProviderEvent" ADD CONSTRAINT "EmailProviderEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailProviderEvent" ADD CONSTRAINT "EmailProviderEvent_emailOutboxId_fkey" FOREIGN KEY ("emailOutboxId") REFERENCES "EmailOutbox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
