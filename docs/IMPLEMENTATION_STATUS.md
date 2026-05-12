# Implementation Status

Audit date: 2026-05-12

Status values:

- `COMPLETE_FOR_MVP`: usable in the current local MVP.
- `PARTIAL`: substantial behavior exists, but important workflow gaps remain.
- `GROUNDWORK_ONLY`: data structures or scaffolding exist without a full user workflow.
- `NOT_STARTED`: no meaningful implementation yet.
- `NEEDS_MANUAL_SETUP`: requires credentials, services, or human setup.
- `NEEDS_PRODUCTION_HARDENING`: works locally but needs security, scale, operations, or compliance hardening.

## Foundation

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Monorepo | COMPLETE_FOR_MVP | `package.json`, `pnpm-workspace.yaml`, `apps/*`, `packages/*` | Shared workspace scripts, packages, API/web separation. | No CI file seen in repo. | Add CI pipeline for typecheck/test/build/smoke. |
| Docker/local infra | PARTIAL | `infra/docker-compose.yml`, `infra/README.md` | Local Postgres, Redis, API, web services. | Production infra not defined; Docker Desktop may be unavailable locally. | Add production deployment plan and compose health notes. |
| Auth | COMPLETE_FOR_MVP | `apps/api/src/auth`, `apps/web/src/app/(auth)` | Register, login, JWT, `GET /auth/me`. | Password reset, MFA, refresh-token rotation not present. | Add account recovery and stronger session policy. |
| Tenant/org model | COMPLETE_FOR_MVP | `organizations`, `OrganizationMember`, `OrganizationContextGuard` | `x-organization-id` scoping and membership checks. | Cross-org test coverage should continue expanding as modules grow. | Add central tenant-scoping checklist for new modules. |
| Roles/permissions | GROUNDWORK_ONLY | `Role`, `OrganizationMember.roleId` | Roles are stored. | Permissions JSON is not enforced. | Implement permission guards and UI capability checks. |
| Audit logs | PARTIAL | `apps/api/src/audit-log`, `AuditLog` | Mutating services write selected audit logs. | Coverage may not be complete for all business events. | Audit every mutation and standardize event names. |
| Number sequences | COMPLETE_FOR_MVP | `apps/api/src/number-sequences`, `NumberSequence` | Invoice, payment, bill, refund, credit note, journal numbering. | No user-configurable prefixes UI. | Add number-sequence settings and collision tests. |
| Document settings | COMPLETE_FOR_MVP | `document-settings`, settings page | Organization PDF titles/colors/visibility flags. | Template designer not present. | Add template preview and advanced layouts. |
| Generated document archive | PARTIAL | `generated-documents`, `GeneratedDocument` | Generated PDFs are archived and downloadable. | Stores base64 in DB; no object storage lifecycle. | Move to S3-compatible storage. |

## Accounting

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Chart of accounts | COMPLETE_FOR_MVP | `chart-of-accounts`, `Account` | CRUD, system account protections, posting flags. | Descendant cycle prevention and production COA review remain. | Add accountant-reviewed COA templates. |
| Tax rates | COMPLETE_FOR_MVP | `tax-rates`, `TaxRate` | Sales/purchase/both scope, validation, seed VAT rates. | VAT return reporting not implemented. | Add VAT report model and validations. |
| Manual journals | COMPLETE_FOR_MVP | `accounting`, `JournalEntry`, `JournalLine`, `fiscal-periods` | Create/edit draft, post, reverse, balance validation, fiscal posting guard. | Reversal date is current date only. | Add user-selected reversal date if needed. |
| Journal posting | COMPLETE_FOR_MVP | `accounting-core`, business services, `reports` | Balanced entries from AR/AP workflows and accountant reports. | Production report definitions still need accountant review. | Add accountant review and export/PDF outputs. |
| Journal reversal | COMPLETE_FOR_MVP | `AccountingService.reverse`, workflow voids, `FiscalPeriodGuardService` | Reversal entries, idempotent workflow reuse, and fiscal guard on reversal date. | Manual and workflow reversal race behavior should be load-tested. | Add concurrency/load tests. |
| Fiscal periods | PARTIAL | `FiscalPeriod`, `apps/api/src/fiscal-periods`, `/fiscal-periods` | API/UI for create/update/close/reopen/lock and posting-date locks across journal-producing workflows. | No unlock/admin approval, fiscal year wizard, or retained earnings close. | Add year-end close and approval workflow. |
| Reports | COMPLETE_FOR_MVP | `reports`, `/reports/*` | General Ledger, Trial Balance, P&L, Balance Sheet, VAT Summary, AR/AP aging. | No report PDF/CSV export; VAT summary is not official filing. | Add export/PDF and accountant-reviewed definitions. |

