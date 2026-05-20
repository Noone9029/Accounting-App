# Supabase RLS/Data API Hardening - 2026-05-21

Scope: LedgerByte user-testing Supabase project `xynelbjqcmbgtscfmmzv`.

This document records a controlled audit and the first safe Data API mitigation. It does not reset data, seed data, run migrations, enable RLS, change accounting behavior, execute backups/restores, enable real ZATCA network calls, send customer email, or expose secrets.

## Official References Consulted

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase securing Data API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase API keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Postgres roles: https://supabase.com/docs/guides/database/postgres/roles
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Storage schema: https://supabase.com/docs/guides/storage/schema/design
- Supabase Storage bucket fundamentals: https://supabase.com/docs/guides/storage/buckets/fundamentals
- Supabase changelog/default Data API grants change: https://supabase.com/changelog

Key doc constraints applied:

- Grants decide whether Data API roles can reach tables/functions; RLS then controls row access.
- RLS should be enabled on exposed-schema objects, but policies must match the app identity model.
- If an app never uses Supabase REST/GraphQL/client-library table access, disabling or hardening the Data API is a valid mitigation.
- Secret/service-role keys must never be exposed in the browser.
- Storage object access is controlled by `storage.objects` RLS and should be manipulated through Storage APIs, not by editing the storage schema directly.

## Current Architecture Summary

| Area | Finding |
| --- | --- |
| Browser data path | The Next.js web app calls the LedgerByte Nest API through `NEXT_PUBLIC_API_URL`. No `@supabase/supabase-js`, Supabase REST, GraphQL, Realtime, or direct Storage client usage was found in `apps/web`. |
| API data path | The Nest API uses Prisma with `DATABASE_URL` runtime database access and `DIRECT_URL` for direct/migration workflows. Supabase is used as Postgres, not as LedgerByte Auth. |
| Auth path | LedgerByte issues its own JWTs. API routes use `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard` with `x-organization-id` and active membership checks. |
| Storage path | Current app document and attachment flows go through the Nest API. Generated documents remain database-backed. Uploaded attachments are database-backed by default, with S3-compatible storage available only through API-side feature flags. No direct browser Supabase Storage path was found. |
| Edge Functions | Supabase project inspection returned no Edge Functions. |
| Web env exposure | Local web env files expose only `NEXT_PUBLIC_API_URL`. No local web DB credential or Supabase service-role key was found. Live Vercel env value listing was not available through the current MCP/CLI surface; prior runbook inspection records no web DB credentials. |
| API env exposure | API env names include database, JWT, CORS, ZATCA-disabled, email-disabled, and optional S3 variables. Values were not printed. |
| Runtime DB role | Exact runtime username was not printed. Runtime is Prisma over Postgres/Supabase pooler, not Data API roles. Least-privilege runtime role remains planned. |

## Supabase Exposure Summary

Metadata-only queries on 2026-05-21 found:

- Public tables: `76`.
- Public tables with RLS disabled: `76`.
- Public tables with RLS enabled: `0`.
- Public policies: `0`.
- Public views/materialized views: `0`.
- Public functions: `0`.
- Supabase Edge Functions: `0`.
- Storage buckets: `0`.
- `storage.buckets` and `storage.objects`: RLS enabled.
- Before mitigation, `anon` and `authenticated` each had broad table privileges on all `76` public tables.
- After mitigation, `anon`/`authenticated` table grants in `public`: `0`.
- After mitigation, `anon`/`authenticated` sequence grants in `public`: `0`.
- After mitigation, `anon`/`authenticated` executable public functions: `0`.
- Default privileges for future `postgres`-owned public objects now grant public access only to `postgres` and `service_role`; `anon`/`authenticated` are no longer present in the default ACL.
- `service_role` still has broad public table/default privileges. It remains a high-risk key class and must stay out of browsers and ordinary runtime code unless a backend-only admin path explicitly needs it.

