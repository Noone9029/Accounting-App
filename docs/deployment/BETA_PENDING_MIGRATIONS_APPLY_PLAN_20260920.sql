-- LOCAL REVIEW PLAN ONLY. Not evidence that any migration has run.
-- Target project: xynelbjqcmbgtscfmmzv. Verify the Supabase tool project_id before execution.
-- Approved existing Supabase beta only; do not use on production or another project.
-- Execute ONE numbered block per Supabase apply_migration/execute_sql call, in order.
-- Supabase apply_migration supplies the provider transaction: remove ONLY the selected block's
-- outer SQL BEGIN/COMMIT before submission. Preserve DO-block BEGIN/END, guards and all other SQL.
-- Run that block's final read-only verification SELECT separately through execute_sql afterward;
-- require JSON historyVerified=true before advancing. Do not run this entire file blindly.
-- Prerequisites: historical Supabase names independently verified; fixed-assets catalog preflight PASS;
-- first-three Prisma reconciliation completed; available backup status documented; short quiet window;
-- API runtime role access identified; no concurrent migrator. Never print DSNs, logs or application rows.
-- Each block is atomic: schema + narrow access revokes + original Prisma checksum commit together.
-- Current beta is Supabase FREE with no available backups. No full recovery point is claimed.
-- The reviewed narrow additive-repair decision proceeds with provider transaction atomicity and
-- rollback to the recorded old application deployments while leaving additive schema in place.
-- This supersedes the earlier hard recovery-point prerequisite; it does not establish backup,
-- restore or disaster-recovery capability. Preserve all existing accounting data; no down-migration.
-- Source SQL statements are unchanged. The catalog migration's own BEGIN/COMMIT are replaced only by
-- the enclosing block so its new table/function revokes happen before commit. Source files stay untouched.
-- All checksums are SHA-256 of original baseline Git/LF bytes, NOT wrapper text or Windows CRLF bytes.
-- No RLS toggles, broad default-ACL changes, data cleanup/backfill, catalog seed or provider activation.
-- Current permissive supabase_admin defaults still need future-migration care; these blocks revoke
-- PUBLIC/anon/authenticated access on their new objects before visibility, without changing those defaults.
-- After an error inspect metadata: the failing block rolls back; earlier committed blocks remain applied.
-- Never replay an already successful block or use Prisma reset/resolve to hide mismatched schema.
-- Existing references: PostgreSQL CREATE INDEX/ALTER TABLE; Supabase securing-your-api documentation.

-- BEGIN BLOCK 1: 20260716090000_add_sales_invoice_email_delivery
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=public,pg_catalog;
DO $beta_guard$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20260715153000_add_fixed_asset_disposal_review'
      AND checksum='1ba710ae7ecfe1b29f3eed0faa2055a4e2c2fe85a25d20b0a072da10a29886cf' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'PREVIOUS_MIGRATION_HISTORY_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260716090000_add_sales_invoice_email_delivery') THEN
    RAISE EXCEPTION 'MIGRATION_HISTORY_ALREADY_PRESENT_DO_NOT_REPLAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public'
    AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a
    WHERE ns.nspname='public' AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations') AND a.grantee=0
  ) THEN
    RAISE EXCEPTION 'EXISTING_TABLE_DATA_API_ACCESS_PRESENT';
  END IF;
END $beta_guard$;

-- Original migration statements begin.
-- Additive sales-invoice delivery metadata. Existing invite, reset, test, and AP rows retain NULL source/idempotency values.
ALTER TABLE "EmailOutbox"
ADD COLUMN "salesInvoiceId" UUID,
ADD COLUMN "requestedById" UUID,
ADD COLUMN "idempotencyKeyHash" TEXT,
ADD COLUMN "requestHash" TEXT;

CREATE INDEX "EmailOutbox_organizationId_salesInvoiceId_createdAt_idx"
ON "EmailOutbox"("organizationId", "salesInvoiceId", "createdAt");

CREATE UNIQUE INDEX "EmailOutbox_organizationId_idempotencyKeyHash_key"
ON "EmailOutbox"("organizationId", "idempotencyKeyHash");

ALTER TABLE "EmailOutbox"
ADD CONSTRAINT "EmailOutbox_salesInvoiceId_fkey"
FOREIGN KEY ("salesInvoiceId") REFERENCES "SalesInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmailOutbox"
ADD CONSTRAINT "EmailOutbox_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Original migration statements end.

