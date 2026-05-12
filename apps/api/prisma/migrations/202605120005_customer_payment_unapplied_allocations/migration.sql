CREATE TABLE "CustomerPaymentUnappliedAllocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amountApplied" DECIMAL(20,4) NOT NULL,
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPaymentUnappliedAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerPaymentUnappliedAllocation_organizationId_idx" ON "CustomerPaymentUnappliedAllocation"("organizationId");
CREATE INDEX "CustomerPaymentUnappliedAllocation_paymentId_idx" ON "CustomerPaymentUnappliedAllocation"("paymentId");
CREATE INDEX "CustomerPaymentUnappliedAllocation_invoiceId_idx" ON "CustomerPaymentUnappliedAllocation"("invoiceId");
CREATE INDEX "CustomerPaymentUnappliedAllocation_reversedAt_idx" ON "CustomerPaymentUnappliedAllocation"("reversedAt");
CREATE INDEX "CustomerPaymentUnappliedAllocation_reversedById_idx" ON "CustomerPaymentUnappliedAllocation"("reversedById");

ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "CustomerPaymentUnappliedAllocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "CustomerPaymentUnappliedAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CustomerPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "CustomerPaymentUnappliedAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerPaymentUnappliedAllocation" ADD CONSTRAINT "CustomerPaymentUnappliedAllocation_reversedById_fkey" FOREIGN KEY ("reversedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
