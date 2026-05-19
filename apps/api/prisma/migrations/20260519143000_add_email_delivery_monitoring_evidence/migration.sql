-- CreateEnum
CREATE TYPE "EmailDeliveryMonitoringEvidenceStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "EmailDeliveryMonitoringEvidenceType" AS ENUM ('RETRY_WORKER', 'BOUNCE_ALERTS', 'COMPLAINT_ALERTS', 'SUPPRESSION_TRENDS', 'DELIVERY_DASHBOARD', 'PROVIDER_WEBHOOK_HEALTH', 'OTHER');

-- CreateTable
CREATE TABLE "EmailDeliveryMonitoringEvidence" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" "EmailDeliveryMonitoringEvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "evidenceType" "EmailDeliveryMonitoringEvidenceType" NOT NULL,
    "provider" TEXT,
    "evidenceSummaryJson" JSONB NOT NULL,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    "productionReadyContribution" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryMonitoringEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailDeliveryMonitoringEvidence_organizationId_idx" ON "EmailDeliveryMonitoringEvidence"("organizationId");

-- CreateIndex
CREATE INDEX "EmailDeliveryMonitoringEvidence_organizationId_status_idx" ON "EmailDeliveryMonitoringEvidence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EmailDeliveryMonitoringEvidence_organizationId_evidenceType_idx" ON "EmailDeliveryMonitoringEvidence"("organizationId", "evidenceType");

-- CreateIndex
CREATE INDEX "EmailDeliveryMonitoringEvidence_createdById_idx" ON "EmailDeliveryMonitoringEvidence"("createdById");

-- CreateIndex
CREATE INDEX "EmailDeliveryMonitoringEvidence_verifiedById_idx" ON "EmailDeliveryMonitoringEvidence"("verifiedById");

-- CreateIndex
CREATE INDEX "EmailDeliveryMonitoringEvidence_revokedById_idx" ON "EmailDeliveryMonitoringEvidence"("revokedById");

-- AddForeignKey
ALTER TABLE "EmailDeliveryMonitoringEvidence" ADD CONSTRAINT "EmailDeliveryMonitoringEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryMonitoringEvidence" ADD CONSTRAINT "EmailDeliveryMonitoringEvidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryMonitoringEvidence" ADD CONSTRAINT "EmailDeliveryMonitoringEvidence_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryMonitoringEvidence" ADD CONSTRAINT "EmailDeliveryMonitoringEvidence_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