INSERT INTO public._prisma_migrations
 (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
VALUES (gen_random_uuid()::text,'ff74dcc82bdc3158011ab0fa0d00eeb4b28bcf84c1279b45402c9bc67625bbdd',CURRENT_TIMESTAMP,
 '20260716090000_add_sales_invoice_email_delivery',
 'Original migration SQL applied atomically with narrow beta access revokes; original Git/LF checksum retained.',
 NULL,CURRENT_TIMESTAMP,1);
COMMIT;
SELECT jsonb_build_object('status','APPLIED','migration','20260716090000_add_sales_invoice_email_delivery',
 'historyVerified',count(*)=1 AND bool_and(checksum='ff74dcc82bdc3158011ab0fa0d00eeb4b28bcf84c1279b45402c9bc67625bbdd' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)) AS result
FROM public._prisma_migrations WHERE migration_name='20260716090000_add_sales_invoice_email_delivery';
-- END BLOCK 1

-- BEGIN BLOCK 2: 20260716143000_add_customer_document_email_delivery
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=public,pg_catalog;
DO $beta_guard$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20260716090000_add_sales_invoice_email_delivery'
      AND checksum='ff74dcc82bdc3158011ab0fa0d00eeb4b28bcf84c1279b45402c9bc67625bbdd' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'PREVIOUS_MIGRATION_HISTORY_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260716143000_add_customer_document_email_delivery') THEN
    RAISE EXCEPTION 'MIGRATION_HISTORY_ALREADY_PRESENT_DO_NOT_REPLAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public'
    AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a
    WHERE ns.nspname='public' AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations') AND a.grantee=0
  ) THEN
    RAISE EXCEPTION 'EXISTING_TABLE_DATA_API_ACCESS_PRESENT';
  END IF;
END $beta_guard$;

-- Original migration statements begin.
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
-- Original migration statements end.

INSERT INTO public._prisma_migrations
 (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
VALUES (gen_random_uuid()::text,'8ab0dfa9e6f0eb774e95d8c9f4aac7957d85ed95457fc53b3dc84bae2289d98f',CURRENT_TIMESTAMP,
 '20260716143000_add_customer_document_email_delivery',
 'Original migration SQL applied atomically with narrow beta access revokes; original Git/LF checksum retained.',
 NULL,CURRENT_TIMESTAMP,1);
COMMIT;
SELECT jsonb_build_object('status','APPLIED','migration','20260716143000_add_customer_document_email_delivery',
 'historyVerified',count(*)=1 AND bool_and(checksum='8ab0dfa9e6f0eb774e95d8c9f4aac7957d85ed95457fc53b3dc84bae2289d98f' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)) AS result
FROM public._prisma_migrations WHERE migration_name='20260716143000_add_customer_document_email_delivery';
-- END BLOCK 2

-- BEGIN BLOCK 3: 20260717100000_add_supplier_document_email_templates
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=public,pg_catalog;
DO $beta_guard$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20260716143000_add_customer_document_email_delivery'
      AND checksum='8ab0dfa9e6f0eb774e95d8c9f4aac7957d85ed95457fc53b3dc84bae2289d98f' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'PREVIOUS_MIGRATION_HISTORY_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260717100000_add_supplier_document_email_templates') THEN
    RAISE EXCEPTION 'MIGRATION_HISTORY_ALREADY_PRESENT_DO_NOT_REPLAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public'
    AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a
    WHERE ns.nspname='public' AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations') AND a.grantee=0
  ) THEN
    RAISE EXCEPTION 'EXISTING_TABLE_DATA_API_ACCESS_PRESENT';
  END IF;
END $beta_guard$;

-- Original migration statements begin.
-- Add source-specific supplier document delivery template types without changing existing values.
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'PURCHASE_DEBIT_NOTE';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SUPPLIER_PAYMENT_REMITTANCE';
ALTER TYPE "EmailTemplateType" ADD VALUE IF NOT EXISTS 'SUPPLIER_STATEMENT';
-- Original migration statements end.

INSERT INTO public._prisma_migrations
 (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
VALUES (gen_random_uuid()::text,'61970a9142e269594b7782e351cbbe3762d91384991e41c3c2a7a3b19e510ed3',CURRENT_TIMESTAMP,
 '20260717100000_add_supplier_document_email_templates',
 'Original migration SQL applied atomically with narrow beta access revokes; original Git/LF checksum retained.',
 NULL,CURRENT_TIMESTAMP,1);
COMMIT;
SELECT jsonb_build_object('status','APPLIED','migration','20260717100000_add_supplier_document_email_templates',
 'historyVerified',count(*)=1 AND bool_and(checksum='61970a9142e269594b7782e351cbbe3762d91384991e41c3c2a7a3b19e510ed3' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)) AS result
FROM public._prisma_migrations WHERE migration_name='20260717100000_add_supplier_document_email_templates';
-- END BLOCK 3

-- BEGIN BLOCK 4: 20260720080000_add_zatca_sandbox_submission_state
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=public,pg_catalog;
DO $beta_guard$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20260717100000_add_supplier_document_email_templates'
      AND checksum='61970a9142e269594b7782e351cbbe3762d91384991e41c3c2a7a3b19e510ed3' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'PREVIOUS_MIGRATION_HISTORY_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260720080000_add_zatca_sandbox_submission_state') THEN
    RAISE EXCEPTION 'MIGRATION_HISTORY_ALREADY_PRESENT_DO_NOT_REPLAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public'
    AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a
    WHERE ns.nspname='public' AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations') AND a.grantee=0
  ) THEN
    RAISE EXCEPTION 'EXISTING_TABLE_DATA_API_ACCESS_PRESENT';
  END IF;
END $beta_guard$;

