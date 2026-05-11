CREATE TABLE "CreditNoteAllocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "creditNoteId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amountApplied" DECIMAL(20,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNoteAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditNoteAllocation_organizationId_idx" ON "CreditNoteAllocation"("organizationId");
CREATE INDEX "CreditNoteAllocation_creditNoteId_idx" ON "CreditNoteAllocation"("creditNoteId");
CREATE INDEX "CreditNoteAllocation_invoiceId_idx" ON "CreditNoteAllocation"("invoiceId");

ALTER TABLE "CreditNoteAllocation" ADD CONSTRAINT "CreditNoteAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNoteAllocation" ADD CONSTRAINT "CreditNoteAllocation_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreditNoteAllocation" ADD CONSTRAINT "CreditNoteAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
