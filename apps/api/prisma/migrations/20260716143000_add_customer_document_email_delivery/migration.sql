-- Additive customer-document delivery metadata and quote/proforma identity.
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SALES_QUOTE';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'CREDIT_NOTE';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'CUSTOMER_STATEMENT';

CREATE TYPE "SalesQuoteDocumentKind" AS ENUM ('QUOTE', 'PROFORMA');

ALTER TABLE "SalesQuote"
ADD COLUMN "documentKind" "SalesQuoteDocumentKind" NOT NULL DEFAULT 'QUOTE';

ALTER TABLE "EmailOutbox"
ADD COLUMN "sourceNumber" TEXT,
ADD COLUMN "documentType" "DocumentType",
ADD COLUMN "sourceContextJson" JSONB;