-- Original migration statements begin.
-- ARC-07B local-only metadata foundation. This migration deliberately stores no
-- credential, XML, QR, request, or response bodies.
CREATE TYPE "ZatcaSandboxProofRunStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CLEANED_UP', 'FAILED');
CREATE TYPE "ZatcaSandboxSubmissionOperation" AS ENUM ('COMPLIANCE_DOCUMENT', 'CLEARANCE', 'REPORTING');
CREATE TYPE "ZatcaSandboxSubmissionStateStatus" AS ENUM ('RESERVED', 'UNCERTAIN', 'ACCEPTED', 'REJECTED', 'FAILED', 'CLEANED_UP');
CREATE TYPE "ZatcaSandboxRetryClassification" AS ENUM ('NOT_RETRYABLE', 'RETRYABLE', 'REPLAY', 'CONFLICT');

CREATE TABLE "ZatcaSandboxProofRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "egsUnitId" UUID NOT NULL,
  "environment" "ZatcaEnvironment" NOT NULL,
  "proofRunId" TEXT NOT NULL,
  "status" "ZatcaSandboxProofRunStatus" NOT NULL DEFAULT 'ACTIVE',
  "syntheticDataVerified" BOOLEAN NOT NULL DEFAULT true,
  "cleanupCompletedAt" TIMESTAMP(3),
  "cleanupReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaSandboxProofRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaSandboxSubmissionState" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "egsUnitId" UUID NOT NULL,
  "proofRunId" UUID NOT NULL,
  "invoiceMetadataId" UUID,
  "sourceIdentityHash" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "invoiceUuid" TEXT NOT NULL,
  "invoiceType" "ZatcaInvoiceType" NOT NULL,
  "icv" INTEGER NOT NULL,
  "previousInvoiceHash" TEXT NOT NULL,
  "canonicalInvoiceHash" TEXT NOT NULL,
  "signedArtifactHash" TEXT,
  "signingKeyReferenceId" TEXT,
  "credentialReferenceId" TEXT,
  "certificateFingerprint" TEXT,
  "certificateSerialNumber" TEXT,
  "certificateExpiresAt" TIMESTAMP(3),
  "operation" "ZatcaSandboxSubmissionOperation" NOT NULL,
  "status" "ZatcaSandboxSubmissionStateStatus" NOT NULL DEFAULT 'RESERVED',
  "reservationToken" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cleanupCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaSandboxSubmissionState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ZatcaSandboxSubmissionAttempt" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "submissionStateId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "ZatcaSandboxSubmissionStateStatus" NOT NULL,
  "requestHash" TEXT NOT NULL,
  "responseHash" TEXT,
  "responseCode" TEXT,
  "warningCodes" JSONB,
  "errorCodes" JSONB,
  "correlationId" TEXT NOT NULL,
  "retryClassification" "ZatcaSandboxRetryClassification" NOT NULL DEFAULT 'NOT_RETRYABLE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZatcaSandboxSubmissionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZatcaSandboxProofRun_organizationId_proofRunId_key" ON "ZatcaSandboxProofRun"("organizationId", "proofRunId");
CREATE INDEX "ZatcaSandboxProofRun_organizationId_status_idx" ON "ZatcaSandboxProofRun"("organizationId", "status");
CREATE INDEX "ZatcaSandboxProofRun_egsUnitId_idx" ON "ZatcaSandboxProofRun"("egsUnitId");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionState_organizationId_sourceIdentityHash_key" ON "ZatcaSandboxSubmissionState"("organizationId", "sourceIdentityHash");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionState_organizationId_egsUnitId_icv_key" ON "ZatcaSandboxSubmissionState"("organizationId", "egsUnitId", "icv");
CREATE INDEX "ZatcaSandboxSubmissionState_proofRunId_status_idx" ON "ZatcaSandboxSubmissionState"("proofRunId", "status");
CREATE INDEX "ZatcaSandboxSubmissionState_invoiceMetadataId_idx" ON "ZatcaSandboxSubmissionState"("invoiceMetadataId");
CREATE INDEX "ZatcaSandboxSubmissionState_organizationId_egsUnitId_status_idx" ON "ZatcaSandboxSubmissionState"("organizationId", "egsUnitId", "status");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionAttempt_submissionStateId_attemptNumber_key" ON "ZatcaSandboxSubmissionAttempt"("submissionStateId", "attemptNumber");
CREATE UNIQUE INDEX "ZatcaSandboxSubmissionAttempt_organizationId_correlationId_key" ON "ZatcaSandboxSubmissionAttempt"("organizationId", "correlationId");
CREATE INDEX "ZatcaSandboxSubmissionAttempt_organizationId_status_idx" ON "ZatcaSandboxSubmissionAttempt"("organizationId", "status");
CREATE INDEX "ZatcaSandboxSubmissionAttempt_submissionStateId_status_idx" ON "ZatcaSandboxSubmissionAttempt"("submissionStateId", "status");

ALTER TABLE "ZatcaSandboxProofRun" ADD CONSTRAINT "ZatcaSandboxProofRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxProofRun" ADD CONSTRAINT "ZatcaSandboxProofRun_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_egsUnitId_fkey" FOREIGN KEY ("egsUnitId") REFERENCES "ZatcaEgsUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_proofRunId_fkey" FOREIGN KEY ("proofRunId") REFERENCES "ZatcaSandboxProofRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionState" ADD CONSTRAINT "ZatcaSandboxSubmissionState_invoiceMetadataId_fkey" FOREIGN KEY ("invoiceMetadataId") REFERENCES "ZatcaInvoiceMetadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionAttempt" ADD CONSTRAINT "ZatcaSandboxSubmissionAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ZatcaSandboxSubmissionAttempt" ADD CONSTRAINT "ZatcaSandboxSubmissionAttempt_submissionStateId_fkey" FOREIGN KEY ("submissionStateId") REFERENCES "ZatcaSandboxSubmissionState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Original migration statements end.

