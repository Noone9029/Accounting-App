-- Report pack generation/download groundwork.
-- Stores local manifest metadata only; no report bodies, PDFs, signed URLs, storage payloads, or provider payloads.

CREATE TYPE "ReportPackStatus" AS ENUM (
    'DRAFT',
    'GENERATING',
    'READY_LOCAL',
    'FAILED',
    'DOWNLOAD_BLOCKED',
    'EXPIRED'
);

CREATE TABLE "ReportPack" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ReportPackStatus" NOT NULL DEFAULT 'DRAFT',
    "periodFrom" TEXT,
    "periodTo" TEXT,
    "periodAsOf" TEXT,
    "manifestJson" JSONB NOT NULL,
    "requestId" TEXT,
    "requestedById" UUID,
    "generatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportPack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportPack_organizationId_idx" ON "ReportPack"("organizationId");
CREATE INDEX "ReportPack_organizationId_status_idx" ON "ReportPack"("organizationId", "status");
CREATE INDEX "ReportPack_requestedById_idx" ON "ReportPack"("requestedById");
CREATE INDEX "ReportPack_requestId_idx" ON "ReportPack"("requestId");

ALTER TABLE "ReportPack"
ADD CONSTRAINT "ReportPack_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportPack"
ADD CONSTRAINT "ReportPack_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
