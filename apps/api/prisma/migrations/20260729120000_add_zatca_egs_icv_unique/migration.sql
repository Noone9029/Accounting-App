-- Preserve one durable ICV position per EGS unit. PostgreSQL permits multiple
-- NULL values, so metadata that has not yet been assigned to an EGS is unaffected.
CREATE UNIQUE INDEX "ZatcaInvoiceMetadata_egsUnitId_icv_key"
ON "ZatcaInvoiceMetadata"("egsUnitId", "icv");
