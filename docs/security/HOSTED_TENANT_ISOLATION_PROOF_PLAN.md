# Hosted Tenant Isolation Proof Plan

Date: 2026-06-18

Branch: `feature/hosted-tenant-isolation-proof-plan`

Purpose: define the hosted tenant isolation evidence LedgerByte needs before production readiness can be claimed.

This plan is documentation-only. No hosted command, Supabase command, Vercel command, production database command, seed, reset, delete, migration, schema change, provider call, real bank feed, payment processor integration, real email, ZATCA call, UAE ASP call, Peppol call, or customer-data mutation is authorized by this document.

## Current Local Proof

PR #67 merged into `origin/main` at `0b9de9e9ec9ffa7c7e8f048c75a8efc72516e223`.

PR #67 added local API regression coverage in `apps/api/src/accounting-tenant-isolation-regression.spec.ts` and `apps/api/src/bank-accounts/bank-account.service.spec.ts`.

Local proof now covers:

- Controller permission metadata and default-role RBAC checks for sales invoices, purchase bills, customer payments, supplier payments, credit notes, purchase debit notes, bank accounts, bank-account reconciliation, bank reconciliations, compliance readiness, audit logs, attachments, generated documents, and reports.
- The default `Viewer` role remains read-only for accounting mutations.
- Accounting mutation handlers require mutation permissions and read handlers require view permissions.
- Bank-account transaction opening balances stay scoped to the active organization.
- `BankAccountService.transactions()` now passes `organizationId` into `ledgerBalance`, and `ledgerBalance` filters `journalLine.findMany` by organization.

Local proof does not cover:

- Hosted database behavior.
- Database-enforced row isolation.
- Staging or production environment isolation.
- Backup and restore behavior with tenant boundaries.
- Concurrent request races.
- Deployment runtime configuration.
- Service-role or admin-client bypass risks.
- Object-storage bucket/object tenant isolation.
- Signed URL tenant authorization.
- Provider-side behavior.

## Tenant Model Inventory

The Prisma schema uses `organizationId` as the application tenant boundary for production-domain data. `User` and `Organization` are global/root identity models. Important scoped model groups include:

| Area | Tenant-scoped models |
| --- | --- |
| Membership and permissions | `Role`, `OrganizationMember`, `AuthToken`, `AuthTokenRateLimitEvent` |
| Core accounting | `Account`, `TaxRate`, `JournalEntry`, `JournalLine`, `FiscalPeriod`, `NumberSequence` |
| AR | `Contact`, `SalesInvoice`, `SalesInvoiceLine`, `SalesQuote`, `SalesQuoteLine`, `RecurringInvoiceTemplate`, `RecurringInvoiceRun`, `DeliveryNote`, `CreditNote`, `CreditNoteAllocation`, `CustomerPayment`, `CustomerPaymentAllocation`, `CustomerPaymentUnappliedAllocation`, `CustomerRefund`, `CollectionCase`, `CollectionActivity` |
| AP | `PurchaseOrder`, `PurchaseBill`, `PurchaseBillLine`, `PurchaseReceipt`, `PurchaseDebitNote`, `PurchaseDebitNoteAllocation`, `PurchaseReturn`, `SupplierPayment`, `SupplierPaymentAllocation`, `SupplierPaymentUnappliedAllocation`, `SupplierRefund`, `CashExpense` |
| Banking | `BankAccountProfile`, `BankTransfer`, `BankStatementImport`, `BankStatementTransaction`, `BankDepositBatch`, `CardSettlement`, `ChequeInstrument`, `BankRule`, `BankRuleApplication`, `BankReconciliation`, `BankReconciliationReviewEvent`, `BankReconciliationItem` |
| Inventory | `InventorySettings`, `Item`, `Warehouse`, `StockMovement`, `InventoryBinLocation`, `InventoryBatch`, `InventorySerialNumber`, `InventoryAdjustment`, `WarehouseTransfer`, `SalesStockIssue`, `PurchaseMatchingReview`, `InventoryVarianceProposal` |
| Documents and audit | `GeneratedDocument`, `Attachment`, `DocumentArchiveRecord`, `AuditLog`, `AuditLogRetentionSettings`, `BackupRestoreEvidence` |
| Compliance and ZATCA readiness | `ComplianceProvider`, `ComplianceProfile`, `ComplianceDocument`, `ComplianceValidationResult`, `ComplianceTransmission`, `ComplianceEventLog`, `ZatcaOrganizationProfile`, `ZatcaEgsUnit`, `ZatcaInvoiceMetadata`, `ZatcaSubmissionLog`, and related ZATCA custody/evidence records |
| Email readiness | `EmailOutbox`, `EmailProviderEvent`, `EmailSuppression`, `EmailDeliveryMonitoringEvidence`, `EmailSenderDomainEvidence` |