-- Narrow protection occurs before commit even when owner default ACLs are permissive.
REVOKE ALL PRIVILEGES ON TABLE public."ZatcaSandboxProofRun", public."ZatcaSandboxSubmissionState", public."ZatcaSandboxSubmissionAttempt" FROM PUBLIC, anon, authenticated;
DO $acl_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public' AND t.relname IN ('ZatcaSandboxProofRun','ZatcaSandboxSubmissionState','ZatcaSandboxSubmissionAttempt')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) THEN RAISE EXCEPTION 'NEW_TABLE_DATA_API_ACCESS_REMAINS'; END IF;
END $acl_guard$;

INSERT INTO public._prisma_migrations
 (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
VALUES (gen_random_uuid()::text,'24c28c405c542f62f95fe017b9024c5c32bd2cb06afd5a1a8dadf5a525c0f531',CURRENT_TIMESTAMP,
 '20260720080000_add_zatca_sandbox_submission_state',
 'Original migration SQL applied atomically with narrow beta access revokes; original Git/LF checksum retained.',
 NULL,CURRENT_TIMESTAMP,1);
COMMIT;
SELECT jsonb_build_object('status','APPLIED','migration','20260720080000_add_zatca_sandbox_submission_state',
 'historyVerified',count(*)=1 AND bool_and(checksum='24c28c405c542f62f95fe017b9024c5c32bd2cb06afd5a1a8dadf5a525c0f531' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)) AS result
FROM public._prisma_migrations WHERE migration_name='20260720080000_add_zatca_sandbox_submission_state';
-- END BLOCK 4

-- BEGIN BLOCK 5: 20260729120000_add_zatca_egs_icv_unique
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=public,pg_catalog;
DO $beta_guard$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20260720080000_add_zatca_sandbox_submission_state'
      AND checksum='24c28c405c542f62f95fe017b9024c5c32bd2cb06afd5a1a8dadf5a525c0f531' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'PREVIOUS_MIGRATION_HISTORY_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260729120000_add_zatca_egs_icv_unique') THEN
    RAISE EXCEPTION 'MIGRATION_HISTORY_ALREADY_PRESENT_DO_NOT_REPLAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public'
    AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a
    WHERE ns.nspname='public' AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations') AND a.grantee=0
  ) THEN
    RAISE EXCEPTION 'EXISTING_TABLE_DATA_API_ACCESS_PRESENT';
  END IF;
END $beta_guard$;
-- This is the same write-blocking table lock needed by regular CREATE UNIQUE INDEX.
LOCK TABLE public."ZatcaInvoiceMetadata" IN SHARE MODE;
DO $icv_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public."ZatcaInvoiceMetadata"
    WHERE "egsUnitId" IS NOT NULL AND "icv" IS NOT NULL
    GROUP BY "egsUnitId","icv" HAVING count(*)>1) THEN
    RAISE EXCEPTION 'ZATCA_ICV_DUPLICATE_GROUPS_PRESENT';
  END IF;
END $icv_guard$;

-- Original migration statements begin.
-- Preserve one durable ICV position per EGS unit. PostgreSQL permits multiple
-- NULL values, so metadata that has not yet been assigned to an EGS is unaffected.
CREATE UNIQUE INDEX "ZatcaInvoiceMetadata_egsUnitId_icv_key"
ON "ZatcaInvoiceMetadata"("egsUnitId", "icv");
-- Original migration statements end.

INSERT INTO public._prisma_migrations
 (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
VALUES (gen_random_uuid()::text,'e3ccb121ba3a5c60570063812666017a185df6cf5007039c79da084a38428f85',CURRENT_TIMESTAMP,
 '20260729120000_add_zatca_egs_icv_unique',
 'Original migration SQL applied atomically with narrow beta access revokes; original Git/LF checksum retained.',
 NULL,CURRENT_TIMESTAMP,1);
COMMIT;
SELECT jsonb_build_object('status','APPLIED','migration','20260729120000_add_zatca_egs_icv_unique',
 'historyVerified',count(*)=1 AND bool_and(checksum='e3ccb121ba3a5c60570063812666017a185df6cf5007039c79da084a38428f85' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)) AS result
FROM public._prisma_migrations WHERE migration_name='20260729120000_add_zatca_egs_icv_unique';
-- END BLOCK 5

-- BEGIN BLOCK 6: 20260730090000_add_paid_saas_subscription_catalog
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
SET LOCAL search_path=public,pg_catalog;
DO $beta_guard$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(72707369);
  LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL) THEN
    RAISE EXCEPTION 'UNRESOLVED_PRISMA_MIGRATION';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name='20260729120000_add_zatca_egs_icv_unique'
      AND checksum='e3ccb121ba3a5c60570063812666017a185df6cf5007039c79da084a38428f85' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)<>1 THEN
    RAISE EXCEPTION 'PREVIOUS_MIGRATION_HISTORY_NOT_VERIFIED';
  END IF;
  IF EXISTS (SELECT 1 FROM public._prisma_migrations WHERE migration_name='20260730090000_add_paid_saas_subscription_catalog') THEN
    RAISE EXCEPTION 'MIGRATION_HISTORY_ALREADY_PRESENT_DO_NOT_REPLAY';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public'
    AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl,pg_catalog.acldefault('r',t.relowner))) a
    WHERE ns.nspname='public' AND t.relname IN ('EmailOutbox','SalesQuote','ZatcaInvoiceMetadata','_prisma_migrations') AND a.grantee=0
  ) THEN
    RAISE EXCEPTION 'EXISTING_TABLE_DATA_API_ACCESS_PRESENT';
  END IF;
