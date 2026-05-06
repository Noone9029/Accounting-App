ALTER TABLE "Item" DROP CONSTRAINT "Item_salesTaxRateId_fkey";
ALTER TABLE "Item" ALTER COLUMN "salesTaxRateId" DROP NOT NULL;
ALTER TABLE "Item" ADD CONSTRAINT "Item_salesTaxRateId_fkey" FOREIGN KEY ("salesTaxRateId") REFERENCES "TaxRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesInvoice" ALTER COLUMN "dueDate" DROP NOT NULL;
ALTER TABLE "SalesInvoice" ADD COLUMN "taxableTotal" DECIMAL(20,4) NOT NULL DEFAULT 0;
ALTER TABLE "SalesInvoice" ADD COLUMN "reversalJournalEntryId" UUID;

UPDATE "SalesInvoice"
SET
  "taxableTotal" = "subtotal",
  "subtotal" = "subtotal" + "discountTotal";

ALTER TABLE "SalesInvoiceLine" ADD COLUMN "lineGrossAmount" DECIMAL(20,4) NOT NULL DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ADD COLUMN "discountAmount" DECIMAL(20,4) NOT NULL DEFAULT 0;
ALTER TABLE "SalesInvoiceLine" ADD COLUMN "taxableAmount" DECIMAL(20,4) NOT NULL DEFAULT 0;

UPDATE "SalesInvoiceLine"
SET
  "lineGrossAmount" = "quantity" * "unitPrice",
  "discountAmount" = ("quantity" * "unitPrice") - "lineSubtotal",
  "taxableAmount" = "lineSubtotal";

CREATE UNIQUE INDEX "SalesInvoice_reversalJournalEntryId_key" ON "SalesInvoice"("reversalJournalEntryId");

ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_reversalJournalEntryId_fkey" FOREIGN KEY ("reversalJournalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