## Sales

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Contacts/customers | COMPLETE_FOR_MVP | `contacts`, `Contact` | Customer/supplier/BOTH contacts and detail page. | No import/export or duplicate detection. | Add CSV import and merge workflow. |
| Items/products | PARTIAL | `items`, `Item` | Items with revenue/expense accounts and tax defaults. | Inventory tracking flag has no stock engine. | Add inventory module before stock items are production-useful. |
| Sales invoices | COMPLETE_FOR_MVP | `sales-invoices`, invoice form/pages | Draft, edit, finalize, void, PDF, ZATCA local metadata. | Recurring invoices and official tax compliance not present. | Add recurring invoices and reports. |
| Invoice finalization | COMPLETE_FOR_MVP | `sales-invoice.service.ts`, `sales-invoice-accounting.ts`, `FiscalPeriodGuardService` | AR/revenue/VAT posting, idempotency, fiscal posting guard. | No recurring invoice engine. | Add recurring invoices. |
| Customer payments | COMPLETE_FOR_MVP | `customer-payments` | Posted payments, allocations, voids, receipts. | Gateway integration not present. | Add bank/gateway integration later. |
| Payment allocation | COMPLETE_FOR_MVP | `CustomerPaymentAllocation` | Invoice balance updates and over-allocation guards. | Allocation editing is void/recreate only. | Add UX for corrections if needed. |
| Unapplied payment application | COMPLETE_FOR_MVP | `CustomerPaymentUnappliedAllocation` | Apply/reverse overpayments to later invoices. | No automatic matching suggestions. | Add matching suggestions. |
| Customer refunds | COMPLETE_FOR_MVP | `customer-refunds` | Manual refunds from unapplied payments/credits, voids, PDFs. | No gateway refunds or bank reconciliation. | Add bank workflow first. |
| Credit notes | COMPLETE_FOR_MVP | `credit-notes` | Draft/finalize/void, PDFs, ledger rows. | ZATCA credit note XML not implemented. | Implement official credit note XML after ZATCA base is real. |
| Credit note allocation | COMPLETE_FOR_MVP | `CreditNoteAllocation` | Apply credit notes to invoices. | No automatic suggestions. | Add matching assistant later. |
| Credit note allocation reversal | COMPLETE_FOR_MVP | `reversedAt`, reverse endpoint | Restores invoice and credit balances without journals. | No dedicated reversal history page. | Add audit view. |
| Customer ledger | COMPLETE_FOR_MVP | `contact-ledger.service.ts`, contact page | AR running balance and neutral allocation rows. | Needs browser QA across row types. | Add E2E tests. |
| Customer statement | COMPLETE_FOR_MVP | statement endpoints/PDF | Date-filtered statement and PDF. | No scheduled/email delivery. | Add email provider later. |
| Invoice/receipt/statement PDFs | COMPLETE_FOR_MVP | `pdf-core`, PDF endpoints | Operational PDFs and archive. | Not legal PDF/A-3 or template-complete. | Add storage/template roadmap. |

## Purchases

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Suppliers | COMPLETE_FOR_MVP | `Contact.type=SUPPLIER/BOTH` | Supplier contacts, AP ledger on contact detail. | Supplier onboarding fields are basic. | Add supplier tax/bank details. |
| Purchase bills | COMPLETE_FOR_MVP | `purchase-bills` | Draft/edit/finalize/void, AP posting, PDF. | No purchase order matching. | Add purchase orders. |
| Bill finalization | COMPLETE_FOR_MVP | `purchase-bill-accounting.ts`, `FiscalPeriodGuardService` | Dr expense/asset, Dr VAT receivable, Cr AP, fiscal posting guard. | No purchase order matching. | Add purchase orders. |
| Supplier payments | COMPLETE_FOR_MVP | `supplier-payments` | Posted payments, allocations, void restore, receipts. | No bank reconciliation. | Add bank account/reconciliation module. |
| Supplier ledger | COMPLETE_FOR_MVP | `supplierLedger`, contact page | AP balance and bill/payment/void rows. | UI should use supplier-specific balance wording. | Add AP-specific display helper. |
| Supplier statement | COMPLETE_FOR_MVP | `/contacts/:id/supplier-statement` | Date-filtered AP statement JSON. | No supplier statement PDF. | Add supplier statement PDF if needed. |
| Purchase bill PDFs | COMPLETE_FOR_MVP | `renderPurchaseBillPdf` | Operational PDF and archive. | No vendor attachment capture. | Add attachments later. |
| Supplier payment PDFs | COMPLETE_FOR_MVP | `renderSupplierPaymentReceiptPdf` | Receipt PDF and archive. | No remittance email/send flow. | Add email/send workflow. |
| Purchase orders | NOT_STARTED | N/A | None. | No PO lifecycle or bill matching. | Build PO MVP. |
| Debit notes | NOT_STARTED | N/A | None. | No supplier credit/debit note flow. | Build supplier debit note MVP. |
| Cash expenses | NOT_STARTED | N/A | None. | No quick expense workflow. | Add cash expense entry and receipt attachment. |

