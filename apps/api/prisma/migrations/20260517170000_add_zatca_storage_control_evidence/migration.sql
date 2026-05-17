CREATE TYPE "ZatcaSignedArtifactStorageControlEvidenceStatus" AS ENUM ('DRAFT', 'VERIFIED', 'REVOKED', 'SUPERSEDED');

CREATE TYPE "ZatcaSignedArtifactStorageControlEvidenceType" AS ENUM ('OBJECT_VERSIONING', 'IMMUTABLE_RETENTION', 'ENCRYPTION_AT_REST', 'ACCESS_CONTROL', 'BACKUP_RESTORE', 'RESTORE_TEST', 'TENANT_KEY_SCOPING', 'DELETION_SUPERSESSION', 'STORAGE_PROBE', 'OTHER');

CREATE TABLE "ZatcaSignedArtifactStorageControlEvidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "policyApprovalId" UUID,
    "status" "ZatcaSignedArtifactStorageControlEvidenceStatus" NOT NULL DEFAULT 'DRAFT',
    "evidenceType" "ZatcaSignedArtifactStorageControlEvidenceType" NOT NULL,
    "provider" TEXT,
    "bucketNameRedacted" TEXT,
    "evidenceSummaryJson" JSONB NOT NULL,
    "evidenceHash" TEXT,
    "evidenceDocumentStorageKey" TEXT,
    "verifiedById" UUID,
    "verifiedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    "productionCompliance" BOOLEAN NOT NULL DEFAULT false,
    "signedXmlBodyPersistenceAllowed" BOOLEAN NOT NULL DEFAULT false,
    "qrPayloadBodyPersistenceAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZatcaSignedArtifactStorageControlEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_organizationId_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("organizationId");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_policyApprovalId_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("policyApprovalId");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_status_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("status");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_evidenceType_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("evidenceType");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_evidenceHash_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("evidenceHash");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_createdById_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("createdById");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_verifiedById_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("verifiedById");
CREATE INDEX "ZatcaSignedArtifactStorageControlEvidence_revokedById_idx" ON "ZatcaSignedArtifactStorageControlEvidence"("revokedById");

ALTER TABLE "ZatcaSignedArtifactStorageControlEvidence"
    ADD CONSTRAINT "ZatcaSignedArtifactStorageControlEvidence_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStorageControlEvidence"
    ADD CONSTRAINT "ZatcaSignedArtifactStorageControlEvidence_policyApprovalId_fkey"
    FOREIGN KEY ("policyApprovalId") REFERENCES "ZatcaSignedArtifactStoragePolicyApproval"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStorageControlEvidence"
    ADD CONSTRAINT "ZatcaSignedArtifactStorageControlEvidence_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStorageControlEvidence"
    ADD CONSTRAINT "ZatcaSignedArtifactStorageControlEvidence_verifiedById_fkey"
    FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStorageControlEvidence"
    ADD CONSTRAINT "ZatcaSignedArtifactStorageControlEvidence_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