Schema observations:

- Important tenant-owned models have `organizationId` fields and organization relations.
- Many tenant-owned models also use `@@index([organizationId])` or tenant-composite unique constraints such as `[organizationId, invoiceNumber]`, `[organizationId, billNumber]`, `[organizationId, paymentNumber]`, `[organizationId, entryNumber]`, and `[organizationId, scope]`.
- Search found no Prisma migration in the repo that enables Postgres RLS policies for application tables.
- Raw SQL usage in app source is limited to the health check `SELECT 1`; no tenant data query was found using raw SQL in app source during this pass.

## Environment Strategy

### Local

Use local-only tests for fast regression and query-shape verification. Local proof may use synthetic tenants and local fixtures, but it must not be treated as hosted or customer-data evidence.

### Staging or Dedicated Proof Environment

Hosted proof should run first against staging or a dedicated isolated proof environment. This environment must:

- Use no customer data.
- Use synthetic organizations and users only.
- Be disposable or explicitly labeled as a proof environment.
- Have separate credentials from production.
- Capture sanitized evidence without database URLs, service-role keys, customer document bodies, attachment bodies, auth headers, private keys, provider secrets, signed XML, or QR payload bodies.

### Production

Production proof in this phase should be read-only only unless a later prompt gives explicit approval. Do not write proof tenants or proof records into production during this phase. Production verification should initially be limited to metadata and configuration review.

## Test Tenant Strategy

Minimum synthetic tenant set:

- Organization A: `tenant-a-proof`
- Organization B: `tenant-b-proof`
- Owner/member for tenant A.
- Owner/member for tenant B.
- Optional read-only user for denial checks.

Each proof run should have a unique proof-run ID such as `tenant-isolation-proof-YYYYMMDD-HHMMSS`. Synthetic records must include that ID in names, references, descriptions, or metadata where the model allows it.

## Data Strategy

Use synthetic fixture data only.

Rules:

- No customer data.
- No production data.
- No destructive reset.
- No broad seed/reset/delete.
- No cleanup that can match outside the proof-run ID.
- All proof records must be labeled by proof-run ID.
- Cleanup must be a separate reviewed action with a dry-run inventory first.

Suggested synthetic records:

- One customer and one supplier per tenant.
- One sales invoice and one purchase bill per tenant.
- One customer payment and one supplier payment per tenant.
- One credit note and one purchase debit note per tenant.
- One bank account profile and one journal entry per tenant.
- One generated document metadata row and one attachment metadata row per tenant, if the environment supports those paths safely.
- One audit-log-producing action per tenant.

## API Proof Checklist

For every high-risk resource, use tenant A credentials and tenant B IDs, then reverse the direction.

Required checks:

- Cross-tenant list endpoints do not return other tenant rows.
- Cross-tenant detail reads return `404` or `403`.
- Cross-tenant create with foreign IDs from the other tenant fails.
- Cross-tenant update, finalize, void, allocate, reverse, post, close, reopen, archive, and delete/soft-delete operations fail.
- Dashboard totals do not include the other tenant.
- Report totals, ledger lines, AR/AP aging, and VAT/review summaries do not include the other tenant.
- Generated document metadata does not leak across tenants.
- Attachment metadata and download/signed-url flows do not leak across tenants.
- Audit logs do not return other-tenant actions.
- Bank and ledger aggregates do not include other-tenant lines.
- Permission denials are consistent with existing role labels and permissions.

High-risk endpoint groups:

- AR: invoices, credit notes, customer payments, refunds, collections, statements.
- AP: bills, debit notes, supplier payments, refunds, purchase orders, receipts, cash expenses.
- Banking: bank accounts, statement imports, statement transactions, deposits, transfers, card settlements, cheques, reconciliations.
- Reports: dashboard, Profit and Loss, Balance Sheet, Trial Balance, General Ledger, VAT Summary/Return, aged receivables/payables.
- Documents: generated documents, document archive records, attachment upload/update/delete/download.
- Compliance and audit: compliance documents/events/readiness, audit logs, retention settings.

## Database Isolation Review

Current status from this documentation pass:

- Application-level tenant scoping is the current primary isolation mechanism.
- Important production-domain models have `organizationId` tenant paths.
- The repo does not include migrations that enable application-table RLS policies.
- Prior deployment docs state public-table RLS work and least-privilege runtime-role work remain incomplete.

This is a production blocker or conscious architecture gap until explicitly resolved.

Recommended options:

1. Continue application-enforced tenant isolation with comprehensive tests and strict query-helper conventions.
2. Add database RLS for critical tenant-owned tables after designing a runtime-role/JWT context strategy.
3. Use a hybrid approach: application isolation for all app paths plus RLS on the highest-risk tenant-owned tables and storage metadata.

