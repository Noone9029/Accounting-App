-- Extend draft document lines with optional accounting dimensions. Existing lines remain null and unchanged.
ALTER TABLE "SalesInvoiceLine" ADD COLUMN "costCenterId" UUID;
ALTER TABLE "SalesInvoiceLine" ADD COLUMN "projectId" UUID;
ALTER TABLE "PurchaseBillLine" ADD COLUMN "costCenterId" UUID;
ALTER TABLE "PurchaseBillLine" ADD COLUMN "projectId" UUID;
ALTER TABLE "CashExpenseLine" ADD COLUMN "costCenterId" UUID;
ALTER TABLE "CashExpenseLine" ADD COLUMN "projectId" UUID;

CREATE INDEX "SalesInvoiceLine_organizationId_costCenterId_idx" ON "SalesInvoiceLine"("organizationId", "costCenterId");
CREATE INDEX "SalesInvoiceLine_organizationId_projectId_idx" ON "SalesInvoiceLine"("organizationId", "projectId");
CREATE INDEX "PurchaseBillLine_organizationId_costCenterId_idx" ON "PurchaseBillLine"("organizationId", "costCenterId");
CREATE INDEX "PurchaseBillLine_organizationId_projectId_idx" ON "PurchaseBillLine"("organizationId", "projectId");
CREATE INDEX "CashExpenseLine_organizationId_costCenterId_idx" ON "CashExpenseLine"("organizationId", "costCenterId");
CREATE INDEX "CashExpenseLine_organizationId_projectId_idx" ON "CashExpenseLine"("organizationId", "projectId");

ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_organizationId_costCenterId_fkey" FOREIGN KEY ("organizationId", "costCenterId") REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_organizationId_costCenterId_fkey" FOREIGN KEY ("organizationId", "costCenterId") REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "PurchaseBillLine" ADD CONSTRAINT "PurchaseBillLine_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_organizationId_costCenterId_fkey" FOREIGN KEY ("organizationId", "costCenterId") REFERENCES "CostCenter"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "CashExpenseLine" ADD CONSTRAINT "CashExpenseLine_organizationId_projectId_fkey" FOREIGN KEY ("organizationId", "projectId") REFERENCES "Project"("organizationId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;
