# RLS Staging Design

Date: 2026-06-18

Scope: local planning and documentation only. This document does not enable RLS, create policies, apply migrations, connect to hosted databases, run Supabase commands, run Vercel commands, or mutate hosted/customer data.

## Rollout Objective

Prove in staging that critical LedgerByte tenant tables can be protected at the database layer without breaking the existing application-level tenant scoping, organization membership checks, and permission guards.

The target state is defense in depth:

- Keep application-level `organizationId` predicates and permission checks.
- Add a least-privilege API runtime database role.
- Add transaction-scoped tenant context for Prisma operations that need database policies.
- Stage RLS first on critical tenant tables with synthetic tenants.
- Do not claim hosted or production tenant isolation proof until staging evidence passes and is reviewed.

## Critical Table Priority Order

The schema has no `@@map` table remaps, so table names match the quoted Prisma model names.

First priority:

1. `Organization`
2. `OrganizationMember`
3. `Role`
4. `User` access paths that discover memberships
5. `SalesInvoice`
6. `SalesInvoiceLine`
7. `CreditNote`
8. `CreditNoteLine`
9. `CustomerPayment`
10. `CustomerPaymentAllocation`
11. `CustomerPaymentUnappliedAllocation`
12. `PurchaseBill`
13. `PurchaseBillLine`
14. `PurchaseDebitNote`
15. `PurchaseDebitNoteLine`
16. `SupplierPayment`
17. `SupplierPaymentAllocation`
18. `SupplierPaymentUnappliedAllocation`
19. `JournalEntry`
20. `JournalLine`
21. `Account`
22. `NumberSequence`
23. `FiscalPeriod`
24. `BankAccountProfile`
25. `BankStatementImport`
26. `BankStatementTransaction`
27. `BankReconciliation`
28. `BankReconciliationItem`
29. `Attachment`
30. `GeneratedDocument`
31. `DocumentArchiveRecord`
32. `OrganizationDocumentSettings`
33. `ComplianceProvider`
34. `ComplianceProfile`
35. `ComplianceDocument`
36. `ComplianceValidationResult`
37. `ComplianceTransmission`
38. `ComplianceEventLog`
39. `AuditLog`
40. `AuditLogRetentionSettings`

Second priority:

- Inventory and stock movement tables: `Item`, `Warehouse`, `StockMovement`, `InventoryBinLocation`, `InventoryBatch`, `InventorySerialNumber`, `InventoryAdjustment`, `WarehouseTransfer`, `PurchaseReceipt`, `SalesStockIssue`, `InventoryVarianceProposal`, `InventoryVarianceProposalEvent`.
- Banking support tables: `BankTransfer`, `BankDepositBatch`, `BankDepositBatchLine`, `CardSettlement`, `ChequeInstrument`, `BankingClearingAccountConfig`, `BankRule`, `BankRuleApplication`, `BankReconciliationReviewEvent`.
- Sales and purchase support tables: `SalesQuote`, `SalesQuoteLine`, `RecurringInvoiceTemplate`, `RecurringInvoiceTemplateLine`, `RecurringInvoiceRun`, `DeliveryNote`, `DeliveryNoteLine`, `CollectionCase`, `CollectionActivity`, `PurchaseOrder`, `PurchaseOrderLine`, `PurchaseReturn`, `PurchaseReturnLine`, `PurchaseMatchingReview`, `CashExpense`, `CashExpenseLine`, `CustomerRefund`, `SupplierRefund`.
- Evidence and operational metadata tables with nullable tenant fields: `EmailOutbox`, `EmailProviderEvent`, `EmailSuppression`, `EmailDeliveryMonitoringEvidence`, `EmailSenderDomainEvidence`, `BackupRestoreEvidence`, `AuthToken`, `AuthTokenRateLimitEvent`.
- ZATCA readiness and custody tables for KSA-specific paths: `ZatcaOrganizationProfile`, `ZatcaEgsUnit`, `ZatcaCsrConfigReview`, `ZatcaInvoiceMetadata`, `ZatcaSignedArtifactDraft`, `ZatcaSignedArtifactStoragePolicyApproval`, `ZatcaSignedArtifactStorageControlEvidence`, `ZatcaComplianceCsidCustodyRecord`, `ZatcaCredentialLifecycle`, `ZatcaSubmissionLog`.

## Tenant Context Strategy

RLS policies need the database to know the active organization and user. Options:

| Option | Benefit | Risk |
| --- | --- | --- |
| `SET LOCAL app.current_organization_id` and `SET LOCAL app.current_user_id` | Works with PostgreSQL settings and keeps context transaction-scoped. | Requires every protected query to run inside the transaction that sets context. |
| Prisma transaction wrapper | Centralizes tenant context around `$transaction` and service helpers. | Existing services must be audited and migrated to the wrapper. |
| Request-scoped database transaction | Strong request boundary for HTTP handlers. | Broad refactor risk and transaction duration concerns. |
| Dedicated tenant-scoped helper | Lower-risk migration path for critical services. | Coverage can be incomplete unless enforced by tests and review. |