## Inventory

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Items | PARTIAL | `items`, `Item.inventoryTracking` | Product/service records. | No stock state. | Add warehouses and stock ledger. |
| Warehouses | NOT_STARTED | N/A | None. | No warehouse model. | Add warehouse schema/API/UI. |
| Stock movements | NOT_STARTED | N/A | None. | No receipts/issues/transfers. | Add stock movement engine. |
| COGS | NOT_STARTED | N/A | None. | No cost flow into journals. | Add valuation method and COGS posting. |
| Inventory adjustments | NOT_STARTED | N/A | None. | No adjustment workflow. | Add adjustment MVP. |

## ZATCA

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Profile | COMPLETE_FOR_MVP | `zatca.service.ts`, settings page | Seller profile fields and readiness checks. | Official production validation missing. | Validate against official docs/SDK. |
| EGS units | COMPLETE_FOR_MVP | `ZatcaEgsUnit`, EGS APIs | Local device records, active selection, CSR state. | Private keys are dev-only DB fields. | Move real keys to KMS later. |
| CSR generation | PARTIAL | `zatca-core`, `generate-csr` | Local CSR/private key generation and CSR download. | Official CSR profile must be verified. | Compare with SDK and official onboarding docs. |
| Mock CSID | COMPLETE_FOR_MVP | mock adapter | Local mock compliance CSID flow. | Not legal issuance. | Replace with real sandbox only after verification. |
| Adapter config | COMPLETE_FOR_MVP | `zatca.config.ts` | Mock default and real-network disabled gates. | Real URLs/payloads unverified. | Keep disabled until official setup. |
| Sandbox adapter scaffolding | GROUNDWORK_ONLY | `http-zatca-sandbox.adapter.ts` | Method shapes and safe gates. | Real calls not implemented. | Implement only after official contract verification. |
| XML skeleton | GROUNDWORK_ONLY | `zatca-core/src/index.ts`, XML docs | Deterministic local XML skeleton and fixtures. | Not official UBL/ZATCA XML. | Use SDK/schema/Schematron validation. |
| QR TLV | PARTIAL | `generateZatcaQrBase64` | Local TLV base64 with byte lengths. | Phase 2 QR signature fields missing. | Implement official QR after signing. |
| Hash/ICV chain | PARTIAL | `ZatcaInvoiceMetadata`, EGS last hash | Local hash/ICV idempotent generation. | Official canonicalization/hash not implemented. | Compare to SDK hash output. |
| SDK wrapper | GROUNDWORK_ONLY | `zatca-sdk` | Readiness and dry-run command planning. | Execution disabled/not implemented. | Verify Java/runtime command path. |
| Official references map | COMPLETE_FOR_MVP | `docs/zatca/*` | Inventory, gap report, implementation map. | Manual page confirmation remains. | Use map to drive real work. |
| Real compliance CSID | NOT_STARTED | N/A | None. | Needs FATOORA access/OTP/API. | Obtain sandbox access and implement safely. |
| Invoice signing | NOT_STARTED | N/A | None. | Required for production. | Implement through SDK-verified path. |
| Clearance | NOT_STARTED | N/A | Safe blocked endpoints only. | No real standard invoice clearance. | Implement after signing/CSID. |
| Reporting | NOT_STARTED | N/A | Safe blocked endpoints only. | No real simplified invoice reporting. | Implement after signing/CSID. |
| PDF/A-3 | NOT_STARTED | N/A | None. | XML not embedded. | Add after official XML/signing. |

## Platform

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Frontend UI | PARTIAL | `apps/web/src/app`, `components` | MVP screens for implemented modules. | Limited browser/E2E coverage and polish. | Add Playwright flows and UX pass. |
| API coverage | PARTIAL | `apps/api/src` | Broad CRUD/workflow endpoints. | No OpenAPI docs or versioning. | Add API documentation generation. |
| Smoke tests | COMPLETE_FOR_MVP | `apps/api/scripts/smoke-accounting.ts` | Covers major AR/AP/ZATCA/PDF flows. | Requires live API/DB; not browser-driven. | Add browser smoke suite. |
| Production deployment | NOT_STARTED | `infra` only local | Local compose. | No cloud deployment, backups, monitoring. | Choose hosting and IaC. |
| Cloud storage | NOT_STARTED | Generated docs use DB | None. | PDF base64 in DB. | Add S3-compatible adapter. |
| Email sending | NOT_STARTED | N/A | None. | No invoice/statement send. | Select provider and add templates. |
| WhatsApp sending | NOT_STARTED | N/A | None. | No WhatsApp provider. | Select provider if needed. |
| Subscription billing | NOT_STARTED | N/A | None. | No SaaS billing. | Choose Stripe or other provider. |
| User permissions enforcement | GROUNDWORK_ONLY | `Role.permissions` | Stored role data. | Not enforced. | Add guards and UI rules. |
