CREATE TYPE "ZatcaSignedArtifactStoragePolicyApprovalStatus" AS ENUM ('DRAFT', 'APPROVED', 'REVOKED', 'SUPERSEDED');

CREATE TYPE "ZatcaSignedArtifactStoragePolicyRetentionStatus" AS ENUM ('NOT_REVIEWED', 'APPROVED', 'REQUIRES_LEGAL_REVIEW');

CREATE TABLE "ZatcaSignedArtifactStoragePolicyApproval" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "status" "ZatcaSignedArtifactStoragePolicyApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "policyVersion" TEXT NOT NULL,
    "policyHash" TEXT NOT NULL,
    "policySummaryJson" JSONB NOT NULL,
    "retentionDurationStatus" "ZatcaSignedArtifactStoragePolicyRetentionStatus" NOT NULL DEFAULT 'REQUIRES_LEGAL_REVIEW',
    "retentionDurationValue" TEXT,
    "objectVersioningApproved" BOOLEAN NOT NULL DEFAULT false,
    "immutableArchiveApproved" BOOLEAN NOT NULL DEFAULT false,
    "deletionPolicyApproved" BOOLEAN NOT NULL DEFAULT false,
    "supersessionPolicyApproved" BOOLEAN NOT NULL DEFAULT false,
    "accessControlApproved" BOOLEAN NOT NULL DEFAULT false,
    "encryptionAtRestApproved" BOOLEAN NOT NULL DEFAULT false,
    "backupRestoreApproved" BOOLEAN NOT NULL DEFAULT false,
    "archiveRestoreTested" BOOLEAN NOT NULL DEFAULT false,
    "signedXmlBodyPersistenceAllowed" BOOLEAN NOT NULL DEFAULT false,
    "qrPayloadBodyPersistenceAllowed" BOOLEAN NOT NULL DEFAULT false,
    "productionCompliance" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "createdById" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZatcaSignedArtifactStoragePolicyApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZatcaSignedArtifactStoragePolicyApproval_organizationId_idx" ON "ZatcaSignedArtifactStoragePolicyApproval"("organizationId");
CREATE INDEX "ZatcaSignedArtifactStoragePolicyApproval_status_idx" ON "ZatcaSignedArtifactStoragePolicyApproval"("status");
CREATE INDEX "ZatcaSignedArtifactStoragePolicyApproval_policyHash_idx" ON "ZatcaSignedArtifactStoragePolicyApproval"("policyHash");
CREATE INDEX "ZatcaSignedArtifactStoragePolicyApproval_createdById_idx" ON "ZatcaSignedArtifactStoragePolicyApproval"("createdById");
CREATE INDEX "ZatcaSignedArtifactStoragePolicyApproval_approvedById_idx" ON "ZatcaSignedArtifactStoragePolicyApproval"("approvedById");
CREATE INDEX "ZatcaSignedArtifactStoragePolicyApproval_revokedById_idx" ON "ZatcaSignedArtifactStoragePolicyApproval"("revokedById");

ALTER TABLE "ZatcaSignedArtifactStoragePolicyApproval"
    ADD CONSTRAINT "ZatcaSignedArtifactStoragePolicyApproval_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStoragePolicyApproval"
    ADD CONSTRAINT "ZatcaSignedArtifactStoragePolicyApproval_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStoragePolicyApproval"
    ADD CONSTRAINT "ZatcaSignedArtifactStoragePolicyApproval_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZatcaSignedArtifactStoragePolicyApproval"
    ADD CONSTRAINT "ZatcaSignedArtifactStoragePolicyApproval_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