Data API dashboard status was not directly exposed by the current tool surface. The Security Advisor lint and prior grants indicate `public` is treated as a PostgREST-exposed schema, so this plan treats Data API exposure as active until the Dashboard setting is explicitly disabled and validated.

## Mitigation Applied

Applied to user-testing only:

```sql
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from anon, authenticated, public;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, public;
```

This does not enable RLS and does not change Prisma runtime access. It only removes browser/Data API reachability for the low-privilege Supabase roles that LedgerByte does not use.

Minimal compatibility rollback, if a hidden Data API dependency is discovered:

```sql
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
alter default privileges for role postgres in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges for role postgres in schema public grant usage, select on sequences to anon, authenticated;
```

Do not run rollback by default; investigate the dependency first and prefer an explicit API-server path over reopening the Data API. The historical grants also included privileges such as references/triggers/truncate; those are intentionally not part of the minimal rollback because LedgerByte should not need them through browser/Data API roles.

## Validation

Post-change health:

- API `/`: HTTP `200`.
- API `/health`: HTTP `200`.
- API `/readiness`: HTTP `200`, status `ok`.
- Web `/`: HTTP `200`.
- Web `/setup`: HTTP `200`.
- Web `/settings/storage`: HTTP `200`.

Narrow validation:

- `corepack pnpm smoke:accounting:reports` passed with DPAPI-backed secret-store credentials, `LEDGERBYTE_SMOKE_PROGRESS=true`, `LEDGERBYTE_SMOKE_REQUEST_TIMEOUT_MS=60000`, and generated-user fallback unset.
- The fixed `GET /dashboard/summary` route completed with HTTP `200` in `49,591 ms`.
- `corepack pnpm smoke:accounting:zatca-safe` was attempted once with the same credential and timeout rules but hit the external shell ceiling at about `15` minutes while writing final phase output. It is not counted as a pass in this task.
- No matching local smoke/diagnostic child processes remained after the timeout.

Safety confirmation:

- No passwords, tokens, auth headers, request bodies, response bodies, connection strings, database URLs, service-role keys, document bodies, attachment bodies, signed XML bodies, QR payload bodies, or private keys were printed.
- No DB reset, seed, migration, destructive cleanup, RLS enablement, real ZATCA network/CSID/clearance/reporting/PDF-A3, real customer email, backup execution, or restore execution was run.

## Table Risk Matrix

Legend:

- `RLS`: current public table RLS state after this task.
- `Data API risk`: residual risk after revoking `anon`/`authenticated` grants. Risk remains if Data API is later re-granted without policies or if service-role/secret keys leak.
- `Safe RLS now?`: whether RLS should be enabled immediately without a dedicated policy/test phase.

