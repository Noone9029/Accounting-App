# Implementation Status

Audit date: 2026-05-14

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
| Roles/permissions | COMPLETE_FOR_MVP | `Role`, `OrganizationMember.roleId`, `packages/shared/src/permissions.ts`, `PermissionGuard`, role/member APIs, web permission helpers | Default roles are seeded/protected, `/auth/me` exposes role permissions, API routes enforce `@RequirePermissions`, role/member management APIs exist, and UI navigation/actions are permission-aware. | Invite flow is a local placeholder only; no approval workflow or dual-control policy. | Add real invite delivery, password reset/onboarding, and approval rules for high-risk actions. |
| Audit logs | PARTIAL | `apps/api/src/audit-log`, `AuditLog` | Mutating services write selected audit logs. | Coverage may not be complete for all business events. | Audit every mutation and standardize event names. |
| Number sequences | COMPLETE_FOR_MVP | `apps/api/src/number-sequences`, `NumberSequence` | Invoice, payment, purchase order, bill, refund, credit note, journal numbering. | No user-configurable prefixes UI. | Add number-sequence settings and collision tests. |
| Document settings | COMPLETE_FOR_MVP | `document-settings`, settings page | Organization PDF titles/colors/visibility flags. | Template designer not present. | Add template preview and advanced layouts. |
| Generated document archive | PARTIAL | `generated-documents`, `GeneratedDocument` | Generated operational and report PDFs are archived and downloadable. | Stores base64 in DB; no object storage lifecycle. | Move to S3-compatible storage. |

## Accounting

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Chart of accounts | COMPLETE_FOR_MVP | `chart-of-accounts`, `Account` | CRUD, system account protections, posting flags. | Descendant cycle prevention and production COA review remain. | Add accountant-reviewed COA templates. |
| Bank account profiles and transfers | COMPLETE_FOR_MVP | `bank-accounts`, `bank-transfers`, `BankAccountProfile`, `BankTransfer`, web `/bank-accounts`, `/bank-transfers` | Cash/bank/wallet/card profile metadata linked to posting asset accounts, default Cash/Bank profiles, ledger balances, posted transaction visibility, archive/reactivate, payment/expense dropdown labels, posted bank transfers, transfer void reversal, and guarded one-time opening-balance posting. | No live feeds, transfer fees, or multi-currency FX transfer handling. | Add transfer fee/FX handling after bank workflow review. |
| Bank statement import and reconciliation | PARTIAL | `bank-statements`, `bank-reconciliations`, `BankStatementImport`, `BankStatementTransaction`, `BankReconciliation`, `BankReconciliationItem`, `BankReconciliationReviewEvent`, web statement/reconciliation routes | Pasted CSV/JSON preview and validation, partial import option, duplicate/closed-period warnings, statement transaction records, candidate lookup against posted bank journal lines, manual match, categorize-to-journal, ignore, reconciliation summary, draft reconciliation creation, submit/approve/reopen review workflow, approved-only close, item snapshots, closed-period statement/import locks, administrative void/unlock, and reconciliation report data/CSV/PDF archive. | No real file upload parser/storage, OFX/CAMT/MT940, auto-match, statement attachments, strict dual-control queue, email delivery, or live feeds. | Add bank file-format samples, approval inbox, and production-grade import storage. |
| Tax rates | COMPLETE_FOR_MVP | `tax-rates`, `TaxRate` | Sales/purchase/both scope, validation, seed VAT rates. | VAT return reporting not implemented. | Add VAT report model and validations. |
| Manual journals | COMPLETE_FOR_MVP | `accounting`, `JournalEntry`, `JournalLine`, `fiscal-periods` | Create/edit draft, post, reverse, balance validation, fiscal posting guard. | Reversal date is current date only. | Add user-selected reversal date if needed. |
| Journal posting | COMPLETE_FOR_MVP | `accounting-core`, business services, `reports` | Balanced entries from AR/AP workflows and accountant reports. | Production report definitions still need accountant review. | Add accountant review and export/PDF outputs. |
| Journal reversal | COMPLETE_FOR_MVP | `AccountingService.reverse`, workflow voids, `FiscalPeriodGuardService` | Reversal entries, idempotent workflow reuse, and fiscal guard on reversal date. | Manual and workflow reversal race behavior should be load-tested. | Add concurrency/load tests. |
| Fiscal periods | PARTIAL | `FiscalPeriod`, `apps/api/src/fiscal-periods`, `/fiscal-periods` | API/UI for create/update/close/reopen/lock and posting-date locks across journal-producing workflows. | No unlock/admin approval, fiscal year wizard, or retained earnings close. | Add year-end close and approval workflow. |
| Reports | COMPLETE_FOR_MVP | `reports`, `/reports/*` | General Ledger, Trial Balance, P&L, Balance Sheet, VAT Summary, AR/AP aging, CSV exports, simple PDF exports, and generated-document archive records for PDFs. | VAT summary is not official filing; no scheduled/email delivery; accountant review still needed. | Add accountant-reviewed definitions, scheduled delivery, and official VAT return work. |

