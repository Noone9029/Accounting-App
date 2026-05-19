-- CreateEnum
CREATE TYPE "BackupRestoreEvidenceScope" AS ENUM ('GLOBAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "BackupRestoreEvidenceStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BackupRestoreEvidenceType" AS ENUM ('DATABASE_BACKUP', 'POINT_IN_TIME_RECOVERY', 'MIGRATION_HISTORY', 'OBJECT_STORAGE_BACKUP', 'GENERATED_DOCUMENT_BACKUP', 'ATTACHMENT_BACKUP', 'RESTORE_DRILL', 'RESTORE_VERIFICATION', 'RPO_RTO_REVIEW', 'OTHER');

-- CreateTable
CREATE TABLE "BackupRestoreEvidence" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "scope" "BackupRestoreEvidenceScope" NOT NULL DEFAULT 'ORGANIZATION',
    "status" "BackupRestoreEvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "evidenceType" "BackupRestoreEvidenceType" NOT NULL,
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

    CONSTRAINT "BackupRestoreEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_organizationId_idx" ON "BackupRestoreEvidence"("organizationId");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_scope_idx" ON "BackupRestoreEvidence"("scope");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_status_idx" ON "BackupRestoreEvidence"("status");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_evidenceType_idx" ON "BackupRestoreEvidence"("evidenceType");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_organizationId_status_idx" ON "BackupRestoreEvidence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_organizationId_evidenceType_idx" ON "BackupRestoreEvidence"("organizationId", "evidenceType");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_createdById_idx" ON "BackupRestoreEvidence"("createdById");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_verifiedById_idx" ON "BackupRestoreEvidence"("verifiedById");

-- CreateIndex
CREATE INDEX "BackupRestoreEvidence_revokedById_idx" ON "BackupRestoreEvidence"("revokedById");

-- AddForeignKey
ALTER TABLE "BackupRestoreEvidence" ADD CONSTRAINT "BackupRestoreEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupRestoreEvidence" ADD CONSTRAINT "BackupRestoreEvidence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupRestoreEvidence" ADD CONSTRAINT "BackupRestoreEvidence_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupRestoreEvidence" ADD CONSTRAINT "BackupRestoreEvidence_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