Do not implement RLS as part of this plan. RLS work needs a separate design, migration plan, rollback plan, runtime-role validation, and compatibility testing.

## Storage Proof Checklist

Current storage posture remains mixed and readiness-oriented. Generated documents and attachments have tenant-scoped database models, but hosted object-storage behavior still needs proof.

Required storage checks:

- Bucket names and object keys include tenant or proof-run prefixes where object storage is used.
- Object keys cannot be guessed across tenants.
- Signed URL creation checks the active organization before issuing a URL.
- Signed URLs are time-limited.
- Generated document metadata lookup checks `organizationId`.
- Attachment lookup, update, soft-delete, and download checks use `organizationId`.
- Archive/retention/legal-hold metadata is tenant-scoped.
- Restore/export paths preserve tenant boundaries.
- Evidence capture excludes document bodies, attachment bodies, signed XML bodies, QR payload bodies, database URLs, service-role keys, and storage credentials.

Suggested key convention for future object storage:

```text
org/<organizationId>/proof/<proofRunId>/<resourceType>/<resourceId>/<filename>
```

Use this as a future design target only. Do not migrate storage or write objects in this planning pass.

## Concurrency and Race Checklist

Future local/staging tests should cover:

- Concurrent customer payment creation against the same invoice.
- Concurrent supplier payment creation against the same bill.
- Concurrent invoice finalization.
- Concurrent purchase bill finalization.
- Concurrent bank reconciliation submit/approve/close/reopen/void.
- Repeated idempotent actions with the same request identity.
- Cross-tenant ID guessing while same-tenant concurrent operations are in flight.
- Opening-balance posting races for bank accounts.
- Unapplied allocation apply/reverse races.

Acceptance for each race:

- No cross-tenant row is read, written, counted, or restored.
- At most one state transition wins when the business rule requires a single winner.
- Failed contenders return a clear conflict or validation error.
- Audit logs remain tenant-scoped.

## Observability Proof Checklist

Hosted proof should capture sanitized metadata for:

- Correlation ID per request.
- Authenticated user ID and organization ID in structured logs where appropriate.
- No secrets or document bodies in logs.
- Audit-log entries for relevant mutations.
- Security event logs for forbidden cross-tenant access attempts.
- Alerting or at least queryable log filters for repeated cross-tenant denials.
- Request IDs attached to API responses and log records.

Do not log customer data, document bodies, attachment bodies, database URLs, service-role keys, provider credentials, signed XML, QR payloads, private keys, auth headers, or cookies.

## Optional Local Harness Design

Prefer documentation over code for this phase.

If a future local-only harness is implemented, it must:

- Be disabled by default.
- Refuse production-looking URLs.
- Require `TENANT_ISOLATION_PROOF_ALLOW_LOCAL=1`.
- Require `TENANT_ISOLATION_PROOF_TARGET=local`.
- Require an explicit `TENANT_ISOLATION_PROOF_RUN_ID`.
- Print target classification and proof-run ID before doing anything.
- Never run against `supabase.co`, `vercel.app`, production domains, or non-local database hosts unless a later prompt explicitly authorizes a staging-only variant.
- Never call seed/reset/delete on hosted data.
- Use only synthetic data and targeted proof-run IDs.
- Support a dry-run inventory mode before any write-capable local execution.

## Acceptance Criteria

Hosted tenant isolation can move toward production-grade status only when all of the following are true:

- PR #67 local regressions remain passing.
- Staging or an isolated proof environment has two synthetic tenants and proves cross-tenant reads/mutations fail across AR, AP, banking, reports, documents, audit, and compliance paths.
- Dashboard, report, bank, and ledger aggregates are proven tenant-scoped in the hosted proof environment.
- Generated document, attachment, archive, and signed URL paths are proven tenant-scoped.
- Database RLS/runtime-role strategy is explicitly accepted, implemented, or formally risk-accepted with compensating controls.
- Service-role/admin bypass paths are inventoried and restricted.
- Concurrency tests cover high-risk posting/allocation/finalization/reconciliation paths.
- Observability captures correlation IDs, tenant IDs, audit/security events, and forbidden-access attempts without leaking sensitive material.
- Backup/restore evidence shows tenant boundaries survive restore and export workflows.
- Accountant/legal/security owners sign off on the production readiness evidence.
- Provider evidence remains separated from tenant proof and is not treated as a substitute for isolation evidence.

## Recommended Next Implementation Arc

Implement a staging-only tenant isolation proof harness with fail-closed target classification and synthetic proof-run IDs.

That future arc should still avoid production writes, avoid customer data, and keep Supabase/Vercel mutations out of scope unless explicitly approved.