## Sales

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Contacts/customers | COMPLETE_FOR_MVP | `contacts`, `Contact` | Customer/supplier/BOTH contacts and detail page. | No import/export or duplicate detection. | Add CSV import and merge workflow. |
| Items/products | PARTIAL | `items`, `Item`, `StockMovement` | Items with revenue/expense accounts, tax defaults, inventory-tracking flag, reorder points, and quantity-on-hand display for tracked items. | Purchase receiving and sales stock issue are manual operational workflows only; no automatic stock posting or stock accounting yet. | Add item detail stock history later. |
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
| Purchase orders | COMPLETE_FOR_MVP | `purchase-orders`, `PurchaseOrder`, `renderPurchaseOrderPdf`, web `/purchases/purchase-orders` | Draft/edit/delete, approve, mark sent, close, void, PDF/archive, conversion into draft purchase bills, and operational receiving status/action links. | No partial billing, approval workflow, supplier email sending, or automatic stock receipt. | Add partial billing and purchase matching after receiving QA. |
| Purchase bills | COMPLETE_FOR_MVP | `purchase-bills` | Draft/edit/finalize/void, AP posting, PDF, and source purchase order link. | No multi-PO or partial matching. | Add matching/receiving after PO MVP hardening. |
| Bill finalization | COMPLETE_FOR_MVP | `purchase-bill-accounting.ts`, `FiscalPeriodGuardService` | Dr expense/asset, Dr VAT receivable, Cr AP, fiscal posting guard, including converted PO bills. | Inventory receipt linkage is operational only and does not debit inventory asset. | Add landed-cost and inventory asset posting design later. |
| Supplier payments | COMPLETE_FOR_MVP | `supplier-payments` | Posted payments, allocations, void restore, receipts, bank account profile dropdown labels. | No bank reconciliation. | Add reconciliation matching. |
| Supplier ledger | COMPLETE_FOR_MVP | `supplierLedger`, contact page | AP balance and bill/payment/void rows. | UI should use supplier-specific balance wording. | Add AP-specific display helper. |
| Supplier statement | COMPLETE_FOR_MVP | `/contacts/:id/supplier-statement` | Date-filtered AP statement JSON. | No supplier statement PDF. | Add supplier statement PDF if needed. |
| Purchase order PDFs | COMPLETE_FOR_MVP | `renderPurchaseOrderPdf` | Operational purchase order PDF and archive. | No supplier email/send workflow. | Add email/send workflow later. |
| Purchase bill PDFs | COMPLETE_FOR_MVP | `renderPurchaseBillPdf` | Operational PDF and archive. | No vendor attachment capture. | Add attachments later. |
| Supplier payment PDFs | COMPLETE_FOR_MVP | `renderSupplierPaymentReceiptPdf` | Receipt PDF and archive. | No remittance email/send flow. | Add email/send workflow. |
| Debit notes | COMPLETE_FOR_MVP | `purchase-debit-notes`, `PurchaseDebitNote` | Draft/finalize/void, bill allocation/reversal, PDFs, and AP reduction posting. | No automatic matching or inventory return linkage. | Add matching suggestions later. |
| Cash expenses | COMPLETE_FOR_MVP | `cash-expenses`, `CashExpense` | Posted cash expenses, void reversal, PDF/archive, optional supplier/contact link, bank account profile dropdown labels. | No receipt attachments/OCR or import. | Add receipt attachments later. |