END $beta_guard$;

-- Original migration statements begin.
CREATE TYPE "BillingPlanKey" AS ENUM ('CONTROLLED_BETA', 'STARTER', 'GROWTH', 'KSA_COMPLIANCE');
CREATE TYPE "BillingPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED', 'ARCHIVED');
CREATE TYPE "BillingPlanVersionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "BillingPriceInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "BillingProvider" AS ENUM ('DISABLED', 'FAKE', 'STRIPE');
CREATE TYPE "BillingProviderEnvironment" AS ENUM ('LOCAL_TEST', 'TEST', 'LIVE');
CREATE TYPE "BillingEntitlementValueType" AS ENUM ('BOOLEAN', 'INTEGER', 'STRING');
CREATE TYPE "BillingAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'GRACE', 'SUSPENDED', 'CANCEL_AT_PERIOD_END', 'CANCELED');
CREATE TYPE "BillingScheduledChangeStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELED', 'SUPERSEDED');
CREATE TYPE "BillingCheckoutAttemptStatus" AS ENUM ('CREATED', 'DISABLED', 'READY', 'PROVIDER_PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');
CREATE TYPE "BillingWebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED_DUPLICATE', 'IGNORED_STALE', 'REJECTED', 'FAILED', 'OPERATOR_REVIEW');
CREATE TYPE "BillingInvoiceReferenceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
CREATE TYPE "BillingLifecycleEventType" AS ENUM ('TRIAL_STARTED', 'ACTIVATED', 'PAYMENT_FAILED', 'GRACE_EXPIRED', 'CANCELLATION_SCHEDULED', 'CANCELED', 'REACTIVATED', 'PLAN_CHANGE_SCHEDULED', 'PLAN_CHANGE_APPLIED', 'WEBHOOK_RECONCILED');

CREATE TABLE "BillingPlan" (
  "id" UUID NOT NULL,
  "key" "BillingPlanKey" NOT NULL,
  "displayName" TEXT NOT NULL,
  "internalDescription" TEXT NOT NULL,
  "status" "BillingPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "publiclyVisible" BOOLEAN NOT NULL DEFAULT false,
  "sellable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPlanVersion" (
  "id" UUID NOT NULL,
  "billingPlanId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "BillingPlanVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "effectiveAt" TIMESTAMPTZ(3),
  "retiredAt" TIMESTAMPTZ(3),
  "entitlementSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingPlanVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPlanVersion_version_positive" CHECK ("version" > 0),
  CONSTRAINT "BillingPlanVersion_retired_after_effective" CHECK ("retiredAt" IS NULL OR "effectiveAt" IS NULL OR "retiredAt" >= "effectiveAt")
);

CREATE TABLE "BillingPlanEntitlement" (
  "id" UUID NOT NULL,
  "planVersionId" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "valueType" "BillingEntitlementValueType" NOT NULL,
  "booleanValue" BOOLEAN,
  "integerValue" INTEGER,
  "stringValue" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingPlanEntitlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPlanEntitlement_value_matches_type" CHECK (
    ("valueType" = 'BOOLEAN' AND "booleanValue" IS NOT NULL AND "integerValue" IS NULL AND "stringValue" IS NULL)
    OR ("valueType" = 'INTEGER' AND "booleanValue" IS NULL AND "integerValue" IS NOT NULL AND "stringValue" IS NULL)
    OR ("valueType" = 'STRING' AND "booleanValue" IS NULL AND "integerValue" IS NULL AND "stringValue" IS NOT NULL)
  )
);

CREATE TABLE "BillingPrice" (
  "id" UUID NOT NULL,
  "planVersionId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "interval" "BillingPriceInterval" NOT NULL,
  "currency" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "providerProductId" TEXT,
  "providerPriceId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingPrice_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPrice_amount_nonnegative" CHECK ("amountMinor" >= 0),
  CONSTRAINT "BillingPrice_currency_iso_length" CHECK (char_length("currency") = 3)
);

