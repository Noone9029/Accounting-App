# Supabase RLS Review - 2026-05-19

This review covers the LedgerByte user-testing Supabase project `xynelbjqcmbgtscfmmzv`. It is an audit document only. It does not enable Row Level Security, change grants, reset data, export customer contents, or alter application behavior.

Official Supabase references used for the review:

- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Securing the Data API: https://supabase.com/docs/guides/api/securing-your-api
- Hardening the Data API: https://supabase.com/docs/guides/database/hardening-data-api

## Current State

- LedgerByte uses Supabase as Postgres, not Supabase Auth.
- The web app talks to the Nest API, not directly to Supabase tables.
- The API enforces tenant isolation through JWT auth, organization context, permission guards, and Prisma queries.
- Supabase security advisor reports `rls_disabled_in_public` for public tables.
- A metadata query on 2026-05-19 returned 76 `public` tables with `rowsecurity=false`.
- No RLS policies were applied in this task.

## 2026-05-21 Follow-Up Hardening

The follow-up audit and mitigation are documented in [SUPABASE_RLS_DATA_API_HARDENING_20260521.md](SUPABASE_RLS_DATA_API_HARDENING_20260521.md).

Current delta from this original review:

- RLS remains disabled on the same 76 public tables. This was intentional; LedgerByte still needs a compatible policy/runtime-role design before table RLS is enabled.
- The web app was rechecked and still uses the Nest API path, not direct Supabase REST, GraphQL, Realtime, or Storage access.
- The user-testing project had broad `anon` and `authenticated` grants on public tables before mitigation.
- Those `anon` and `authenticated` public table, sequence, and function grants were revoked in user-testing, including future default grants for `postgres`-owned public objects.
- API/web health stayed healthy and the reports smoke phase passed after the grant change.
- The Supabase Data API Dashboard toggle was not changed because it was not exposed by the current tool surface.
- A least-privilege Prisma runtime role was designed as `ledgerbyte_app_runtime_user_testing`, but it was not created because the current session had no safe Vercel API `DATABASE_URL` mutation path for storing the new password, redeploying, and validating without printing secrets.
- Follow-up metadata found `supabase_admin` default privileges for future public objects still include `anon`/`authenticated`; review this separately before relying on future-object defaults.

## Why This Matters

Supabase exposes tables in configured API schemas through PostgREST when grants allow access. Supabase documentation recommends enabling RLS on exposed-schema tables and using explicit grants and policies. LedgerByte currently depends on the API as the security boundary, so accidental direct Supabase Data API exposure, leaked database credentials, or overbroad grants could bypass app-layer tenant checks.

This is a controlled-beta blocker, not an instruction to blindly enable RLS. Enabling RLS without compatible policies can break Prisma reads/writes because LedgerByte does not use Supabase Auth claims as the source of identity.

## Tables With Direct `organizationId`

The Prisma schema currently stores `organizationId` directly on the main tenant-scoped models, including:

- Core settings and documents: `OrganizationDocumentSettings`, `InventorySettings`, `GeneratedDocument`, `Attachment`.
- ZATCA: `ZatcaOrganizationProfile`, `ZatcaEgsUnit`, `ZatcaCsrConfigReview`, `ZatcaInvoiceMetadata`, `ZatcaSignedArtifactDraft`, `ZatcaSignedArtifactStoragePolicyApproval`, `ZatcaSignedArtifactStorageControlEvidence`, `ZatcaComplianceCsidCustodyRecord`, `ZatcaSubmissionLog`.
- Auth/permissions/audit: `Role`, `OrganizationMember`, `AuthToken`, `AuthTokenRateLimitEvent`, `AuditLog`, `AuditLogRetentionSettings`, `NumberSequence`.
- Email: `EmailOutbox`, `EmailProviderEvent`, `EmailSuppression`, `EmailDeliveryMonitoringEvidence`, `EmailSenderDomainEvidence`.
- Backup/evidence: `BackupRestoreEvidence`.
- Accounting and operations: `Branch`, `Contact`, `Account`, `BankAccountProfile`, `BankTransfer`, `BankStatementImport`, `BankStatementTransaction`, `BankReconciliation`, `BankReconciliationReviewEvent`, `BankReconciliationItem`, `TaxRate`, `Item`, `Warehouse`, `StockMovement`, `InventoryAdjustment`, `WarehouseTransfer`, `FiscalPeriod`.
- Sales and receivables: `SalesInvoice`, `SalesInvoiceLine`, `CreditNote`, `CreditNoteLine`, `CreditNoteAllocation`, `CustomerPayment`, `CustomerPaymentAllocation`, `CustomerPaymentUnappliedAllocation`, `CustomerRefund`.
- Purchases and payables: `PurchaseOrder`, `PurchaseOrderLine`, `PurchaseBill`, `PurchaseBillLine`, `PurchaseReceipt`, `PurchaseReceiptLine`, `PurchaseDebitNote`, `PurchaseDebitNoteLine`, `PurchaseDebitNoteAllocation`, `SupplierPayment`, `SupplierPaymentAllocation`, `SupplierPaymentUnappliedAllocation`, `SupplierRefund`, `CashExpense`, `CashExpenseLine`.
- Inventory workflows: `SalesStockIssue`, `SalesStockIssueLine`, `InventoryVarianceProposal`, `InventoryVarianceProposalEvent`.
- Journals: `JournalEntry`, `JournalLine`.

Risk level: high for most of these tables if reachable through Supabase Data API without RLS, because direct access would bypass app-layer organization filtering.

## Tables Without Direct `organizationId`

Prisma application models without direct `organizationId`:

