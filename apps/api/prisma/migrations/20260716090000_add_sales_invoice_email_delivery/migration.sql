-- Additive sales-invoice delivery metadata. Existing invite, reset, test, and AP rows retain NULL source/idempotency values.
ALTER TABLE "EmailOutbox"
ADD COLUMN "salesInvoiceId" UUID,
ADD COLUMN "requestedById" UUID,
ADD COLUMN "idempotencyKeyHash" TEXT,
ADD COLUMN "requestHash" TEXT;

CREATE INDEX "EmailOutbox_organizationId_salesInvoiceId_createdAt_idx"
ON "EmailOutbox"("organizationId", "salesInvoiceId", "createdAt");

CREATE UNIQUE INDEX "EmailOutbox_organizationId_idempotencyKeyHash_key"
ON "EmailOutbox"("organizationId", "idempotencyKeyHash");

ALTER TABLE "EmailOutbox"
ADD CONSTRAINT "EmailOutbox_salesInvoiceId_fkey"
FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailOutbox"
ADD CONSTRAINT "EmailOutbox_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