CREATE TABLE "OrganizationBillingAccount" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "billingEmailHash" TEXT,
  "billingEmailDomain" TEXT,
  "status" "BillingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "enforcementExempt" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationBillingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingProviderCustomer" (
  "id" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "providerCustomerReference" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingProviderCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationSubscription" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "planVersionId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "providerSubscriptionReference" TEXT,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
  "interval" "BillingPriceInterval" NOT NULL,
  "trialStartedAt" TIMESTAMPTZ(3),
  "trialEndsAt" TIMESTAMPTZ(3),
  "currentPeriodStartedAt" TIMESTAMPTZ(3),
  "currentPeriodEndsAt" TIMESTAMPTZ(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMPTZ(3),
  "graceDeadline" TIMESTAMPTZ(3),
  "suspendedAt" TIMESTAMPTZ(3),
  "providerUpdatedAt" TIMESTAMPTZ(3),
  "lastReconciledAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OrganizationSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationSubscription_version_positive" CHECK ("version" > 0),
  CONSTRAINT "OrganizationSubscription_period_order" CHECK ("currentPeriodEndsAt" IS NULL OR "currentPeriodStartedAt" IS NULL OR "currentPeriodEndsAt" >= "currentPeriodStartedAt"),
  CONSTRAINT "OrganizationSubscription_trial_order" CHECK ("trialEndsAt" IS NULL OR "trialStartedAt" IS NULL OR "trialEndsAt" >= "trialStartedAt")
);

CREATE TABLE "SubscriptionScheduledChange" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "currentPlanVersionId" UUID NOT NULL,
  "targetPlanVersionId" UUID NOT NULL,
  "effectiveAt" TIMESTAMPTZ(3) NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "status" "BillingScheduledChangeStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SubscriptionScheduledChange_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionScheduledChange_distinct_plan_versions" CHECK ("currentPlanVersionId" <> "targetPlanVersionId")
);

CREATE TABLE "BillingCheckoutAttempt" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "billingAccountId" UUID NOT NULL,
  "subscriptionId" UUID,
  "planVersionId" UUID NOT NULL,
  "billingPriceId" UUID NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "idempotencyKeyHash" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "returnRouteKey" TEXT NOT NULL,
  "providerSessionReference" TEXT,
  "status" "BillingCheckoutAttemptStatus" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "subscriptionId" UUID,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerCreatedAt" TIMESTAMPTZ(3),
  "payloadHash" TEXT NOT NULL,
  "providerCustomerReference" TEXT,
  "providerSubscriptionReference" TEXT,
  "status" "BillingWebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMPTZ(3),
  "safeErrorCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingWebhookEvent_attempt_count_nonnegative" CHECK ("attemptCount" >= 0)
);

CREATE TABLE "BillingInvoiceReference" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID,
  "provider" "BillingProvider" NOT NULL,
  "environment" "BillingProviderEnvironment" NOT NULL,
  "providerInvoiceReference" TEXT NOT NULL,
  "status" "BillingInvoiceReferenceStatus" NOT NULL DEFAULT 'OPEN',
  "currency" TEXT,
  "amountDueMinor" BIGINT,
  "amountPaidMinor" BIGINT,
  "dueAt" TIMESTAMPTZ(3),
  "paidAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "BillingInvoiceReference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingInvoiceReference_currency_iso_length" CHECK ("currency" IS NULL OR char_length("currency") = 3),
  CONSTRAINT "BillingInvoiceReference_due_nonnegative" CHECK ("amountDueMinor" IS NULL OR "amountDueMinor" >= 0),
  CONSTRAINT "BillingInvoiceReference_paid_nonnegative" CHECK ("amountPaidMinor" IS NULL OR "amountPaidMinor" >= 0)
);

CREATE TABLE "BillingLifecycleEvent" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subscriptionId" UUID NOT NULL,
  "eventType" "BillingLifecycleEventType" NOT NULL,
  "previousStatus" "BillingSubscriptionStatus",
  "nextStatus" "BillingSubscriptionStatus" NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "correlationId" TEXT,
  "safeMetadataJson" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPlan_key_key" ON "BillingPlan"("key");