## Inventory

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Items | PARTIAL | `items`, `Item.inventoryTracking`, `Item.reorderPoint`, web `/items` | Product/service records, inventory tracking flag, reorder point/quantity fields, and total quantity-on-hand display for tracked items. | No automatic stock movements from documents. | Add item detail stock history later. |
| Warehouses | COMPLETE_FOR_MVP | `Warehouse`, `apps/api/src/warehouses`, web `/inventory/warehouses` | Tenant-scoped warehouse CRUD, `MAIN` default warehouse, archive/reactivate, active warehouse validation, warehouse detail balances/movements, and warehouse transfer/adjustment history. | No bin/location hierarchy or warehouse accounting. | Add bin design after transfer QA. |
| Stock movements | GROUNDWORK_ONLY | `StockMovement`, `apps/api/src/stock-movements`, web `/inventory/stock-movements` | Direct opening balance creation, generated adjustment/transfer/receipt/issue movement rows, positive-quantity ledger, duplicate opening balance rejection, negative stock prevention, and preview-only accounting design inputs. | No landed cost, automatic COGS, inventory asset posting, serial/batch tracking, or automatic invoice/bill stock posting. | Add explicit accountant-approved posting workflow after clearing/COGS design review. |
| COGS | GROUNDWORK_ONLY | `apps/api/src/sales-stock-issues`, `InventorySettings`, web sales stock issue detail, `docs/inventory/*` | Sales stock issue detail/API can preview Dr COGS / Cr Inventory Asset using operational moving-average estimates when mappings exist. | Preview-only; no journal is posted, no financial statements change, FIFO is not implemented. | Add accountant-reviewed, explicit COGS posting task after clearing and valuation policy approval. |
| Inventory adjustments | COMPLETE_FOR_MVP | `InventoryAdjustment`, `apps/api/src/inventory-adjustments`, web `/inventory/adjustments` | Draft/create/edit/delete, approve, void, reason/cost fields, approval and void movement links, negative-stock guard, permissions, tests, and no-journal behavior. | No reason-code catalog, attachments, dual-control queue, or GL impact. | Add approval inbox and valuation policy later. |
| Warehouse transfers | COMPLETE_FOR_MVP | `WarehouseTransfer`, `apps/api/src/warehouse-transfers`, web `/inventory/transfers` | Immediate posted transfer, paired out/in stock movements, insufficient-stock guard, void reversal movements, permissions, tests, and no-journal behavior. | No in-transit status, shipping documents, bin/location support, or GL impact. | Add in-transit/bin support after operational QA. |
| Purchase receiving | GROUNDWORK_ONLY | `PurchaseReceipt`, `PurchaseReceiptLine`, `apps/api/src/purchase-receipts`, web `/inventory/purchase-receipts` | PO, purchase bill, and standalone receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements; source remaining quantity/status helpers; void reversal with negative-stock guard; preview-only accounting panel/API; permissions, tests, and no-journal behavior. | No inventory asset journal, clearing workflow, landed cost, supplier delivery documents, serial/batch tracking, or automatic bill/PO receipt. | Finalize inventory clearing and bill/receipt matching before posting. |
| Sales stock issue | GROUNDWORK_ONLY | `SalesStockIssue`, `SalesStockIssueLine`, `apps/api/src/sales-stock-issues`, web `/inventory/sales-stock-issues` | Finalized-invoice stock issue creates `SALES_ISSUE_PLACEHOLDER` movements; invoice remaining quantity/status helper; availability guard; void reversal; preview-only COGS panel/API; permissions, tests, and no-journal behavior. | No COGS journal, delivery document, serial/batch tracking, or automatic invoice stock issue. | Add explicit COGS posting only after accountant review. |
| Inventory settings | GROUNDWORK_ONLY | `InventorySettings`, `apps/api/src/inventory`, web `/inventory/settings` | Per-organization valuation method, negative-stock flag, value-tracking flag, inventory accounting enable flag, account mappings, validation, and preview-only warnings. | FIFO is placeholder only; enable flag does not post accounting; missing inventory clearing workflow blocks production posting. | Use settings as readiness control for future explicit posting tasks. |
| Inventory reports | GROUNDWORK_ONLY | `apps/api/src/inventory`, web `/inventory/reports/*` | Stock valuation estimate, movement summary, low-stock report, CSV export, tests, and smoke coverage. | Reports are operational estimates only and need accountant review before financial use. | Add accountant-reviewed inventory financial reports after valuation posting design. |

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
| User permissions enforcement | COMPLETE_FOR_MVP | `Role.permissions`, `PermissionGuard`, `organization-members`, `roles`, `apps/web/src/lib/permissions.ts` | Tenant-scoped API guards, role editor, member list, role/status changes, invite placeholder, and frontend route/nav/action gating now use shared permission strings. | Email invites, password reset/onboarding, role-change audit UI, and approvals are not modeled. | Add email-backed invite onboarding and approval workflows. |
