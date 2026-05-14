-- Add user-uploaded attachment metadata and database-backed MVP storage.
CREATE TYPE "AttachmentStorageProvider" AS ENUM (
  'DATABASE',
  'LOCAL_PLACEHOLDER',
  'S3_PLACEHOLDER'
);

CREATE TYPE "AttachmentLinkedEntityType" AS ENUM (
  'SALES_INVOICE',
  'CUSTOMER_PAYMENT',
  'CREDIT_NOTE',
  'CUSTOMER_REFUND',
  'PURCHASE_BILL',
  'SUPPLIER_PAYMENT',
  'PURCHASE_DEBIT_NOTE',
  'SUPPLIER_REFUND',
  'PURCHASE_ORDER',
  'CASH_EXPENSE',
  'BANK_STATEMENT_IMPORT',
  'BANK_STATEMENT_TRANSACTION',
  'BANK_RECONCILIATION',
  'PURCHASE_RECEIPT',
  'SALES_STOCK_ISSUE',
  'INVENTORY_ADJUSTMENT',
  'WAREHOUSE_TRANSFER',
  'INVENTORY_VARIANCE_PROPOSAL',
  'CONTACT',
  'ITEM',
  'MANUAL_JOURNAL',
  'OTHER'
);

CREATE TYPE "AttachmentStatus" AS ENUM (
  'ACTIVE',
  'DELETED'
);

CREATE TABLE "Attachment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "linkedEntityType" "AttachmentLinkedEntityType" NOT NULL,
  "linkedEntityId" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageProvider" "AttachmentStorageProvider" NOT NULL DEFAULT 'DATABASE',
  "storageKey" TEXT,
  "contentBase64" TEXT,
  "contentHash" TEXT NOT NULL,
  "status" "AttachmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "uploadedById" UUID,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedById" UUID,
  "deletedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachment_organizationId_idx" ON "Attachment"("organizationId");
CREATE INDEX "Attachment_organizationId_linkedEntityType_linkedEntityId_idx" ON "Attachment"("organizationId", "linkedEntityType", "linkedEntityId");
CREATE INDEX "Attachment_organizationId_status_idx" ON "Attachment"("organizationId", "status");
CREATE INDEX "Attachment_contentHash_idx" ON "Attachment"("contentHash");
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");
CREATE INDEX "Attachment_deletedById_idx" ON "Attachment"("deletedById");

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