CREATE INDEX "BillingPlan_status_sellable_idx" ON "BillingPlan"("status", "sellable");
CREATE INDEX "BillingPlan_publiclyVisible_idx" ON "BillingPlan"("publiclyVisible");
CREATE UNIQUE INDEX "BillingPlanVersion_billingPlanId_version_key" ON "BillingPlanVersion"("billingPlanId", "version");
CREATE INDEX "BillingPlanVersion_billingPlanId_status_idx" ON "BillingPlanVersion"("billingPlanId", "status");
CREATE INDEX "BillingPlanVersion_status_effectiveAt_idx" ON "BillingPlanVersion"("status", "effectiveAt");
CREATE UNIQUE INDEX "BillingPlanEntitlement_planVersionId_key_key" ON "BillingPlanEntitlement"("planVersionId", "key");
CREATE INDEX "BillingPlanEntitlement_key_idx" ON "BillingPlanEntitlement"("key");
CREATE UNIQUE INDEX "BillingPrice_provider_environment_providerPriceId_key" ON "BillingPrice"("provider", "environment", "providerPriceId");
CREATE INDEX "BillingPrice_planVersionId_active_idx" ON "BillingPrice"("planVersionId", "active");
CREATE INDEX "BillingPrice_provider_environment_active_idx" ON "BillingPrice"("provider", "environment", "active");
CREATE UNIQUE INDEX "OrganizationBillingAccount_organizationId_provider_key" ON "OrganizationBillingAccount"("organizationId", "provider");
CREATE INDEX "OrganizationBillingAccount_organizationId_status_idx" ON "OrganizationBillingAccount"("organizationId", "status");
CREATE UNIQUE INDEX "BillingProviderCustomer_billingAccountId_provider_environment_key" ON "BillingProviderCustomer"("billingAccountId", "provider", "environment");
CREATE UNIQUE INDEX "BillingProviderCustomer_provider_environment_providerCustomerReference_key" ON "BillingProviderCustomer"("provider", "environment", "providerCustomerReference");
CREATE INDEX "BillingProviderCustomer_billingAccountId_idx" ON "BillingProviderCustomer"("billingAccountId");
CREATE UNIQUE INDEX "OrganizationSubscription_provider_providerSubscriptionReference_key" ON "OrganizationSubscription"("provider", "providerSubscriptionReference");
CREATE UNIQUE INDEX "OrganizationSubscription_one_open_per_organization_key" ON "OrganizationSubscription"("organizationId") WHERE "status" <> 'CANCELED';
CREATE INDEX "OrganizationSubscription_organizationId_status_idx" ON "OrganizationSubscription"("organizationId", "status");
CREATE INDEX "OrganizationSubscription_billingAccountId_status_idx" ON "OrganizationSubscription"("billingAccountId", "status");
CREATE INDEX "OrganizationSubscription_planVersionId_idx" ON "OrganizationSubscription"("planVersionId");
CREATE INDEX "OrganizationSubscription_status_graceDeadline_idx" ON "OrganizationSubscription"("status", "graceDeadline");
CREATE UNIQUE INDEX "SubscriptionScheduledChange_one_pending_per_subscription_key" ON "SubscriptionScheduledChange"("subscriptionId") WHERE "status" = 'PENDING';
CREATE INDEX "SubscriptionScheduledChange_organizationId_status_idx" ON "SubscriptionScheduledChange"("organizationId", "status");
CREATE INDEX "SubscriptionScheduledChange_subscriptionId_status_idx" ON "SubscriptionScheduledChange"("subscriptionId", "status");
CREATE INDEX "SubscriptionScheduledChange_effectiveAt_status_idx" ON "SubscriptionScheduledChange"("effectiveAt", "status");
CREATE UNIQUE INDEX "BillingCheckoutAttempt_organizationId_idempotencyKeyHash_key" ON "BillingCheckoutAttempt"("organizationId", "idempotencyKeyHash");
CREATE INDEX "BillingCheckoutAttempt_organizationId_status_idx" ON "BillingCheckoutAttempt"("organizationId", "status");
CREATE INDEX "BillingCheckoutAttempt_billingAccountId_status_idx" ON "BillingCheckoutAttempt"("billingAccountId", "status");
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_environment_providerEventId_key" ON "BillingWebhookEvent"("provider", "environment", "providerEventId");
CREATE INDEX "BillingWebhookEvent_organizationId_status_idx" ON "BillingWebhookEvent"("organizationId", "status");
CREATE INDEX "BillingWebhookEvent_subscriptionId_status_idx" ON "BillingWebhookEvent"("subscriptionId", "status");
CREATE INDEX "BillingWebhookEvent_status_createdAt_idx" ON "BillingWebhookEvent"("status", "createdAt");
CREATE UNIQUE INDEX "BillingInvoiceReference_provider_environment_providerInvoiceReference_key" ON "BillingInvoiceReference"("provider", "environment", "providerInvoiceReference");
CREATE INDEX "BillingInvoiceReference_organizationId_status_idx" ON "BillingInvoiceReference"("organizationId", "status");
CREATE INDEX "BillingInvoiceReference_subscriptionId_idx" ON "BillingInvoiceReference"("subscriptionId");
CREATE INDEX "BillingLifecycleEvent_organizationId_createdAt_idx" ON "BillingLifecycleEvent"("organizationId", "createdAt");
CREATE INDEX "BillingLifecycleEvent_subscriptionId_createdAt_idx" ON "BillingLifecycleEvent"("subscriptionId", "createdAt");
CREATE INDEX "BillingLifecycleEvent_correlationId_idx" ON "BillingLifecycleEvent"("correlationId");

