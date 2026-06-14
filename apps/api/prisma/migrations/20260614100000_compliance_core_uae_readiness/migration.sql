-- Compliance core foundation and UAE eInvoicing readiness fields.
-- Additive only: no backfill, posting, ASP network calls, ZATCA calls, signing,
-- clearance/reporting, PDF-A3 generation, or production compliance enablement.

CREATE TYPE "ComplianceCountryCode" AS ENUM ('GENERIC', 'AE', 'SA');
CREATE TYPE "ComplianceProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED', 'BLOCKED');
CREATE TYPE "ComplianceProviderType" AS ENUM ('DISABLED', 'MOCK', 'ASP_PARTNER', 'ZATCA_LOCAL', 'ZATCA_SANDBOX_BLOCKED');
CREATE TYPE "ComplianceDocumentSourceType" AS ENUM ('SALES_INVOICE', 'CREDIT_NOTE');
CREATE TYPE "ComplianceDocumentType" AS ENUM ('INVOICE', 'TAX_INVOICE', 'COMMERCIAL_INVOICE', 'CREDIT_NOTE', 'TAX_CREDIT_NOTE', 'SELF_BILLED_INVOICE', 'SELF_BILLED_CREDIT_NOTE');
CREATE TYPE "ComplianceDocumentStatus" AS ENUM ('DRAFT', 'READY_FOR_VALIDATION', 'VALIDATION_FAILED', 'READY_FOR_ASP', 'SUBMITTED_TO_ASP', 'ACCEPTED_BY_ASP', 'REJECTED_BY_ASP', 'REPORTED_TO_FTA', 'DELIVERED_TO_BUYER', 'FAILED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "ComplianceValidationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'WARNING');
CREATE TYPE "ComplianceTransmissionStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'REPORTED', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "ComplianceArchiveArtifactType" AS ENUM ('XML', 'SUBMISSION_PAYLOAD', 'ASP_RESPONSE', 'FTA_CONFIRMATION', 'VALIDATION_REPORT', 'AUDIT_EXPORT');

ALTER TABLE "Organization" ADD COLUMN "tradeLicenseNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeTrn" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeTin" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeVatRegistrationStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeAddressLine1" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeAddressLine2" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeEmirate" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeBusinessActivity" TEXT;
ALTER TABLE "Organization" ADD COLUMN "peppolParticipantId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeAspSelected" TEXT;
ALTER TABLE "Organization" ADD COLUMN "uaeAspOnboardingStatus" TEXT;

ALTER TABLE "Contact" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Contact" ADD COLUMN "uaeTrn" TEXT;
ALTER TABLE "Contact" ADD COLUMN "uaeTin" TEXT;
ALTER TABLE "Contact" ADD COLUMN "uaeVatRegistrationStatus" TEXT;
ALTER TABLE "Contact" ADD COLUMN "uaeAddressLine1" TEXT;
ALTER TABLE "Contact" ADD COLUMN "uaeAddressLine2" TEXT;
ALTER TABLE "Contact" ADD COLUMN "uaeEmirate" TEXT;
ALTER TABLE "Contact" ADD COLUMN "peppolParticipantId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "peppolEndpointStatus" TEXT;
ALTER TABLE "Contact" ADD COLUMN "preferredEinvoiceDeliveryMethod" TEXT;

CREATE TABLE "ComplianceProvider" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "countryCode" "ComplianceCountryCode" NOT NULL,
    "providerType" "ComplianceProviderType" NOT NULL DEFAULT 'DISABLED',
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISABLED',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "providerId" UUID,
    "countryCode" "ComplianceCountryCode" NOT NULL,
    "profileKey" TEXT NOT NULL,
    "status" "ComplianceProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "settingsJson" JSONB,
    "readinessJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "profileId" UUID,
    "countryCode" "ComplianceCountryCode" NOT NULL,
    "sourceType" "ComplianceDocumentSourceType" NOT NULL,
    "sourceId" UUID NOT NULL,
    "documentType" "ComplianceDocumentType" NOT NULL,
    "status" "ComplianceDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "documentNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "currency" TEXT,
    "latestValidationStatus" "ComplianceValidationStatus",
    "validationSummaryJson" JSONB,
    "sourceSnapshotJson" JSONB,
    "latestArchiveRecordId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceValidationResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "complianceDocumentId" UUID NOT NULL,
    "status" "ComplianceValidationStatus" NOT NULL,
    "validatorKey" TEXT NOT NULL,
    "summary" TEXT,
    "issuesJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceValidationResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceTransmission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "complianceDocumentId" UUID NOT NULL,
    "providerId" UUID,
    "status" "ComplianceTransmissionStatus" NOT NULL DEFAULT 'QUEUED',
    "channel" TEXT NOT NULL DEFAULT 'disabled',
    "externalReference" TEXT,
    "submittedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceTransmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ComplianceEventLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "complianceDocumentId" UUID,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "message" TEXT,
    "metadataJson" JSONB,
    "actorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceEventLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentArchiveRecord" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "complianceDocumentId" UUID,
    "artifactType" "ComplianceArchiveArtifactType" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/xml',
    "storageProvider" TEXT NOT NULL DEFAULT 'metadata-only',
    "storageKey" TEXT,
    "contentHash" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "metadataJson" JSONB,
    "createdById" UUID,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentArchiveRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ComplianceProvider_organizationId_idx" ON "ComplianceProvider"("organizationId");
CREATE INDEX "ComplianceProvider_organizationId_countryCode_idx" ON "ComplianceProvider"("organizationId", "countryCode");
CREATE INDEX "ComplianceProvider_organizationId_providerType_idx" ON "ComplianceProvider"("organizationId", "providerType");

CREATE UNIQUE INDEX "ComplianceProfile_organizationId_countryCode_profileKey_key" ON "ComplianceProfile"("organizationId", "countryCode", "profileKey");
CREATE INDEX "ComplianceProfile_organizationId_idx" ON "ComplianceProfile"("organizationId");
CREATE INDEX "ComplianceProfile_providerId_idx" ON "ComplianceProfile"("providerId");
CREATE INDEX "ComplianceProfile_organizationId_status_idx" ON "ComplianceProfile"("organizationId", "status");

CREATE UNIQUE INDEX "ComplianceDocument_organizationId_countryCode_sourceType_sourceId_key" ON "ComplianceDocument"("organizationId", "countryCode", "sourceType", "sourceId");
CREATE INDEX "ComplianceDocument_organizationId_idx" ON "ComplianceDocument"("organizationId");
CREATE INDEX "ComplianceDocument_organizationId_status_idx" ON "ComplianceDocument"("organizationId", "status");
CREATE INDEX "ComplianceDocument_profileId_idx" ON "ComplianceDocument"("profileId");
CREATE INDEX "ComplianceDocument_latestArchiveRecordId_idx" ON "ComplianceDocument"("latestArchiveRecordId");

CREATE INDEX "ComplianceValidationResult_organizationId_idx" ON "ComplianceValidationResult"("organizationId");
CREATE INDEX "ComplianceValidationResult_complianceDocumentId_idx" ON "ComplianceValidationResult"("complianceDocumentId");
CREATE INDEX "ComplianceValidationResult_organizationId_status_idx" ON "ComplianceValidationResult"("organizationId", "status");

CREATE INDEX "ComplianceTransmission_organizationId_idx" ON "ComplianceTransmission"("organizationId");
CREATE INDEX "ComplianceTransmission_complianceDocumentId_idx" ON "ComplianceTransmission"("complianceDocumentId");
CREATE INDEX "ComplianceTransmission_providerId_idx" ON "ComplianceTransmission"("providerId");
CREATE INDEX "ComplianceTransmission_organizationId_status_idx" ON "ComplianceTransmission"("organizationId", "status");

CREATE INDEX "ComplianceEventLog_organizationId_idx" ON "ComplianceEventLog"("organizationId");
CREATE INDEX "ComplianceEventLog_complianceDocumentId_idx" ON "ComplianceEventLog"("complianceDocumentId");
CREATE INDEX "ComplianceEventLog_actorUserId_idx" ON "ComplianceEventLog"("actorUserId");
CREATE INDEX "ComplianceEventLog_organizationId_eventType_idx" ON "ComplianceEventLog"("organizationId", "eventType");

CREATE INDEX "DocumentArchiveRecord_organizationId_idx" ON "DocumentArchiveRecord"("organizationId");
CREATE INDEX "DocumentArchiveRecord_complianceDocumentId_idx" ON "DocumentArchiveRecord"("complianceDocumentId");
CREATE INDEX "DocumentArchiveRecord_organizationId_artifactType_idx" ON "DocumentArchiveRecord"("organizationId", "artifactType");
CREATE INDEX "DocumentArchiveRecord_organizationId_sourceType_sourceId_idx" ON "DocumentArchiveRecord"("organizationId", "sourceType", "sourceId");
CREATE INDEX "DocumentArchiveRecord_contentHash_idx" ON "DocumentArchiveRecord"("contentHash");
CREATE INDEX "DocumentArchiveRecord_createdById_idx" ON "DocumentArchiveRecord"("createdById");

ALTER TABLE "ComplianceProvider" ADD CONSTRAINT "ComplianceProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceProfile" ADD CONSTRAINT "ComplianceProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceProfile" ADD CONSTRAINT "ComplianceProfile_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ComplianceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ComplianceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceValidationResult" ADD CONSTRAINT "ComplianceValidationResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceValidationResult" ADD CONSTRAINT "ComplianceValidationResult_complianceDocumentId_fkey" FOREIGN KEY ("complianceDocumentId") REFERENCES "ComplianceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceTransmission" ADD CONSTRAINT "ComplianceTransmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceTransmission" ADD CONSTRAINT "ComplianceTransmission_complianceDocumentId_fkey" FOREIGN KEY ("complianceDocumentId") REFERENCES "ComplianceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceTransmission" ADD CONSTRAINT "ComplianceTransmission_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ComplianceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceEventLog" ADD CONSTRAINT "ComplianceEventLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceEventLog" ADD CONSTRAINT "ComplianceEventLog_complianceDocumentId_fkey" FOREIGN KEY ("complianceDocumentId") REFERENCES "ComplianceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplianceEventLog" ADD CONSTRAINT "ComplianceEventLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentArchiveRecord" ADD CONSTRAINT "DocumentArchiveRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentArchiveRecord" ADD CONSTRAINT "DocumentArchiveRecord_complianceDocumentId_fkey" FOREIGN KEY ("complianceDocumentId") REFERENCES "ComplianceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentArchiveRecord" ADD CONSTRAINT "DocumentArchiveRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComplianceDocument" ADD CONSTRAINT "ComplianceDocument_latestArchiveRecordId_fkey" FOREIGN KEY ("latestArchiveRecordId") REFERENCES "DocumentArchiveRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
