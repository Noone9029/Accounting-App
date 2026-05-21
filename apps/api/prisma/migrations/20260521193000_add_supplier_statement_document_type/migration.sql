-- Non-destructive archive parity migration.
-- Adds a generated-document classification for supplier statement PDFs.
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'SUPPLIER_STATEMENT';
