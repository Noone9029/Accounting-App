-- Add source-specific supplier document delivery template types without changing existing values.
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'PURCHASE_DEBIT_NOTE';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SUPPLIER_PAYMENT_REMITTANCE';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SUPPLIER_STATEMENT';
