-- CreateEnum
CREATE TYPE "SalesInvoiceTaxMode" AS ENUM ('TAX_EXCLUSIVE', 'TAX_INCLUSIVE', 'NO_TAX');

-- AlterTable
ALTER TABLE "SalesInvoice"
ADD COLUMN "taxMode" "SalesInvoiceTaxMode" NOT NULL DEFAULT 'TAX_EXCLUSIVE';
