-- Least-privilege runtime database role template for LedgerByte.
--
-- DO NOT APPLY TO PRODUCTION.
-- Template only. Not a Prisma migration. Not executable as-is.
-- Replace placeholders only after review in an isolated staging/proof database.
-- Do not place real credentials, database URLs, generated passwords, or hosted secrets in this file.

-- Placeholder names used below:
--   {{DATABASE_NAME}}
--   {{APP_SCHEMA}}
--   {{API_RUNTIME_ROLE}}
--   {{MIGRATION_ADMIN_ROLE}}
--   {{OPTIONAL_READONLY_REPORT_ROLE}}

-- 1. Create or review the API runtime role manually through approved secret handling.
--    Password generation and storage must happen outside this template without printing secrets.
/*
CREATE ROLE {{API_RUNTIME_ROLE}}
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;
*/

-- 2. Keep schema ownership and DDL with the migration/admin role.
/*
ALTER SCHEMA {{APP_SCHEMA}} OWNER TO {{MIGRATION_ADMIN_ROLE}};
*/

-- 3. Remove broad privileges before adding reviewed minimal grants.
/*
REVOKE CREATE ON SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE ALL ON DATABASE {{DATABASE_NAME}} FROM {{API_RUNTIME_ROLE}};
REVOKE ALL ON SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE ALL ON ALL TABLES IN SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE ALL ON ALL SEQUENCES IN SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
*/

-- 4. Grant connection and schema usage.
/*
GRANT CONNECT ON DATABASE {{DATABASE_NAME}} TO {{API_RUNTIME_ROLE}};
GRANT USAGE ON SCHEMA {{APP_SCHEMA}} TO {{API_RUNTIME_ROLE}};
*/

-- 5. Grant DML only after table-by-table review.
--    Start in staging with compatibility grants, then tighten DELETE and sensitive tables.
/*
GRANT SELECT, INSERT, UPDATE ON TABLE
  {{APP_SCHEMA}}."Organization",
  {{APP_SCHEMA}}."OrganizationMember",
  {{APP_SCHEMA}}."Role",
  {{APP_SCHEMA}}."SalesInvoice",
  {{APP_SCHEMA}}."SalesInvoiceLine",
  {{APP_SCHEMA}}."PurchaseBill",
  {{APP_SCHEMA}}."PurchaseBillLine",
  {{APP_SCHEMA}}."CustomerPayment",
  {{APP_SCHEMA}}."SupplierPayment",
  {{APP_SCHEMA}}."JournalEntry",
  {{APP_SCHEMA}}."JournalLine",
  {{APP_SCHEMA}}."BankAccountProfile",
  {{APP_SCHEMA}}."BankStatementTransaction",
  {{APP_SCHEMA}}."Attachment",
  {{APP_SCHEMA}}."GeneratedDocument",
  {{APP_SCHEMA}}."AuditLog"
TO {{API_RUNTIME_ROLE}};
*/

-- 6. Grant DELETE only where hard delete is explicitly approved.
--    Prefer no runtime DELETE until each table's behavior is reviewed.
/*
-- GRANT DELETE ON TABLE {{APP_SCHEMA}}."ExampleReviewedHardDeleteTable" TO {{API_RUNTIME_ROLE}};
*/

-- 7. Grant sequence usage where inserts require it.
/*
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA {{APP_SCHEMA}} TO {{API_RUNTIME_ROLE}};
*/

-- 8. Keep Prisma migration history outside ordinary runtime mutation.
/*
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE {{APP_SCHEMA}}."_prisma_migrations" FROM {{API_RUNTIME_ROLE}};
*/

-- 9. Optional read-only/report role sketch. Review before use.
/*
CREATE ROLE {{OPTIONAL_READONLY_REPORT_ROLE}}
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE {{DATABASE_NAME}} TO {{OPTIONAL_READONLY_REPORT_ROLE}};
GRANT USAGE ON SCHEMA {{APP_SCHEMA}} TO {{OPTIONAL_READONLY_REPORT_ROLE}};
GRANT SELECT ON ALL TABLES IN SCHEMA {{APP_SCHEMA}} TO {{OPTIONAL_READONLY_REPORT_ROLE}};
*/

-- 10. Staging-only rollback sketch.
--     Use only in the same isolated staging/proof database after review.
/*
REVOKE ALL ON ALL TABLES IN SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE ALL ON ALL SEQUENCES IN SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE USAGE ON SCHEMA {{APP_SCHEMA}} FROM {{API_RUNTIME_ROLE}};
REVOKE CONNECT ON DATABASE {{DATABASE_NAME}} FROM {{API_RUNTIME_ROLE}};
-- DROP ROLE {{API_RUNTIME_ROLE}};
*/