- `User`: global identity table. Risk level high because it contains email and password hash metadata.
- `Organization`: root tenant table. Risk level high because it lists tenant roots and links to all tenant-owned data.

Database metadata table:

- `_prisma_migrations`: no app tenant scope. Risk level medium. It does not contain customer workflow data, but it should not be exposed through browser-facing APIs.

No additional child-only Prisma models were found without `organizationId`; line and allocation models currently include organization scope directly.

## Storage And Document Tables

- `GeneratedDocument` has `organizationId` and sensitive storage/content fields such as `storageKey`, `contentBase64`, and `contentHash`.
- `Attachment` has `organizationId` and sensitive storage/content fields such as `storageKey`, `contentBase64`, and `contentHash`.

Risk level: critical if directly exposed. RLS or Data API lock-down must prevent document body, attachment body, storage key, and hash exposure.

## ZATCA Tables

ZATCA tables are all tenant-scoped but need special handling:

- `ZatcaEgsUnit` includes CSRs, private key fields, CSID placeholders, hash-mode metadata, and SDK/hash-chain metadata.
- `ZatcaInvoiceMetadata` includes invoice hash, previous invoice hash, XML base64, QR base64, and XML hash fields.
- `ZatcaSubmissionLog` includes request/response payload storage fields.
- Signed artifact and custody planning tables contain evidence and storage metadata.

Risk level: critical. RLS hardening must not enable real ZATCA network behavior, CSID requests, clearance/reporting, PDF-A3, signed XML/QR body persistence, or production compliance claims.

## Email Tables

Email tables include:

- `EmailOutbox`: tenant-scoped but includes recipient addresses and message bodies.
- `EmailProviderEvent`: tenant-scoped provider event metadata.
- `EmailSuppression`: tenant-scoped masked/hash suppression metadata.
- `EmailSenderDomainEvidence`: tenant-scoped sender-domain evidence.
- `EmailDeliveryMonitoringEvidence`: tenant-scoped monitoring evidence.

Risk level: high to critical. RLS or Data API lock-down must prevent recipient/body exposure. Email sends remain disabled by default in non-production and must stay unchanged by this review.

## Why Blind RLS Enablement Can Break The App

- LedgerByte uses application-owned JWT auth, not Supabase Auth.
- Policies based only on `auth.uid()` will not match LedgerByte users unless a deliberate mapping layer is introduced.
- Enabling RLS without policies can make rows invisible to non-bypass database roles.
- Enabling broad policies can create a false sense of isolation if they do not match LedgerByte organization membership and permission semantics.
- Prisma transactions may need a session-local organization/user context if policies depend on custom Postgres settings.
- Migrations, seed, smoke, E2E, background workers, email retry processors, and evidence endpoints need separate compatibility checks.

## Recommended Phased Strategy

Phase 0 - controlled-beta mitigation:

- Keep the database private and app-only.
- Do not expose Supabase publishable/anon keys to the browser for table access.
- Disable or restrict the Supabase Data API for `public` if LedgerByte does not need it for browser workflows.
- Revoke automatic `anon` and `authenticated` grants from application tables if compatible with operational tooling.
- Keep API runtime and migration credentials separate where possible.
- Rotate test credentials before wider user testing.

Phase 1 - least-privilege database roles:

- Create a runtime database user for the API with only required privileges.
- Keep migration privileges separate and unavailable to runtime functions.
- Confirm Prisma migrations and serverless pooler behavior still work.

Phase 2 - RLS design:

- Add a trusted per-transaction context such as `ledgerbyte.organization_id` and `ledgerbyte.user_id`, set by the API before tenant queries.
- Build policy helper functions in a non-exposed schema.
- Do not place security-definer helper functions in exposed schemas.
- Write policies for direct organization-scoped tables first.

Phase 3 - line/allocation/ZATCA/email/document policies:

- Add policies for line/allocation tables and verify joins are efficient.
- Add restrictive policies around generated documents, attachments, email outbox, auth tokens, ZATCA metadata, and audit logs.
- Add column-level grants or redacted views if direct Data API access is ever needed.

Phase 4 - rollout:

- Test against a disposable Supabase branch or non-production clone.
- Run smoke and full E2E with the same runtime role that production will use.
- Roll out table groups only after rollback scripts and monitoring are ready.

## Required Tests Before Enabling RLS

- Login, `/auth/me`, membership switching, role/permission visibility.
- Dashboard summary and onboarding checklist.
- Contacts, VAT/ID validation, customers, suppliers, items.
- Sales invoice draft/finalize/payment/void protections.
- Purchase bill/finalize/payment/debit note flows.
- Bank transfer, bank statement import, reconciliation, reports.
- Inventory operational flows and no-negative-stock protections.
- Generated documents and attachment list/download without body leakage.
- Audit log redaction and retention previews.
- Email readiness, retry plans, webhooks, suppressions, and disabled send gates.
- Backup/restore readiness and metadata-only evidence endpoints.
- ZATCA readiness, XML/QR/hash local-only behavior, network-disabled gates, and production compliance false assertions.
- Cross-tenant denial tests for every controller group.

## Recommended Controlled-Beta Position

For the current user-testing deployment, do not enable RLS blindly. Treat public-table RLS disabled as an open security finding with these compensating controls:

- Keep all Supabase credentials out of browser-visible env vars.
- Keep Data API keys out of the web project.
- Use the Nest API as the only user-facing data path.
- Limit Supabase dashboard and database access to trusted operators.
- Keep remote E2E and smoke pointed only at the test project.
- Document that broad production exposure is blocked until Data API hardening or tested RLS policies are complete.
