-- CreateEnum
CREATE TYPE "EmailSuppressionReason" AS ENUM ('BOUNCE', 'COMPLAINT', 'MANUAL', 'PROVIDER_EVENT');

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "emailHash" TEXT NOT NULL,
    "emailMasked" TEXT NOT NULL,
    "reason" "EmailSuppressionReason" NOT NULL,
    "sourceProvider" TEXT,
    "providerEventId" UUID,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "revokedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSuppression_organizationId_idx" ON "EmailSuppression"("organizationId");

-- CreateIndex
CREATE INDEX "EmailSuppression_organizationId_emailHash_idx" ON "EmailSuppression"("organizationId", "emailHash");

-- CreateIndex
CREATE INDEX "EmailSuppression_organizationId_active_idx" ON "EmailSuppression"("organizationId", "active");

-- CreateIndex
CREATE INDEX "EmailSuppression_organizationId_emailHash_active_idx" ON "EmailSuppression"("organizationId", "emailHash", "active");

-- CreateIndex
CREATE INDEX "EmailSuppression_providerEventId_idx" ON "EmailSuppression"("providerEventId");

-- CreateIndex
CREATE INDEX "EmailSuppression_createdById_idx" ON "EmailSuppression"("createdById");

-- CreateIndex
CREATE INDEX "EmailSuppression_revokedById_idx" ON "EmailSuppression"("revokedById");

-- AddForeignKey
ALTER TABLE "EmailSuppression" ADD CONSTRAINT "EmailSuppression_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSuppression" ADD CONSTRAINT "EmailSuppression_providerEventId_fkey" FOREIGN KEY ("providerEventId") REFERENCES "EmailProviderEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSuppression" ADD CONSTRAINT "EmailSuppression_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSuppression" ADD CONSTRAINT "EmailSuppression_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