| Table | Classification | Tenant path | RLS | Data API risk | Recommended mitigation | Safe RLS now? | Tests required before RLS | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Account | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke; high if re-granted | Keep grants revoked; future org policy | No | accounting, reports, cross-tenant denial | High |
| Attachment | storage/document metadata | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; add document/body protections | No | upload/list/download/delete, no body leakage | Critical |
| AuditLog | audit/log/evidence | `organizationId` | Off | Low after grant revoke; high if re-granted | Keep grants revoked; audit read policies later | No | audit redaction, retention, cross-tenant denial | High |
| AuditLogRetentionSettings | audit/log/evidence | `organizationId` | Off | Low after grant revoke | Keep grants revoked; admin-only policy later | No | settings update/read, permissions | High |
| AuthToken | user/account/auth related | `organizationId`, `userId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; never expose token hashes | No | invite/reset, token redaction | Critical |
| AuthTokenRateLimitEvent | user/account/auth related | `organizationId` | Off | Low after grant revoke | Keep grants revoked; internal-only policy | No | rate-limit flows | High |
| BackupRestoreEvidence | migration/system/internal | `organizationId` | Off | Low after grant revoke | Keep grants revoked; evidence admin policy later | No | backup readiness, no secret evidence | High |
| BankAccountProfile | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | banking/reconciliation | High |
| BankReconciliation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | reconciliation lifecycle | High |
| BankReconciliationItem | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | reconciliation item reads | High |
| BankReconciliationReviewEvent | audit/log/evidence | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org/audit policy later | No | review history | High |
| BankStatementImport | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | statement import | High |
| BankStatementTransaction | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | matching/categorization | High |
| BankTransfer | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | transfer create/void | High |
| Branch | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | branch setup, invoice/bill flows | Medium |
| CashExpense | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | cash expense post/void/PDF | High |
| CashExpenseLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | cash expense line totals | High |
| Contact | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke; high if re-granted | Keep grants revoked; org policy later | No | contacts, VAT/ID validation | High |
| CreditNote | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | credit note lifecycle/PDF | High |
| CreditNoteAllocation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | allocation reversal | High |
| CreditNoteLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | credit note lines/tax | High |
| CustomerPayment | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | payment/void/refund blocking | High |
| CustomerPaymentAllocation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | invoice payment allocation | High |
| CustomerPaymentUnappliedAllocation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | overpayment application/reversal | High |
| CustomerRefund | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | refund post/void/PDF | High |
| EmailDeliveryMonitoringEvidence | email/notification | `organizationId` | Off | Low after grant revoke | Keep grants revoked; admin evidence policy later | No | email monitoring evidence, redaction | High |
| EmailOutbox | email/notification | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; never expose bodies | No | mock/SMTP disabled, no customer send | Critical |
| EmailProviderEvent | email/notification | `organizationId` | Off | Low after grant revoke | Keep grants revoked; webhook/admin policy later | No | provider-event redaction | High |
| EmailSenderDomainEvidence | email/notification | `organizationId` | Off | Low after grant revoke | Keep grants revoked; evidence policy later | No | sender-domain evidence | High |
| EmailSuppression | email/notification | `organizationId` | Off | Low after grant revoke | Keep grants revoked; suppression admin policy | No | suppression lifecycle | High |
| FiscalPeriod | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | fiscal lock checks | High |
| GeneratedDocument | storage/document metadata | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; body/download API only | No | archive/list/download, no body leakage | Critical |
| InventoryAdjustment | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | adjustment approve/void | High |
| InventorySettings | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; admin policy later | No | inventory settings and posting guards | High |
| InventoryVarianceProposal | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | variance proposal lifecycle | High |
| InventoryVarianceProposalEvent | audit/log/evidence | `organizationId` | Off | Low after grant revoke | Keep grants revoked; event policy later | No | variance event history | High |
| Item | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | item/inventory/sales/purchase flows | High |
| JournalEntry | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | journal posting/reversal/reports | High |
| JournalLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | reports, tax, ledger correctness | High |
| NumberSequence | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; write policy later | No | sequence/audit/finality | High |
| Organization | user/account/auth related | root tenant table | Off | Low after grant revoke; high if re-granted | Keep grants revoked; membership-based policy later | No | org discovery, cross-tenant denial | High |
| OrganizationDocumentSettings | storage/document metadata | `organizationId` | Off | Low after grant revoke | Keep grants revoked; admin policy later | No | document settings/PDF rendering | High |
| OrganizationMember | user/account/auth related | `organizationId`, `userId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; membership policy later | No | `/auth/me`, permissions, team admin | Critical |
| PurchaseBill | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | bill finalize/AP/void/PDF | High |
| PurchaseBillLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | bill lines/tax/inventory | High |
| PurchaseDebitNote | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | debit note lifecycle/PDF | High |
| PurchaseDebitNoteAllocation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | debit allocation/reversal | High |
| PurchaseDebitNoteLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | debit note lines/tax | High |
| PurchaseOrder | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | purchase order to bill/receipt | High |
| PurchaseOrderLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | purchase order lines | High |
| PurchaseReceipt | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | receipt post/void/asset posting | High |
| PurchaseReceiptLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | receipt lines/stock movement | High |
| Role | user/account/auth related | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; role policy later | No | permission guard and role admin | Critical |
| SalesInvoice | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | invoice lifecycle/payment/void | High |
| SalesInvoiceLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | invoice lines/tax/ZATCA mapping | High |
| SalesStockIssue | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | stock issue/COGS | High |
| SalesStockIssueLine | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | stock issue lines | High |
| StockMovement | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | inventory ledger | High |
| SupplierPayment | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | supplier payment/void/PDF | High |
| SupplierPaymentAllocation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | AP allocation | High |
| SupplierPaymentUnappliedAllocation | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | supplier overpayment reversal | High |
| SupplierRefund | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | supplier refund lifecycle | High |
| TaxRate | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | invoice/bill/tax reports | High |
| User | user/account/auth related | global user table | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; never expose hashes | No | login, `/auth/me`, membership checks | Critical |
| Warehouse | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | warehouse/inventory flows | High |
| WarehouseTransfer | tenant-scoped direct organizationId | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | transfer post/void | High |
| ZatcaComplianceCsidCustodyRecord | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; ZATCA policy last | No | custody redaction/no real CSID | Critical |
| ZatcaCsrConfigReview | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; ZATCA policy last | No | CSR config redaction | Critical |
| ZatcaEgsUnit | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; remove DB private-key path before production | No | no key/CSID leakage, ZATCA safe phase | Critical |
| ZatcaInvoiceMetadata | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; protect XML/QR/hash fields | No | XML/QR/hash redaction, no network | Critical |
| ZatcaOrganizationProfile | ZATCA/compliance | `organizationId` | Off | Low after grant revoke | Keep grants revoked; org policy later | No | readiness/profile checks | High |
| ZatcaSignedArtifactDraft | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; body persistence gate | No | artifact draft redaction | Critical |
| ZatcaSignedArtifactStorageControlEvidence | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; evidence policy later | No | control evidence redaction | Critical |
| ZatcaSignedArtifactStoragePolicyApproval | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; policy approval gate | No | immutable policy/evidence checks | Critical |
| ZatcaSubmissionLog | ZATCA/compliance | `organizationId` | Off | Low after grant revoke; critical if re-granted | Keep grants revoked; never expose payload fields | No | blocked clearance/reporting, payload redaction | Critical |
| _prisma_migrations | migration/system/internal | none | Off | Low after grant revoke; medium if re-granted | Keep grants revoked; no browser access | No | migration history/readiness only | Medium |