Recommended staging approach:

Use `SET LOCAL app.current_organization_id` and `SET LOCAL app.current_user_id` inside a dedicated Prisma transaction helper, then migrate only the critical proof paths into that helper for staging. Keep existing app-layer guards and `organizationId` predicates in place. Do not rely on session-level settings outside a transaction.

The staging helper should:

- Require authenticated user id and active organization id.
- Verify active membership before entering protected operations.
- Run `SET LOCAL` inside the transaction.
- Execute the tenant-scoped operation inside the same transaction.
- Refuse to run if tenant context is missing.
- Log sanitized proof metadata, not secrets or row payloads.

## Policy Shape

Policy examples are described conceptually here. SQL templates live under `docs/security/sql/` and are not migrations.

Organization-owned rows:

- Tables with required `organizationId` should allow `SELECT`, `INSERT`, and `UPDATE` only when `organizationId` matches `current_setting('app.current_organization_id', true)`.
- `DELETE` should remain denied unless a table has explicitly approved hard-delete behavior.

Membership rows:

- `OrganizationMember` reads should be restricted to memberships for the current user or rows inside the active organization, depending on endpoint purpose.
- Membership writes should stay restricted to service paths that already require owner/admin permissions at the application layer.

Root/global rows:

- `Organization` should be visible only when the current user has an active membership in the organization.
- `User` should be limited to the current user and membership-derived lookups. Broad user directory reads should remain unavailable unless explicitly designed.
- Global/reference rows should be read-only or have no RLS only if they are truly global and carry no tenant data.

Audit logs:

- `AuditLog` reads should be tenant-scoped.
- Writes should be append-only from the API runtime role.
- Updates and deletes should be denied for ordinary runtime.

Documents and generated documents:

- `Attachment`, `GeneratedDocument`, `DocumentArchiveRecord`, and `OrganizationDocumentSettings` should be tenant-scoped by `organizationId`.
- Object-storage access should remain API-mediated. Any future signed URL path needs separate tenant proof before use.

Nullable organization tables:

- Rows with `organizationId IS NOT NULL` should follow tenant policies.
- Rows with `organizationId IS NULL` need explicit global policy review before exposure.
- Evidence tables must not expose secrets, document bodies, attachment bodies, provider credentials, or connection strings.

## Prisma Caveats

Prisma and RLS require careful boundaries:

- `SET LOCAL` only lasts for the current transaction.
- Prisma queries outside the transaction that sets context will not retain tenant settings.
- Supabase transaction pooling and Prisma pooling can break assumptions if session-level variables are used. Use transaction-scoped settings only.
- Nested service calls must receive the transaction client, not fall back to the global `PrismaService`.
- Background jobs, scheduled workers, provider callbacks, email retry workers, and report exports must explicitly set tenant context.
- `findUnique` by global id remains risky unless wrapped by tenant context or backed by compound unique constraints.
- Raw SQL must remain rare and reviewed. The current app-source raw SQL is only readiness `SELECT 1`.

## Staging Proof Sequence

1. Generate a dry-run SQL plan from templates and actual model inventory.
2. Review table selection, privilege grants, and rollback steps.
3. Apply only to an isolated staging/proof database after explicit approval.
4. Configure staging API runtime to use the least-privilege runtime role.
5. Add the transaction-scoped tenant context helper in staging branch scope.
6. Enable policies first for a narrow critical-table set.
7. Run API tenant isolation regression.
8. Run hosted/staging proof harness with two synthetic tenants.
9. Run cross-tenant ID guessing checks for reads, mutations, aggregates, reports, attachments, and generated documents.
10. Run app smoke tests for normal workflows.
11. Rehearse rollback in staging only.
12. Archive sanitized proof output.

No production rollout should happen until staging passes and owners approve.

## Rollback Strategy

Rollback is staging-only until explicitly approved otherwise:

- Disable the staged policies or drop test policies in the isolated staging/proof database.
- Restore the staging API `DATABASE_URL` only through approved secret management.
- Keep the migration/admin role separate from runtime.
- Preserve sanitized before/after proof output.
- Do not run rollback commands against production unless a future production incident procedure explicitly authorizes it.

## Acceptance Criteria

RLS staging proof is successful only if:

- Tenant A cannot read Tenant B rows by id.
- Tenant A cannot mutate Tenant B rows by id.
- Tenant A cannot infer Tenant B rows through list filters, aggregates, dashboard totals, reports, or search.
- Bank, ledger, and inventory aggregates stay tenant-scoped.
- Attachment, generated-document, and archive metadata stay tenant-scoped.
- Document body and attachment body access remains API-mediated.
- Background jobs and report paths cannot bypass tenant context.
- Runtime role cannot bypass policies.
- Migration/admin role remains out of ordinary API runtime.
- Normal app workflows still pass.
- Rollback is rehearsed in staging.
- Security/accounting/legal owners sign off before production use.

## Current Pass Outcome

This pass produced the RLS staging design only. No RLS policy is active because of this document, no SQL template was applied, no schema or migration changed, and no hosted/customer data was touched.
