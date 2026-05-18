CREATE TYPE "ZatcaComplianceCsidCustodyRecordSource" AS ENUM ('MOCK', 'FUTURE_SANDBOX');

CREATE TYPE "ZatcaComplianceCsidCustodyRecordStatus" AS ENUM ('PLANNED', 'BLOCKED', 'FUTURE_READY', 'REVOKED');

CREATE TYPE "ZatcaComplianceCsidTokenStorageMode" AS ENUM ('NOT_STORED', 'FUTURE_SECRETS_MANAGER', 'FUTURE_ENCRYPTED_DB', 'FUTURE_KMS');

CREATE TYPE "ZatcaComplianceCsidSecretStorageMode" AS ENUM ('NOT_STORED', 'FUTURE_SECRETS_MANAGER', 'FUTURE_ENCRYPTED_DB', 'FUTURE_KMS');

CREATE TYPE "ZatcaComplianceCsidCertificateStorageMode" AS ENUM ('NOT_STORED', 'FUTURE_SECRETS_MANAGER', 'FUTURE_ENCRYPTED_DB', 'FUTURE_OBJECT_STORAGE');

CREATE TABLE "ZatcaComplianceCsidCustodyRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "egsUnitId" UUID NOT NULL,
    "source" "ZatcaComplianceCsidCustodyRecordSource" NOT NULL,
    "status" "ZatcaComplianceCsidCustodyRecordStatus" NOT NULL DEFAULT 'PLANNED',
    "requestId" TEXT,
    "certificateRequestId" TEXT,
    "hasBinarySecurityToken" BOOLEAN NOT NULL DEFAULT false,
    "hasSecret" BOOLEAN NOT NULL DEFAULT false,
    "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
    "tokenStorageMode" "ZatcaComplianceCsidTokenStorageMode" NOT NULL DEFAULT 'NOT_STORED',
    "secretStorageMode" "ZatcaComplianceCsidSecretStorageMode" NOT NULL DEFAULT 'NOT_STORED',
    "certificateStorageMode" "ZatcaComplianceCsidCertificateStorageMode" NOT NULL DEFAULT 'NOT_STORED',
    "expiryKnown" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "renewalRequired" BOOLEAN NOT NULL DEFAULT false,
    "signedWithProductionMaterial" BOOLEAN NOT NULL DEFAULT false,
    "productionCompliance" BOOLEAN NOT NULL DEFAULT false,
    "custodyBlockedReason" TEXT,
    "createdById" UUID,
    "revokedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZatcaComplianceCsidCustodyRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZatcaComplianceCsidCustodyRecord_organizationId_idx" ON "ZatcaComplianceCsidCustodyRecord"("organizationId");
CREATE INDEX "ZatcaComplianceCsidCustodyRecord_egsUnitId_idx" ON "ZatcaComplianceCsidCustodyRecord"("egsUnitId");
CREATE INDEX "ZatcaComplianceCsidCustodyRecord_source_idx" ON "ZatcaComplianceCsidCustodyRecord"("source");
CREATE INDEX "ZatcaComplianceCsidCustodyRecord_status_idx" ON "ZatcaComplianceCsidCustodyRecord"("status");
CREATE INDEX "ZatcaComplianceCsidCustodyRecord_certificateRequestId_idx" ON "ZatcaComplianceCsidCustodyRecord"("certificateRequestId");
CREATE INDEX "ZatcaComplianceCsidCustodyRecord_createdById_idx" ON "ZatcaComplianceCsidCustodyRecord"("createdById");
CREATE INDEX "ZatcaComplianceCsidCustodyRecord_revokedById_idx" ON "ZatcaComplianceCsidCustodyRecord"("revokedById");

ALTER TABLE "ZatcaComplianceCsidCustodyRecord"
    ADD CONSTRAINT "ZatcaComplianceCsidCustodyRecord_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZatcaComplianceCsidCustodyRecord"
    ADD CONSTRAINT "ZatcaComplianceCsidCustodyRecord_egsUnitId_fkey"
    FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZatcaComplianceCsidCustodyRecord"
    ADD CONSTRAINT "ZatcaComplianceCsidCustodyRecord_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ZatcaComplianceCsidCustodyRecord"
    ADD CONSTRAINT "ZatcaComplianceCsidCustodyRecord_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
