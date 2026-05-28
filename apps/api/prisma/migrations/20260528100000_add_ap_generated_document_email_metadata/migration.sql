-- AlterEnum
ALTER TYPE "EmailTemplateType" ADD VALUE 'AP_GENERATED_DOCUMENT';

-- AlterTable
ALTER TABLE "EmailOutbox"
ADD COLUMN "generatedDocumentId" UUID,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "attachmentFilename" TEXT,
ADD COLUMN "attachmentMimeType" TEXT,
ADD COLUMN "attachmentSizeBytes" INTEGER,
ADD COLUMN "attachmentContentHash" TEXT;

-- CreateIndex
CREATE INDEX "EmailOutbox_organizationId_generatedDocumentId_idx" ON "EmailOutbox"("organizationId", "generatedDocumentId");

-- CreateIndex
CREATE INDEX "EmailOutbox_organizationId_sourceType_sourceId_idx" ON "EmailOutbox"("organizationId", "sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "GeneratedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
