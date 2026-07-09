CREATE TYPE "ImportEntityType" AS ENUM ('CUSTOMERS', 'SUPPLIERS', 'PRODUCTS_SERVICES', 'CHART_OF_ACCOUNTS');

CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'READY_FOR_REVIEW', 'COMMITTED_LOCAL', 'FAILED', 'CANCELLED');

CREATE TYPE "ImportJobRowStatus" AS ENUM ('VALID', 'INVALID', 'DUPLICATE', 'COMMIT_BLOCKED', 'COMMITTED');

CREATE TYPE "ImportValidationIssueSeverity" AS ENUM ('ERROR', 'WARNING');

CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "filename" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL DEFAULT 'LOCAL_CSV_UPLOAD',
    "previewOnly" BOOLEAN NOT NULL DEFAULT true,
    "summaryJson" JSONB NOT NULL,
    "requestId" TEXT,
    "createdById" UUID,
    "committedById" UUID,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportJobRow" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "importJobId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "ImportJobRowStatus" NOT NULL DEFAULT 'VALID',
    "rawJson" JSONB NOT NULL,
    "normalizedJson" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJobRow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "version" TEXT NOT NULL,
    "headersJson" JSONB NOT NULL,
    "requiredHeadersJson" JSONB NOT NULL,
    "notesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportValidationIssue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "importJobId" UUID NOT NULL,
    "importJobRowId" UUID,
    "rowNumber" INTEGER,
    "field" TEXT,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "ImportValidationIssueSeverity" NOT NULL DEFAULT 'ERROR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportValidationIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportJob_organizationId_entityType_status_idx" ON "ImportJob"("organizationId", "entityType", "status");
CREATE INDEX "ImportJob_organizationId_createdAt_idx" ON "ImportJob"("organizationId", "createdAt");

CREATE UNIQUE INDEX "ImportJobRow_importJobId_rowNumber_key" ON "ImportJobRow"("importJobId", "rowNumber");
CREATE INDEX "ImportJobRow_organizationId_importJobId_idx" ON "ImportJobRow"("organizationId", "importJobId");
CREATE INDEX "ImportJobRow_organizationId_fingerprint_idx" ON "ImportJobRow"("organizationId", "fingerprint");

CREATE UNIQUE INDEX "ImportTemplate_organizationId_entityType_version_key" ON "ImportTemplate"("organizationId", "entityType", "version");
CREATE INDEX "ImportTemplate_organizationId_entityType_idx" ON "ImportTemplate"("organizationId", "entityType");

CREATE INDEX "ImportValidationIssue_organizationId_importJobId_idx" ON "ImportValidationIssue"("organizationId", "importJobId");
CREATE INDEX "ImportValidationIssue_organizationId_importJobRowId_idx" ON "ImportValidationIssue"("organizationId", "importJobRowId");

ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_committedById_fkey" FOREIGN KEY ("committedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportTemplate" ADD CONSTRAINT "ImportTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportValidationIssue" ADD CONSTRAINT "ImportValidationIssue_importJobRowId_fkey" FOREIGN KEY ("importJobRowId") REFERENCES "ImportJobRow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
