-- CreateEnum
CREATE TYPE "EmailSenderDomainEvidenceStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "EmailSenderDomainEvidenceType" AS ENUM ('SPF', 'DKIM', 'DMARC', 'MX', 'RETURN_PATH', 'PROVIDER_VERIFICATION', 'OTHER');

-- CreateTable
CREATE TABLE "EmailSenderDomainEvidence" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "status" "EmailSenderDomainEvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "evidenceType" "EmailSenderDomainEvidenceType" NOT NULL,
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

    CONSTRAINT "EmailSenderDomainEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_organizationId_idx" ON "EmailSenderDomainEvidence"("organizationId");

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_organizationId_domain_idx" ON "EmailSenderDomainEvidence"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_organizationId_status_idx" ON "EmailSenderDomainEvidence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_organizationId_evidenceType_idx" ON "EmailSenderDomainEvidence"("organizationId", "evidenceType");

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_createdById_idx" ON "EmailSenderDomainEvidence"("createdById");

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_verifiedById_idx" ON "EmailSenderDomainEvidence"("verifiedById");

-- CreateIndex
CREATE INDEX "EmailSenderDomainEvidence_revokedById_idx" ON "EmailSenderDomainEvidence"("revokedById");

-- AddForeignKey
ALTER TABLE "EmailSenderDomainEvidence" ADD CONSTRAINT "EmailSenderDomainEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSenderDomainEvidence" ADD CONSTRAINT "EmailSenderDomainEvidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSenderDomainEvidence" ADD CONSTRAINT "EmailSenderDomainEvidence_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSenderDomainEvidence" ADD CONSTRAINT "EmailSenderDomainEvidence_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