## Immediate Mitigation Options

### Option 1: Disable Supabase Data API Entirely

Recommendation: preferred next safe Dashboard-level change if verified in user-testing.

Impact: direct Supabase REST/GraphQL endpoints stop responding regardless of grants/RLS. LedgerByte should keep working because the browser uses the Nest API and the API uses Prisma direct DB access.

Rollback: re-enable Data API in Supabase Dashboard.

Validation: API/web health plus `smoke:accounting:reports`; optionally rerun `smoke:accounting:zatca-safe` with a ceiling that accommodates the known 15+ minute runtime.

Status: not applied in this task because the current tools did not expose the Dashboard Data API toggle.

### Option 2: Remove `anon`/`authenticated` Data API Grants

Recommendation: applied for user-testing on 2026-05-21.

Impact: low-privilege Supabase Data API roles cannot access public application tables/sequences/functions. Nest/Prisma runtime remains untouched.

Rollback: use the rollback SQL above only after confirming a real dependency.

Validation: health passed; reports phase passed.

### Option 3: Enable RLS On A Tiny Safe Subset

Recommendation: deferred.

Reason: even internal tables can be touched by Prisma migrations, readiness checks, or smoke paths. Enabling RLS without a tested runtime role/JWT context strategy risks breaking the app while adding little value after Data API grants are revoked.

