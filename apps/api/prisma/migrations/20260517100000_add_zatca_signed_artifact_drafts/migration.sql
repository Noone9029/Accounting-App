CREATE TYPE "ZatcaSignedArtifactDraftStatus" AS ENUM ('PLANNED', 'BLOCKED', 'SUPERSEDED');

CREATE TYPE "ZatcaSignedArtifactDraftSource" AS ENUM ('LOCAL_DRY_RUN', 'FUTURE_PRODUCTION_SIGNING');

CREATE TABLE "ZatcaSignedArtifactDraft" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "metadataId" UUID NOT NULL,
  "status" "ZatcaSignedArtifactDraftStatus" NOT NULL DEFAULT 'PLANNED',
  "source" "ZatcaSignedArtifactDraftSource" NOT NULL DEFAULT 'LOCAL_DRY_RUN',
  "signedXmlStorageKey" TEXT,
  "signedXmlSha256" TEXT,
  "signedXmlSizeBytes" INTEGER,
  "qrPayloadStorageKey" TEXT,
  "qrPayloadSha256" TEXT,
  "validationGlobalResult" TEXT,
  "validationResultsJson" JSONB,
  "signedWithDummyMaterial" BOOLEAN NOT NULL DEFAULT false,
  "productionCompliance" BOOLEAN NOT NULL DEFAULT false,
  "promotionBlockedReason" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ZatcaSignedArtifactDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ZatcaSignedArtifactDraft_organizationId_idx" ON "ZatcaSignedArtifactDraft"("organizationId");
CREATE INDEX "ZatcaSignedArtifactDraft_invoiceId_idx" ON "ZatcaSignedArtifactDraft"("invoiceId");
CREATE INDEX "ZatcaSignedArtifactDraft_metadataId_idx" ON "ZatcaSignedArtifactDraft"("metadataId");
CREATE INDEX "ZatcaSignedArtifactDraft_status_idx" ON "ZatcaSignedArtifactDraft"("status");
CREATE INDEX "ZatcaSignedArtifactDraft_createdById_idx" ON "ZatcaSignedArtifactDraft"("createdById");

ALTER TABLE "ZatcaSignedArtifactDraft" ADD CONSTRAINT "ZatcaSignedArtifactDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSignedArtifactDraft" ADD CONSTRAINT "ZatcaSignedArtifactDraft_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSignedArtifactDraft" ADD CONSTRAINT "ZatcaSignedArtifactDraft_metadataId_fkey" FOREIGN KEY ("metadataId") REFERENCES "ZatcaInvoiceMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSignedArtifactDraft" ADD CONSTRAINT "ZatcaSignedArtifactDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
