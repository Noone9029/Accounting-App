-- Add metadata-only ZATCA key custody and CSID lifecycle tracking.
-- This migration models safe lifecycle metadata only. It does not store OTPs,
-- raw private keys, raw CSRs, raw certificates, CSID token/secret bodies,
-- signed XML, QR payloads, request bodies, or response bodies.
CREATE TYPE "ZatcaCredentialLifecycleStatus" AS ENUM (
  'NOT_CONFIGURED',
  'CSR_PENDING',
  'OTP_REQUIRED',
  'COMPLIANCE_CSID_PENDING',
  'COMPLIANCE_CSID_ACTIVE',
  'PRODUCTION_CSID_PENDING',
  'PRODUCTION_CSID_ACTIVE',
  'ROTATION_REQUIRED',
  'REVOKED',
  'DISABLED',
  'ERROR'
);

CREATE TYPE "ZatcaCredentialCustodyProviderType" AS ENUM (
  'NONE',
  'EXTERNAL_KMS',
  'EXTERNAL_HSM',
  'MANAGED_SECRET_REFERENCE',
  'DUMMY_LOCAL'
);

CREATE TABLE "ZatcaCredentialLifecycle" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "egsUnitId" UUID NOT NULL,
  "environment" "ZatcaEnvironment" NOT NULL,
  "lifecycleStatus" "ZatcaCredentialLifecycleStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "custodyProviderType" "ZatcaCredentialCustodyProviderType" NOT NULL DEFAULT 'NONE',
  "custodyReferenceAlias" TEXT,
  "certificateFingerprint" TEXT,
  "certificateSerialNumber" TEXT,
  "certificateIssuer" TEXT,
  "certificateSubject" TEXT,
  "certificateNotBefore" TIMESTAMP(3),
  "certificateExpiresAt" TIMESTAMP(3),
  "certificateRequestId" TEXT,
  "complianceCsidStatus" "ZatcaCredentialLifecycleStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "productionCsidStatus" "ZatcaCredentialLifecycleStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "lastReadinessCheckAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "statusReason" TEXT,
  "errorCode" TEXT,
  "productionCompliance" BOOLEAN NOT NULL DEFAULT false,
  "metadataOnly" BOOLEAN NOT NULL DEFAULT true,
  "createdById" UUID,
  "updatedById" UUID,
  "disabledById" UUID,
  "revokedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaCredentialLifecycle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZatcaCredentialLifecycle_organizationId_egsUnitId_environment_key" ON "ZatcaCredentialLifecycle"("organizationId", "egsUnitId", "environment");
CREATE INDEX "ZatcaCredentialLifecycle_organizationId_idx" ON "ZatcaCredentialLifecycle"("organizationId");
CREATE INDEX "ZatcaCredentialLifecycle_egsUnitId_idx" ON "ZatcaCredentialLifecycle"("egsUnitId");
CREATE INDEX "ZatcaCredentialLifecycle_environment_idx" ON "ZatcaCredentialLifecycle"("environment");
CREATE INDEX "ZatcaCredentialLifecycle_lifecycleStatus_idx" ON "ZatcaCredentialLifecycle"("lifecycleStatus");
CREATE INDEX "ZatcaCredentialLifecycle_complianceCsidStatus_idx" ON "ZatcaCredentialLifecycle"("complianceCsidStatus");
CREATE INDEX "ZatcaCredentialLifecycle_productionCsidStatus_idx" ON "ZatcaCredentialLifecycle"("productionCsidStatus");
CREATE INDEX "ZatcaCredentialLifecycle_custodyProviderType_idx" ON "ZatcaCredentialLifecycle"("custodyProviderType");
CREATE INDEX "ZatcaCredentialLifecycle_certificateExpiresAt_idx" ON "ZatcaCredentialLifecycle"("certificateExpiresAt");
CREATE INDEX "ZatcaCredentialLifecycle_createdById_idx" ON "ZatcaCredentialLifecycle"("createdById");
CREATE INDEX "ZatcaCredentialLifecycle_updatedById_idx" ON "ZatcaCredentialLifecycle"("updatedById");
CREATE INDEX "ZatcaCredentialLifecycle_disabledById_idx" ON "ZatcaCredentialLifecycle"("disabledById");
CREATE INDEX "ZatcaCredentialLifecycle_revokedById_idx" ON "ZatcaCredentialLifecycle"("revokedById");

ALTER TABLE "ZatcaCredentialLifecycle"
  ADD CONSTRAINT "ZatcaCredentialLifecycle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ZatcaCredentialLifecycle_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ZatcaCredentialLifecycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ZatcaCredentialLifecycle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ZatcaCredentialLifecycle_disabledById_fkey" FOREIGN KEY ("disabledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ZatcaCredentialLifecycle_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
