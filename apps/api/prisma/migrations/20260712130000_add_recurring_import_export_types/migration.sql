-- Extend the existing reviewed migration toolkit. These values are additive and do not mutate prior import evidence.
ALTER TYPE "ImportEntityType" ADD VALUE 'RECURRING_SALES_INVOICE_TEMPLATES';
ALTER TYPE "ImportEntityType" ADD VALUE 'RECURRING_PURCHASE_BILL_TEMPLATES';
ALTER TYPE "ImportEntityType" ADD VALUE 'RECURRING_EXPENSE_TEMPLATES';
ALTER TYPE "ImportEntityType" ADD VALUE 'RECURRING_JOURNAL_TEMPLATES';
ALTER TYPE "ImportEntityType" ADD VALUE 'RECURRING_TRANSACTION_RUNS';
