-- ARC-07B local-only metadata foundation. This migration deliberately stores no
-- credential, XML, QR, request, or response bodies.
CREATE TYPE "ZatcaSandboxProofRunStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLEANED_UP', 'FAILED');
CREATE TYPE "ZatcaSandboxSubmissionOperation" AS ENUM ('COMPLIANCE_DOCUMENT', 'CLEARANCE', 'REPORTING');
CREATE TYPE "ZatcaSandboxSubmissionStateStatus" AS ENUM ('RESERVED', 'UNCERTAIN', 'ACCEPTED', 'REJECTED', 'FAILED', 'CLEANED_UP');
CREATE TYPE "ZatcaSandboxRetryClassification" AS ENUM ('NOT_RETRYABLE', 'RETRYABLE', 'REPLAY', 'CONFLICT');

CREATE TABLE "ZatcaSandboxProofRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "egsUnitId" UUID NOT NULL,
  "environment" "ZatcaEnvironment" NOT NULL,
  "proofRunId" TEXT NOT NULL,
  "status" "ZatcaSandboxProofRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "syntheticDataVerified" BOOLEAN NOT NULL DEFAULT true,
  "cleanupCompletedAt" TIMESTAMP(3),
  "cleanupReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaSandboxProofRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaSandboxSubmissionState" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "egsUnitId" UUID NOT NULL,
  "proofRunId" UUID NOT NULL,
  "invoiceMetadataId" UUID,
  "sourceIdentityHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "invoiceUuid" TEXT NOT NULL,
  "invoiceType" "ZatcaInvoiceType" NOT NULL,
  "icv" INTEGER NOT NULL,
  "previousInvoiceHash" TEXT NOT NULL,
  "canonicalInvoiceHash" TEXT NOT NULL,
  "signedArtifactHash" TEXT,
  "signingKeyReferenceId" TEXT,
  "credentialReferenceId" TEXT,
  "certificateFingerprint" TEXT,
  "certificateSerialNumber" TEXT,
  "certificateExpiresAt" TIMESTAMP(3),
  "operation" "ZatcaSandboxSubmissionOperation" NOT NULL,
  "status" "ZatcaSandboxSubmissionStateStatus" NOT NULL DEFAULT 'RESERVED',
  "reservationToken" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cleanupCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaSandboxSubmissionState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaSandboxSubmissionAttempt" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "submissionStateId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "ZatcaSandboxSubmissionStateStatus" NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseHash" TEXT,
  "responseCode" TEXT,
  "warningCodes" JSONB,
  "errorCodes" JSONB,
  "correlationId" TEXT NOT NULL,
  "retryClassification" "ZatcaSandboxRetryClassification" NOT NULL DEFAULT 'NOT_RETRYABLE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaSandboxSubmissionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZatcaSandboxProofRun_organizationId_proofRunId_key" ON "ZatcaSandboxProofRun"("organizationId", "proofRunId");
CREATE INDEX "ZatcaSandboxProofRun_organizationId_status_idx" ON "ZatcaSandboxProofRun"("organizationId", "status");
CREATE INDEX "ZatcaSandboxProofRun_egsUnitId_idx" ON "ZatcaSandboxProofRun"("egsUnitId");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionState_organizationId_sourceIdentityHash_key" ON "ZatcaSandboxSubmissionState"("organizationId", "sourceIdentityHash");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionState_organizationId_egsUnitId_icv_key" ON "ZatcaSandboxSubmissionState"("organizationId", "egsUnitId", "icv");
CREATE INDEX "ZatcaSandboxSubmissionState_proofRunId_status_idx" ON "ZatcaSandboxSubmissionState"("proofRunId", "status");
CREATE INDEX "ZatcaSandboxSubmissionState_invoiceMetadataId_idx" ON "ZatcaSandboxSubmissionState"("invoiceMetadataId");
CREATE INDEX "ZatcaSandboxSubmissionState_organizationId_egsUnitId_status_idx" ON "ZatcaSandboxSubmissionState"("organizationId", "egsUnitId", "status");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionAttempt_submissionStateId_attemptNumber_key" ON "ZatcaSandboxSubmissionAttempt"("submissionStateId", "attemptNumber");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionAttempt_organizationId_correlationId_key" ON "ZatcaSandboxSubmissionAttempt"("organizationId", "correlationId");
CREATE INDEX "ZatcaSandboxSubmissionAttempt_organizationId_status_idx" ON "ZatcaSandboxSubmissionAttempt"("organizationId", "status");
CREATE INDEX "ZatcaSandboxSubmissionAttempt_submissionStateId_status_idx" ON "ZatcaSandboxSubmissionAttempt"("submissionStateId", "status");

ALTER TABLE "ZatcaSandboxProofRun" ADD CONSTRAINT "ZatcaSandboxProofRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxProofRun" ADD CONSTRAINT "ZatcaSandboxProofRun_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_proofRunId_fkey" FOREIGN KEY ("proofRunId") REFERENCES "ZatcaSandboxProofRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_invoiceMetadataId_fkey" FOREIGN KEY ("invoiceMetadataId") REFERENCES "ZatcaInvoiceMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionAttempt" ADD CONSTRAINT "ZatcaSandboxSubmissionAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionAttempt" ADD CONSTRAINT "ZatcaSandboxSubmissionAttempt_submissionStateId_fkey" FOREIGN KEY ("submissionStateId") REFERENCES "ZatcaSandboxSubmissionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
