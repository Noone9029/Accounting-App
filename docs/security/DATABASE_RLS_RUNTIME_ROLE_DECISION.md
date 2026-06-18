# Database RLS And Runtime Role Decision

Date: 2026-06-18

Scope: planning, audit, and documentation only. This pass did not run hosted commands, mutate hosted/customer data, change Prisma schema, add migrations, enable RLS, change runtime roles, deploy to Vercel, run Supabase commands, or touch production.

## Decision Summary

Recommended production direction: Option C, a hybrid approach.

LedgerByte should keep application-enforced tenant isolation as the active boundary while adding a least-privilege API runtime database role immediately before paid production, then design database-enforced RLS for the critical tenant tables in a separate tested rollout. This recommendation avoids a blind RLS cutover that could break Prisma and existing workflows, while acknowledging that application-only `organizationId` scoping is not enough for a production-grade tenant boundary.

Database-enforced application-table RLS is absent/pending in the repository. The Prisma schema and migrations define tenant columns, indexes, and foreign keys, but no migration was found that enables row-level security or creates table policies for the LedgerByte application tables.

## Current Evidence

Schema and migration evidence:

- `apps/api/prisma/schema.prisma` gives most production-domain models a direct `organizationId` tenant path.
- `User` and `Organization` are root/global models and do not have an `organizationId` field.
- `EmailOutbox`, `BackupRestoreEvidence`, `AuthToken`, and `AuthTokenRateLimitEvent` allow nullable `organizationId` and need special policy design.
- No Prisma migration contains application-table `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, or `CREATE POLICY` statements.

Runtime and service evidence:

- API routes use `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard`.
- `OrganizationContextGuard` requires `x-organization-id` and an active `OrganizationMember` row for the authenticated user.
- `PermissionGuard` reloads active membership and role permissions for the request organization.
- PR #67 added local API tenant-isolation and RBAC metadata regression coverage, including accounting-adjacent controllers.
- PR #67 fixed a real bank-account opening-balance bug by carrying `organizationId` into the journal-line balance query.
- App-source raw SQL found in this pass is limited to the health-check `SELECT 1`.

Hosted proof evidence:

- PR #69 added the disabled-by-default hosted tenant isolation proof harness and proof plan.
- PR #70 added fail-closed harness modes for dry-run, read-only-plan, staging-read-only-probe, staging-synthetic-proof, and production-read-only-posture.
- PR #71 recorded that staging proof was not executed because the required staging URL, proof-run ID, auth token, synthetic tenant IDs, and allow gates were missing.
- Hosted tenant isolation remains not yet proven.

## Current Tenant Protection

Current tenant protection is application-enforced:

- Controllers derive organization context from authenticated requests and the `x-organization-id` header.
- Guards require active organization membership before protected handlers run.
- Permission checks are based on the active membership role.
- Services usually pass `organizationId` into `findMany`, `findFirst`, mutations, aggregates, and relation validation.
- Many tenant tables have `organizationId` indexes or composite unique constraints such as organization-scoped document numbers, codes, or sequence scopes.
- Local regression tests now cover tenant isolation and permission metadata for key accounting surfaces.

These protections are meaningful, but they depend on every query and future code path continuing to include the correct tenant predicate.

## Important Model Coverage

Direct tenant-scoped models include:

| Area | Priority models |
| --- | --- |
| Identity and authorization | `Role`, `OrganizationMember` |
| Accounting core | `Account`, `TaxRate`, `JournalEntry`, `JournalLine`, `FiscalPeriod`, `NumberSequence` |
| Sales and AR | `SalesInvoice`, `SalesInvoiceLine`, `CreditNote`, `CreditNoteLine`, `CreditNoteAllocation`, `CustomerPayment`, `CustomerPaymentAllocation`, `CustomerPaymentUnappliedAllocation`, `CustomerRefund`, `SalesQuote`, `RecurringInvoiceTemplate`, `DeliveryNote`, `CollectionCase`, `CollectionActivity`, `SalesInventoryReturn` |
| Purchases and AP | `PurchaseOrder`, `PurchaseBill`, `PurchaseBillLine`, `PurchaseReceipt`, `PurchaseDebitNote`, `PurchaseDebitNoteLine`, `PurchaseDebitNoteAllocation`, `PurchaseReturn`, `SupplierPayment`, `SupplierPaymentAllocation`, `SupplierPaymentUnappliedAllocation`, `SupplierRefund`, `CashExpense` |
| Banking | `BankAccountProfile`, `BankTransfer`, `BankStatementImport`, `BankStatementTransaction`, `BankDepositBatch`, `BankDepositBatchLine`, `CardSettlement`, `ChequeInstrument`, `BankRule`, `BankRuleApplication`, `BankReconciliation`, `BankReconciliationItem`, `BankReconciliationReviewEvent`, `BankingClearingAccountConfig` |
| Inventory | `Item`, `Warehouse`, `StockMovement`, `InventoryBinLocation`, `InventoryBatch`, `InventorySerialNumber`, `InventoryAdjustment`, `WarehouseTransfer`, `InventorySettings`, `InventoryVarianceProposal`, `InventoryVarianceProposalEvent` |
| Documents and storage metadata | `GeneratedDocument`, `DocumentArchiveRecord`, `Attachment`, `OrganizationDocumentSettings` |
| Compliance and evidence | `ComplianceProvider`, `ComplianceProfile`, `ComplianceDocument`, `ComplianceValidationResult`, `ComplianceTransmission`, `ComplianceEventLog`, `AuditLog`, `AuditLogRetentionSettings`, `EmailProviderEvent`, `EmailSuppression`, `EmailDeliveryMonitoringEvidence`, `EmailSenderDomainEvidence`, ZATCA custody/evidence models |

Special handling is needed for:

- `User`: global identity record.
- `Organization`: root tenant record; access must be membership-based.
- Nullable organization tables: token, rate-limit, email, and backup/restore evidence rows must define explicit global-vs-tenant behavior before RLS policies are written.
- Prisma migration history and operational metadata: internal-only access through admin/migration roles.

## Risks Remaining

Key production risks:

- A developer omits `organizationId` in a future `findUnique`, `findFirst`, `findMany`, aggregate, update, delete, or upsert path.
- A mutation uses `where: { id }` after an application-level lookup, which is acceptable only if the lookup and transaction boundary are correct.
- `findUnique` by global ID cannot include `organizationId` unless a compound unique exists; future code may accidentally bypass tenant checks.
- Raw SQL could bypass tenant predicates if introduced later.
- A high-privilege runtime database user, service-role key, admin client, or leaked database URL can bypass application controls.
- Background jobs, webhooks, provider callbacks, email workers, report jobs, and future payment/bank-feed integrations can lose tenant context.
- Dashboard/report aggregate queries can leak cross-tenant totals if a predicate is missed.
- Storage object keys and signed URLs can become a second tenant boundary if direct object access is introduced.

## Runtime Role Strategy

Before production, LedgerByte should separate database roles:

| Role | Purpose | Required behavior |
| --- | --- | --- |
| App runtime role | Ordinary API Prisma traffic | `LOGIN`, least-privilege table/function access, `NOBYPASSRLS`, no schema ownership, no migration privileges, no broad admin grants. |
| Migration/admin role | Prisma migrations, controlled schema operations | Used only by CI/operations for approved migrations; not used by normal API runtime. |
| Read-only/report role | Optional analytics or support reads | Read-only, tenant-scoped, no customer document/body access unless explicitly justified and audited. |
| Service/admin key class | Emergency or platform administration only | Never exposed to browser code or ordinary runtime paths; usage must be documented, audited, and alertable. |

Environment separation:

- Local can use developer-friendly roles but should still run tenant-isolation tests.
- Staging should prove the production-like runtime role before production.
- Production must not run ordinary API traffic with a migration/admin credential.

## RLS Recommendation

Option A, application-enforced tenant isolation plus strict helpers and broad tests, is not sufficient by itself for paid production because a single missed predicate or leaked high-privilege credential can bypass the tenant boundary.

Option B, immediate database-enforced RLS for all critical tenant tables, is safer as an end state but too risky to enable blindly because LedgerByte uses Prisma and its own JWT/membership model rather than Supabase Auth claims.

Option C, the hybrid approach, is the safest practical decision:

- Keep application-level `organizationId` scoping and permission guards as the active boundary.
- Add stricter query patterns and regression coverage for high-risk tables.
- Cut ordinary API runtime to a least-privilege non-admin database role.
- Design RLS around trusted API-set session variables such as organization and user context, or another reviewed policy mechanism compatible with Prisma transactions.
- Roll RLS out first to critical tenant tables in staging/proof environments with two synthetic tenants.
- Do not claim tenant isolation is production-grade until both app-layer and database/runtime-role evidence pass.

## Priority Tables For Future RLS Or Stricter Guards

First priority:

- `Organization`, `OrganizationMember`, `Role`
- `User` access paths and membership-derived organization discovery
- `Attachment`, `GeneratedDocument`, `DocumentArchiveRecord`, `OrganizationDocumentSettings`
- `AuditLog`, `AuditLogRetentionSettings`
- `JournalEntry`, `JournalLine`, `Account`, `NumberSequence`, `FiscalPeriod`
- `SalesInvoice`, `PurchaseBill`, `CustomerPayment`, `SupplierPayment`, `CreditNote`, `PurchaseDebitNote`
- `BankAccountProfile`, `BankStatementImport`, `BankStatementTransaction`, `BankReconciliation`
- `EmailOutbox`, token/rate-limit tables, backup/restore evidence

Second priority:

- Inventory and stock movement tables.
- Compliance readiness and ZATCA/UAE metadata tables.
- Report-supporting aggregate sources.
- Provider/webhook/event tables after provider integrations are explicitly approved.

## Acceptance Criteria Before Production

Tenant isolation is not production-grade until all of the following are complete:

- Approved staging/proof credentials exist for two synthetic tenants.
- PR #69/#70/#71 harness path runs a staging read-only probe and then an explicitly approved staging synthetic proof.
- Critical APIs deny Tenant A access to Tenant B records by ID, list filters, aggregates, report endpoints, attachment downloads, generated document downloads, and settings endpoints.
- Runtime API database role is least-privilege and not a migration/admin/service-role credential.
- RLS strategy is either implemented and tested for critical tables, or a formally accepted compensating control keeps the database private/app-only with Data API exposure blocked and documented.
- Raw SQL introduction is gated by review and tests.
- Background jobs, future webhooks, provider callbacks, and scheduled workers carry tenant context explicitly.
- Storage object and signed URL tenant isolation proof passes.
- Backup/restore, concurrency/race, and observability evidence are recorded.
- Security/accounting/legal owners sign off on the exact production posture.

## Safety Confirmation For This Pass

- No hosted commands were run.
- No hosted/customer data was mutated.
- No Supabase command was run.
- No Vercel deploy command was run.
- No schema or migration changes were made.
- No RLS implementation was added.
- No ZATCA production work was added.
- No UAE Peppol/PINT-AE/ASP production work was added.
- Provider evidence remains unavailable.