### Option 4: Full RLS Policies Later

Recommendation: required before production exposure if the Data API remains enabled or if defense-in-depth at the DB layer is required.

Requirements:

- Decide whether policies use Supabase Auth JWT claims, custom app JWT-to-DB context, or a backend-only direct-DB role model.
- Add helper functions in a non-exposed schema.
- Add cross-tenant denial tests for every controller group.
- Run smoke/E2E with the production-intended runtime role.

### Option 5: Least-Privilege Runtime DB Role

Recommendation: next implementation step after this audit.

Do not switch Vercel `DATABASE_URL` until the role is created, granted, validated, and rollback is ready.

## Least-Privilege Runtime DB Role Plan

Current model:

- API runtime uses a Supabase/Postgres connection through Prisma.
- Migrations use `DIRECT_URL`.
- Runtime and migration credentials are not yet confirmed as split by least privilege.

Desired split:

- `ledgerbyte_runtime` or equivalent:
  - `CONNECT` on the database.
  - `USAGE` on schema `public`.
  - `SELECT`, `INSERT`, `UPDATE`, `DELETE` on required app tables.
  - `USAGE`, `SELECT`, `UPDATE` on sequences where Prisma writes require it.
  - `EXECUTE` only on explicitly required app functions. Current public function count is zero.
  - No `BYPASSRLS`.
  - No ownership/migration privileges.
- Migration role:
  - Owns schema migrations and Prisma migration history.
  - Not used by Vercel runtime.
  - Available only to reviewed migration workflows.

Implementation outline:

1. Create runtime role with a generated password in user-testing only.
2. Grant the minimum object privileges listed above.
3. Keep `DIRECT_URL` on the migration/admin role.
4. Update only API `DATABASE_URL` to the runtime role, keeping transaction pooler behavior.
5. Run health, reports smoke, documents or banking smoke if needed, and finally full E2E in a later task.
6. Roll back by restoring the previous API `DATABASE_URL` value in Vercel, without changing data.

This was not implemented in this task because it can break Prisma runtime if any required grants are missed. It should be a dedicated, reviewed change.

## Storage Access Findings

- No Supabase Storage buckets were present.
- `storage.buckets` and `storage.objects` have RLS enabled.
- The web app does not upload/download through Supabase Storage directly.
- Generated document downloads go through `GET /generated-documents/:id/download` in the Nest API.
- Attachment upload/list/download/soft-delete goes through `/attachments` Nest API routes.
- Existing generated documents and default attachments remain database-backed; S3-compatible attachment storage is API-side feature-flagged, not Supabase Storage.

Do not modify the Supabase `storage` schema directly. If Supabase Storage is introduced later, design bucket-private policies on `storage.objects` and validate signed URL/download paths without printing URLs or object contents.

## Recommended Plan

Immediate controlled-beta position:

1. Keep the Data API grants revoked for `anon` and `authenticated`.
2. Disable the Supabase Data API in the Dashboard if a follow-up confirms no hidden REST/GraphQL dependency and the setting is available.
3. Keep service-role/secret keys out of the web project and ordinary runtime paths.
4. Do not enable RLS broadly until policies and runtime roles are designed and tested.

Next safe implementation step:

1. Create a least-privilege runtime DB role in user-testing.
2. Switch only the API runtime pooler URL to that role.
3. Validate health and narrow smoke.
4. Keep migration/direct credentials separate.

Production blockers remaining:

- 76 public tables still have RLS disabled.
- Full table-level RLS policy design is not implemented.
- Data API Dashboard toggle has not been disabled through the current tools.
- `service_role` still has broad table grants and must remain backend-only.
- Runtime DB least-privilege role split is planned but not implemented.
- Supabase Storage is not used; object-storage production controls remain a separate roadmap item.