ALTER TABLE "BillingPlanVersion" ADD CONSTRAINT "BillingPlanVersion_billingPlanId_fkey" FOREIGN KEY ("billingPlanId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingPlanEntitlement" ADD CONSTRAINT "BillingPlanEntitlement_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingPrice" ADD CONSTRAINT "BillingPrice_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationBillingAccount" ADD CONSTRAINT "OrganizationBillingAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingProviderCustomer" ADD CONSTRAINT "BillingProviderCustomer_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationSubscription" ADD CONSTRAINT "OrganizationSubscription_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_currentPlanVersionId_fkey" FOREIGN KEY ("currentPlanVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionScheduledChange" ADD CONSTRAINT "SubscriptionScheduledChange_targetPlanVersionId_fkey" FOREIGN KEY ("targetPlanVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_billingAccountId_fkey" FOREIGN KEY ("billingAccountId") REFERENCES "OrganizationBillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "BillingPlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingCheckoutAttempt" ADD CONSTRAINT "BillingCheckoutAttempt_billingPriceId_fkey" FOREIGN KEY ("billingPriceId") REFERENCES "BillingPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingInvoiceReference" ADD CONSTRAINT "BillingInvoiceReference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingInvoiceReference" ADD CONSTRAINT "BillingInvoiceReference_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BillingLifecycleEvent" ADD CONSTRAINT "BillingLifecycleEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingLifecycleEvent" ADD CONSTRAINT "BillingLifecycleEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "OrganizationSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION "prevent_active_billing_plan_version_contract_mutation"() RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'ACTIVE' AND (
    NEW."billingPlanId" IS DISTINCT FROM OLD."billingPlanId"
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."effectiveAt" IS DISTINCT FROM OLD."effectiveAt"
    OR NEW."entitlementSnapshot" IS DISTINCT FROM OLD."entitlementSnapshot"
  ) THEN
    RAISE EXCEPTION 'Activated billing plan versions are immutable.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BillingPlanVersion_prevent_active_contract_mutation"
BEFORE UPDATE ON "BillingPlanVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_active_billing_plan_version_contract_mutation"();

CREATE FUNCTION "prevent_active_billing_plan_entitlement_mutation"() RETURNS TRIGGER AS $$
DECLARE
  "affectedPlanVersionId" UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    "affectedPlanVersionId" := OLD."planVersionId";
  ELSE
    "affectedPlanVersionId" := NEW."planVersionId";
  END IF;
  IF EXISTS (SELECT 1 FROM "BillingPlanVersion" WHERE "id" = "affectedPlanVersionId" AND "status" = 'ACTIVE') THEN
    RAISE EXCEPTION 'Activated billing plan entitlements are immutable.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BillingPlanEntitlement_prevent_active_mutation"
BEFORE INSERT OR UPDATE OR DELETE ON "BillingPlanEntitlement"
FOR EACH ROW EXECUTE FUNCTION "prevent_active_billing_plan_entitlement_mutation"();
-- Original migration statements end.

-- Narrow protection occurs before commit even when owner default ACLs are permissive.
REVOKE ALL PRIVILEGES ON TABLE public."BillingPlan", public."BillingPlanVersion", public."BillingPlanEntitlement", public."BillingPrice", public."OrganizationBillingAccount", public."BillingProviderCustomer", public."OrganizationSubscription", public."SubscriptionScheduledChange", public."BillingCheckoutAttempt", public."BillingWebhookEvent", public."BillingInvoiceReference", public."BillingLifecycleEvent" FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public."prevent_active_billing_plan_version_contract_mutation"(), public."prevent_active_billing_plan_entitlement_mutation"() FROM PUBLIC, anon, authenticated;
DO $acl_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class t JOIN pg_catalog.pg_namespace ns ON ns.oid=t.relnamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE ns.nspname='public' AND t.relname IN ('BillingPlan','BillingPlanVersion','BillingPlanEntitlement','BillingPrice','OrganizationBillingAccount','BillingProviderCustomer','OrganizationSubscription','SubscriptionScheduledChange','BillingCheckoutAttempt','BillingWebhookEvent','BillingInvoiceReference','BillingLifecycleEvent')
    AND r.rolname IN ('anon','authenticated') AND (
      pg_catalog.has_table_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_any_column_privilege(r.oid,t.oid,'SELECT,INSERT,UPDATE,REFERENCES'))
  ) THEN RAISE EXCEPTION 'NEW_TABLE_DATA_API_ACCESS_REMAINS'; END IF;
END $acl_guard$;
DO $function_acl_guard$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    CROSS JOIN pg_catalog.pg_roles r WHERE n.nspname='public' AND p.proname IN ('prevent_active_billing_plan_version_contract_mutation','prevent_active_billing_plan_entitlement_mutation')
    AND r.rolname IN ('anon','authenticated') AND pg_catalog.has_function_privilege(r.oid,p.oid,'EXECUTE')) THEN
    RAISE EXCEPTION 'NEW_FUNCTION_DATA_API_ACCESS_REMAINS';
  END IF;
END $function_acl_guard$;

INSERT INTO public._prisma_migrations
 (id,checksum,finished_at,migration_name,logs,rolled_back_at,started_at,applied_steps_count)
VALUES (gen_random_uuid()::text,'06bb25f08ae18ce82e0e729af7d19a52c3068ca6921579df1dd1518f04c33e32',CURRENT_TIMESTAMP,
 '20260730090000_add_paid_saas_subscription_catalog',
 'Original migration SQL applied atomically with narrow beta access revokes; original Git/LF checksum retained.',
 NULL,CURRENT_TIMESTAMP,1);
COMMIT;
SELECT jsonb_build_object('status','APPLIED','migration','20260730090000_add_paid_saas_subscription_catalog',
 'historyVerified',count(*)=1 AND bool_and(checksum='06bb25f08ae18ce82e0e729af7d19a52c3068ca6921579df1dd1518f04c33e32' AND finished_at IS NOT NULL AND rolled_back_at IS NULL)) AS result
FROM public._prisma_migrations WHERE migration_name='20260730090000_add_paid_saas_subscription_catalog';
-- END BLOCK 6
