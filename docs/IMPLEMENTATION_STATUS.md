# Implementation Status

Audit date: 2026-05-15

Product Audit v2:

- `docs/PRODUCT_AUDIT_V2.md` summarizes current maturity, blockers, and go/no-go status.
- `docs/PRODUCT_READINESS_SCORECARD.md` scores readiness by module.
- `docs/NEXT_30_PROMPTS_ROADMAP.md` lists the next 30 recommended implementation prompts.

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
| Monorepo | COMPLETE_FOR_MVP | `package.json`, `pnpm-workspace.yaml`, `apps/*`, `packages/*`, `.github/workflows/deployed-e2e.yml` | Shared workspace scripts, packages, API/web separation, and manual deployed browser E2E workflow. | No full CI pipeline for typecheck/test/build/API smoke yet. | Add CI pipeline for typecheck/test/build and safe API smoke. |
| Docker/local infra | PARTIAL | `infra/docker-compose.yml`, `infra/README.md` | Local Postgres, Redis, API, web services. | Production infra not defined; Docker Desktop may be unavailable locally. | Add production deployment plan and compose health notes. |
| Auth | COMPLETE_FOR_MVP | `apps/api/src/auth`, `apps/web/src/app/(auth)` | Register, login, JWT, `GET /auth/me`, invite preview/accept, password reset request/confirm using hashed tokens and active email provider routing, DB-backed token request rate limits, and expired-token cleanup. | Mock email remains default; no MFA, refresh-token rotation, or advanced session management. | Add MFA, abuse monitoring, and stronger session policy after provider/domain review. |
| Tenant/org model | COMPLETE_FOR_MVP | `organizations`, `OrganizationMember`, `OrganizationContextGuard` | `x-organization-id` scoping and membership checks. | Cross-org test coverage should continue expanding as modules grow. | Add central tenant-scoping checklist for new modules. |
| Roles/permissions | COMPLETE_FOR_MVP | `Role`, `OrganizationMember.roleId`, `packages/shared/src/permissions.ts`, `PermissionGuard`, role/member APIs, web permission helpers | Default roles are seeded/protected, `/auth/me` exposes role permissions, API routes enforce `@RequirePermissions`, role/member management APIs exist, UI navigation/actions are permission-aware, and invites create email/token onboarding records through the active provider. | SMTP is opt-in; no approval workflow or dual-control policy. | Add approval rules for high-risk actions. |
| Dashboard overview | COMPLETE_FOR_MVP | `apps/api/src/dashboard`, `apps/web/src/app/(app)/dashboard`, `dashboard.view` | `GET /dashboard/summary` provides tenant-scoped read-only sales, purchase, banking, inventory, report-health, compliance/admin, attention-item metrics, last-six-month trends, aging buckets, cash trend points, and low-stock items; `/dashboard` renders KPI cards, lightweight charts, permission-aware drill-downs, review panels, and permission-gated quick actions. | No customizable layout, advanced charting, saved widgets, or accountant-reviewed KPI definitions yet. | Add reviewed KPI definitions and user-customizable widgets after accountant/product review. |
| Email outbox and provider routing | GROUNDWORK_ONLY | `EmailOutbox`, `AuthToken`, `AuthTokenRateLimitEvent`, `apps/api/src/email`, `/settings/email-outbox` | Mock remains default; invite/password reset/test-send records are stored in outbox; readiness reports provider/SMTP config without secrets; SMTP adapter can be enabled by env and records `SENT_PROVIDER`; invite/reset delivery is DB-rate-limited. | No background queue/retry worker, provider webhooks, bounce handling, DKIM/SPF/domain validation, or paid/provider-specific API adapter. | Validate SMTP with a non-production relay, then add queue/retry and deliverability controls before real customer use. |
| Audit logs | COMPLETE_FOR_MVP | `apps/api/src/audit-log`, `AuditLog`, `AuditLogRetentionSettings`, `/settings/audit-logs`, `docs/AUDIT_LOG_COVERAGE_REVIEW.md` | High-risk mutating actions are standardized through shared audit event constants, metadata is recursively redacted before persistence/response, list/detail APIs support filters, admins can review logs in the Settings UI, permitted users can export filtered sanitized CSV, and admins can configure retention settings with dry-run preview. | Low-risk reads are intentionally not logged; CSV export is manual only; retention preview does not delete logs; no immutable external audit store, scheduled export, automatic purge job, alerting, anomaly detection, or tamper-evident chain. | Add scheduled export/archival, immutable audit storage, alerting, and a reviewed purge executor before production compliance claims. |
| Number sequences | COMPLETE_FOR_MVP | `apps/api/src/number-sequences`, `NumberSequence`, `/settings/number-sequences` | Invoice, payment, purchase order, bill, refund, credit note, journal, inventory document, and variance proposal numbering; admins/accountants can review configured prefixes, next numbers, padding, examples, and safely update future numbering with duplicate-prevention checks and audit logging. | No reset workflow, per-branch numbering, document-template numbering rules, historical renumbering, or preview of possible future collisions beyond lowering prevention. | Add reviewed reset/skip workflow, branch/device numbering options, and deeper collision analysis before production rollout. |
| Document settings | COMPLETE_FOR_MVP | `document-settings`, settings page | Organization PDF titles/colors/visibility flags. | Template designer not present. | Add template preview and advanced layouts. |
| Generated document archive | PARTIAL | `generated-documents`, `GeneratedDocument`, storage readiness | Generated operational and report PDFs are archived, downloadable, and included in storage readiness/migration dry-run counts. | Stores base64 in DB; no object storage lifecycle or migration executor. | Move to S3-compatible storage after migration executor and rollback plan. |
| Uploaded attachments | PARTIAL | `attachments`, `Attachment`, `AttachmentPanel`, `storage`, key detail pages, `/settings/storage` | JSON/base64 file upload remains the default; tenant-scoped linked-entity validation, metadata listing without base64 content, download, notes update, soft delete, permissions, smoke checks, reusable panels on sales/purchase/banking/inventory detail pages, storage readiness API, a feature-flagged S3-compatible upload/download adapter for new attachments, and dry-run migration counts. | Database/base64 storage remains the default; no DB-to-S3 migration executor, virus scanning, OCR, retention/lifecycle policy, drag/drop polish, email sending, or ZATCA attachment submission. | Test against a real non-production bucket, then add migration executor, scanning policy, and OCR/import workflows after storage review. |

## Accounting

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Chart of accounts | COMPLETE_FOR_MVP | `chart-of-accounts`, `Account` | CRUD, system account protections, posting flags. | Descendant cycle prevention and production COA review remain. | Add accountant-reviewed COA templates. |
| Bank account profiles and transfers | COMPLETE_FOR_MVP | `bank-accounts`, `bank-transfers`, `BankAccountProfile`, `BankTransfer`, web `/bank-accounts`, `/bank-transfers` | Cash/bank/wallet/card profile metadata linked to posting asset accounts, default Cash/Bank profiles, ledger balances, posted transaction visibility, archive/reactivate, payment/expense dropdown labels, posted bank transfers, transfer void reversal, and guarded one-time opening-balance posting. | No live feeds, transfer fees, or multi-currency FX transfer handling. | Add transfer fee/FX handling after bank workflow review. |
| Bank statement import and reconciliation | PARTIAL | `bank-statements`, `bank-reconciliations`, `BankStatementImport`, `BankStatementTransaction`, `BankReconciliation`, `BankReconciliationItem`, `BankReconciliationReviewEvent`, web statement/reconciliation routes | Pasted CSV/JSON preview and validation, partial import option, duplicate/closed-period warnings, statement transaction records, candidate lookup against posted bank journal lines, manual match, categorize-to-journal, ignore, reconciliation summary, draft reconciliation creation, submit/approve/reopen review workflow, approved-only close, item snapshots, closed-period statement/import locks, administrative void/unlock, reconciliation report data/CSV/PDF archive, and attachment panels on statement transaction/reconciliation detail pages. | No OFX/CAMT/MT940 parser, auto-match, production-grade statement-file import storage, strict dual-control queue, email delivery, or live feeds. | Add bank file-format samples, approval inbox, and production-grade import storage. |
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
| Bill finalization | COMPLETE_FOR_MVP | `purchase-bill-accounting.ts`, `FiscalPeriodGuardService` | Direct mode posts Dr expense/asset, Dr VAT receivable, Cr AP; explicit inventory-clearing mode posts tracked lines to Inventory Clearing with fiscal posting guard. | Receipt asset posting is separate/manual and only for compatible clearing-mode bills. | Add landed-cost and variance posting policy later. |
| Supplier payments | COMPLETE_FOR_MVP | `supplier-payments` | Posted payments, allocations, void restore, receipts, bank account profile dropdown labels. | No bank reconciliation. | Add reconciliation matching. |
| Supplier ledger | COMPLETE_FOR_MVP | `supplierLedger`, contact page | AP balance and bill/payment/void rows. | UI should use supplier-specific balance wording. | Add AP-specific display helper. |
| Supplier statement | COMPLETE_FOR_MVP | `/contacts/:id/supplier-statement` | Date-filtered AP statement JSON. | No supplier statement PDF. | Add supplier statement PDF if needed. |
| Purchase order PDFs | COMPLETE_FOR_MVP | `renderPurchaseOrderPdf` | Operational purchase order PDF and archive. | No supplier email/send workflow. | Add email/send workflow later. |
| Purchase bill PDFs | COMPLETE_FOR_MVP | `renderPurchaseBillPdf` | Operational PDF and archive. | Vendor attachment capture is basic database-backed groundwork only; no OCR/scanning or object storage. | Add OCR and production storage later. |
| Supplier payment PDFs | COMPLETE_FOR_MVP | `renderSupplierPaymentReceiptPdf` | Receipt PDF and archive. | No remittance email/send flow. | Add email/send workflow. |
| Debit notes | COMPLETE_FOR_MVP | `purchase-debit-notes`, `PurchaseDebitNote` | Draft/finalize/void, bill allocation/reversal, PDFs, and AP reduction posting. | No automatic matching or inventory return linkage. | Add matching suggestions later. |
| Cash expenses | COMPLETE_FOR_MVP | `cash-expenses`, `CashExpense` | Posted cash expenses, void reversal, PDF/archive, optional supplier/contact link, bank account profile dropdown labels, and supporting-file attachment panel. | No OCR, receipt scanning, or import workflow. | Add OCR/import after storage hardening. |

## Inventory

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Items | PARTIAL | `items`, `Item.inventoryTracking`, `Item.reorderPoint`, web `/items` | Product/service records, inventory tracking flag, reorder point/quantity fields, and total quantity-on-hand display for tracked items. | No automatic stock movements from documents. | Add item detail stock history later. |
| Warehouses | COMPLETE_FOR_MVP | `Warehouse`, `apps/api/src/warehouses`, web `/inventory/warehouses` | Tenant-scoped warehouse CRUD, `MAIN` default warehouse, archive/reactivate, active warehouse validation, warehouse detail balances/movements, and warehouse transfer/adjustment history. | No bin/location hierarchy or warehouse accounting. | Add bin design after transfer QA. |
| Stock movements | GROUNDWORK_ONLY | `StockMovement`, `apps/api/src/stock-movements`, web `/inventory/stock-movements` | Direct opening balance creation, generated adjustment/transfer/receipt/issue movement rows, positive-quantity ledger, duplicate opening balance rejection, negative stock prevention, and accounting design inputs. | No landed cost, automatic COGS, inventory asset posting, serial/batch tracking, or automatic invoice/bill stock posting. | Add purchase clearing and valuation-accounting workflows after manual COGS QA. |
| COGS | PARTIAL | `apps/api/src/sales-stock-issues`, `InventorySettings`, web sales stock issue detail, `docs/inventory/*` | Sales stock issue detail/API can preview Dr COGS / Cr Inventory Asset, manually post one reviewed COGS journal, reverse it once, block stock issue void while active, and let P&L reflect posted journals naturally. | Manual only; no invoice auto-posting, FIFO, landed cost, returns workflow, or automatic inventory clearing actions. | Harden accountant review workflow and add variance/return policy later. |
| Inventory clearing and bill/receipt matching | PARTIAL | `InventorySettings.inventoryClearingAccountId`, `InventoryPurchasePostingMode`, `PurchaseBill.inventoryPostingMode`, purchase bill preview/finalization, purchase receipt asset posting, clearing reconciliation/variance reports, variance proposals, integrity audit, web receipt/bill/PO/report/proposal panels, `docs/inventory/*` | Inventory clearing account mapping, purchase receipt posting mode, enhanced receipt accounting preview, purchase bill receipt matching status, purchase order receipt/bill matching visibility, purchase bill direct/clearing accounting preview, explicit clearing-mode bill finalization, explicit compatible receipt asset post/reverse journals, receipt void protection, purchase receipt posting readiness compatibility counts, read-only reconciliation/variance reporting with CSV export, accountant-reviewed variance proposal draft/submit/approve/post/reverse/void workflow, and a 2026-05-15 integrity audit finding no code-level double-counting defect in the current manual paths. | No automatic purchase receipt GL posting, no direct-mode receipt posting, no landed cost, no automatic variance posting, and no migration for historical direct-mode bills. | Review posted variance proposal behavior with accountants, then decide landed-cost and historical direct-mode migration/exclusion policy. |
| Inventory adjustments | COMPLETE_FOR_MVP | `InventoryAdjustment`, `apps/api/src/inventory-adjustments`, web `/inventory/adjustments` | Draft/create/edit/delete, approve, void, reason/cost fields, approval and void movement links, negative-stock guard, permissions, attachment panel, tests, and no-journal behavior. | No reason-code catalog, dual-control queue, or GL impact. | Add approval inbox and valuation policy later. |
| Warehouse transfers | COMPLETE_FOR_MVP | `WarehouseTransfer`, `apps/api/src/warehouse-transfers`, web `/inventory/transfers` | Immediate posted transfer, paired out/in stock movements, insufficient-stock guard, void reversal movements, permissions, tests, and no-journal behavior. | No in-transit status, shipping documents, bin/location support, or GL impact. | Add in-transit/bin support after operational QA. |
| Purchase receiving | PARTIAL | `PurchaseReceipt`, `PurchaseReceiptLine`, `apps/api/src/purchase-receipts`, web `/inventory/purchase-receipts` | PO, purchase bill, and standalone receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements; source remaining quantity/status helpers; void reversal with negative-stock guard; enhanced accounting panel/API with bill matching values; compatible clearing-mode receipts can manually post/reverse Dr Inventory Asset / Cr Inventory Clearing journals; active asset posting blocks receipt void; permissions, tests, smoke coverage, clearing report detail panels, and variance proposal linkage from clearing differences. | No automatic receipt posting, no direct-mode receipt posting, no landed cost, supplier delivery documents, serial/batch tracking, automatic variance posting, or automatic bill/PO receipt. | Add landed-cost design and historical migration/exclusion reporting. |
| Sales stock issue | PARTIAL | `SalesStockIssue`, `SalesStockIssueLine`, `apps/api/src/sales-stock-issues`, web `/inventory/sales-stock-issues` | Finalized-invoice stock issue creates `SALES_ISSUE_PLACEHOLDER` movements; invoice remaining quantity/status helper; availability guard; void reversal; COGS preview; manual COGS post/reverse actions; permissions, tests, and smoke coverage. | No delivery document, returns workflow, serial/batch tracking, automatic invoice stock issue, or automatic COGS posting. | Add delivery/returns design after inventory accounting scope is stable. |
| Inventory settings | GROUNDWORK_ONLY | `InventorySettings`, `apps/api/src/inventory`, web `/inventory/settings` | Per-organization valuation method, negative-stock flag, value-tracking flag, inventory accounting enable flag, account mappings including inventory clearing, purchase receipt posting mode, validation, purchase receipt posting readiness panel with bill-mode compatibility counts, and manual COGS/receipt asset no-auto-post warnings. | FIFO is placeholder only; enable flag permits manual COGS and compatible receipt asset posting but does not auto-post accounting. | Use readiness as an audit gate before automatic receipt posting, reconciliation, and migration tasks. |
| Inventory reports | PARTIAL | `apps/api/src/inventory`, web `/inventory/reports/*` | Stock valuation estimate, movement summary, low-stock report, inventory clearing reconciliation, inventory clearing variance, CSV export, draft proposal links from variance rows, tests, smoke coverage, and integrity audit evidence. | Valuation reports remain operational estimates; clearing variance reports are review-only and do not post corrections automatically. | Add landed-cost and FIFO design before broader inventory accounting. |

## ZATCA

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Profile | COMPLETE_FOR_MVP | `zatca.service.ts`, settings page | Seller profile fields and readiness checks. | Official production validation missing. | Validate against official docs/SDK. |
| EGS units | COMPLETE_FOR_MVP | `ZatcaEgsUnit`, EGS APIs | Local device records, active selection, CSR state. | Private keys are dev-only DB fields. | Move real keys to KMS later. |
| CSR generation | PARTIAL | `zatca-core`, `generate-csr` | Local CSR/private key generation and CSR download. | Official CSR profile must be verified. | Compare with SDK and official onboarding docs. |
| Mock CSID | COMPLETE_FOR_MVP | mock adapter | Local mock compliance CSID flow. | Not legal issuance. | Replace with real sandbox only after verification. |
| Adapter config | COMPLETE_FOR_MVP | `zatca.config.ts` | Mock default and real-network disabled gates. | Real URLs/payloads unverified. | Keep disabled until official setup. |
| Sandbox adapter scaffolding | GROUNDWORK_ONLY | `http-zatca-sandbox.adapter.ts` | Method shapes and safe gates. | Real calls not implemented. | Implement only after official contract verification. |
| XML skeleton | PARTIAL | `zatca-core/src/index.ts`, XML docs | Deterministic local XML fixtures now use official sample-backed UBL ordering, `ICV`/`PIH`/`QR` additional document references, standard/simplified transaction flags, seller identifiers, tax totals, monetary totals, line tax category structure, supply date, and official first-PIH fallback. The standard local fixture now passes SDK XSD/EN/KSA/PIH and global validation. API-generated standard invoice XML now validates locally through the SDK wrapper with address/identifier warnings. | Still not production compliant: signing/certificate, Phase 2 QR, CSID, clearance/reporting, and PDF/A-3 remain missing. | Use fresh-EGS SDK hash mode only for local verification, then proceed to signing/key-custody design. |
| QR TLV | PARTIAL | `generateZatcaQrBase64` | Local TLV base64 with byte lengths. | Phase 2 QR signature fields missing. | Implement official QR after signing. |
| Hash/ICV chain | PARTIAL | `ZatcaInvoiceMetadata`, `ZatcaEgsUnit.hashMode`, EGS last hash, `zatca-core/src/index.ts`, `zatca-sdk`, `zatca-hash-mode.ts` | Local hash/ICV idempotent generation remains default. `ZatcaHashMode` and per-EGS `hashMode` fields allow explicit `SDK_GENERATED` opt-in on a fresh EGS only; metadata stores `hashModeSnapshot`; SDK mode runs local SDK `-generateHash`, persists the SDK hash, chains PIH from the previous SDK hash, remains idempotent, and blocks partial mutation on SDK failures. | SDK hash persistence is local-only and disabled unless SDK execution/readiness and per-EGS enablement are explicit. Existing EGS chains with metadata are not migrated. Signing, CSID, clearance/reporting, and PDF/A-3 remain missing. | Validate fresh-EGS SDK mode with Java 11-14 repeatedly, then design signing/key custody and sandbox submission. |
| SDK wrapper | PARTIAL | `zatca-sdk`, `docs/zatca/OFFICIAL_SDK_FIXTURE_VALIDATION_RESULTS.md` | Readiness, dry-run command planning, disabled-by-default local XML validation endpoints for request XML, allowlisted fixtures, generated invoice XML, official fixture registry, Java `>=11 <15` readiness fields, official launcher preference, local official fixture validation evidence, SDK `-generateHash` parsing, generated-invoice hash comparison, no-mutation invoice hash-compare endpoint, dry-run hash-chain reset plan with SDK-mode blockers, fresh-EGS SDK hash-mode enablement, and generated XML validation/debug scripts. Official samples pass under Java 11. LedgerByte standard now passes SDK XSD/EN/KSA/PIH and global validation; simplified passes XSD/EN/PIH but fails expected signing/QR/certificate checks. Fresh generated standard invoices in SDK hash mode now pass SDK validation globally after invoice-specific PIH config handling. | Repeatable CI/Docker Java 11-14 path still pending; buyer building-number data, signing/QR/cert work remain. | Add proper buyer address fields, then proceed to signing/certificate work only after hash-chain evidence remains stable. |
| Official references map | COMPLETE_FOR_MVP | `docs/zatca/*` | Inventory, gap report, implementation map. | Manual page confirmation remains. | Use map to drive real work. |
| Real compliance CSID | NOT_STARTED | N/A | None. | Needs FATOORA access/OTP/API. | Obtain sandbox access and implement safely. |
| Invoice signing | NOT_STARTED | N/A | None. | Required for production. | Implement through SDK-verified path. |
| Clearance | NOT_STARTED | N/A | Safe blocked endpoints only. | No real standard invoice clearance. | Implement after signing/CSID. |
| Reporting | NOT_STARTED | N/A | Safe blocked endpoints only. | No real simplified invoice reporting. | Implement after signing/CSID. |
| PDF/A-3 | NOT_STARTED | N/A | None. | XML not embedded. | Add after official XML/signing. |

## Platform

| Module | Status | Files | What works | Gaps | Next step |
| --- | --- | --- | --- | --- | --- |
| Frontend UI | PARTIAL | `apps/web/src/app`, `components`, `tests/e2e` | MVP screens for implemented modules, a useful business dashboard, plus Playwright browser smoke coverage for auth, navigation, sales, purchases, banking, reports, inventory, attachments, permissions, email, ZATCA, and storage surfaces. | Browser suite is smoke-level only; deployed E2E CI is manual-only; no visual regression testing yet. | Expand Playwright coverage, add UX pass, and decide when deployed E2E should run on a schedule. |
| API coverage | PARTIAL | `apps/api/src` | Broad CRUD/workflow endpoints. | No OpenAPI docs or versioning. | Add API documentation generation. |
| Smoke tests | COMPLETE_FOR_MVP | `apps/api/scripts/smoke-accounting.ts`, `tests/e2e`, `playwright.config.ts`, `.github/workflows/deployed-e2e.yml` | API smoke covers deep accounting workflows; Playwright browser smoke covers critical user-facing routes/forms and readiness panels; deployed E2E has a manual GitHub Actions workflow. | Requires local API/web for local runs; browser suite does not assert every accounting branch; no automated DB reset before deployed E2E. | Add safe CI wiring for typecheck/test/build/API smoke and decide deployed E2E schedule after DB reset policy. |
| Production deployment | GROUNDWORK_ONLY | `infra`, `docs/DEPLOYMENT_VERCEL_SUPABASE.md`, `docs/deployment/*`, `.github/workflows/deployed-e2e.yml` | Local compose, Vercel/Supabase deployment checklist, API root/health/readiness docs, CI DB readiness checklist, Supabase security review, and deployed E2E runbook/workflow. | Production IaC, backups, monitoring, RLS/private-network decision, deployment approval gates, and operations runbooks are not complete. | Create production readiness plan covering backups, monitoring, secrets, storage, email, and security controls. |
| Cloud storage | PARTIAL | `apps/api/src/storage`, `apps/api/src/attachments`, `/settings/storage`, `docs/storage/*` | Provider env config, database default readiness, redacted S3 config checks, feature-flagged S3-compatible upload/download storage for new uploaded attachments, and dry-run migration counts for attachments/generated documents. | Database remains default; generated documents are still DB-backed; no migration executor, signed URL policy, object lifecycle/deletion policy, virus scanning, or real-bucket production validation. | Test S3 mode with a non-production bucket, then add generated-document storage alignment and a resumable migration executor. |
| Email sending | GROUNDWORK_ONLY | `apps/api/src/email`, `EmailOutbox`, `AuthTokenRateLimitEvent`, `/settings/email-outbox`, `docs/email/*` | Mock/local organization invite and password reset email records are stored and inspectable by default; readiness endpoint and UI show provider/SMTP readiness without secrets; `POST /email/test-send` exercises the active provider; DB-backed invite/reset rate limits and manual expired-token cleanup exist; SMTP can send only when explicitly configured. | No invoice/statement send, retries, bounces, webhooks, domain auth validation, or background queue. | Validate SMTP credentials/domain setup, then add queue/retry and provider event handling. |
| WhatsApp sending | NOT_STARTED | N/A | None. | No WhatsApp provider. | Select provider if needed. |
| Subscription billing | NOT_STARTED | N/A | None. | No SaaS billing. | Choose Stripe or other provider. |
| User permissions enforcement | COMPLETE_FOR_MVP | `Role.permissions`, `PermissionGuard`, `organization-members`, `roles`, `apps/web/src/lib/permissions.ts` | Tenant-scoped API guards, role editor, member list, role/status changes, active-provider invite onboarding, frontend route/nav/action gating, and audit-log view/export/retention permissions now use shared permission strings. | SMTP delivery is opt-in; approvals are not modeled; audit review/export exists but has no scheduled delivery or alerting. | Add approval workflows, scheduled audit exports, and alerting. |

## 2026-05-16 ZATCA buyer address field support

This section supersedes older notes that described `BR-KSA-63` as unresolved because buyer building number was not captured.

Official references inspected for this change:

- `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Credit/Standard_Credit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Debit/Standard_Debit_Note.xml`
- `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`
- `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`

Confirmed address rules and mapping:

- `BR-KSA-63` is a warning for standard invoice buyer Saudi addresses when `cac:AccountingCustomerParty/cac:Party/cac:PostalAddress/cac:Country/cbc:IdentificationCode` is `SA` and the standard invoice transaction flag is present.
- The official Schematron requires buyer `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:PostalZone`, `cbc:CityName`, `cbc:CitySubdivisionName`, and `cac:Country/cbc:IdentificationCode` in that Saudi standard-buyer case.
- The Schematron requires the Saudi buyer building number to be present for `BR-KSA-63`; seller building number rule `BR-KSA-37` separately validates seller building number as 4 digits.
- Buyer postal code `BR-KSA-67` expects a 5-digit Saudi postal code when buyer country is `SA`.
- Official standard invoice, standard credit note, and standard debit note samples include buyer postal address fields in this order: `cbc:StreetName`, `cbc:BuildingNumber`, `cbc:CitySubdivisionName`, `cbc:CityName`, `cbc:PostalZone`, `cac:Country/cbc:IdentificationCode`.
- Official simplified invoice samples inspected omit buyer postal address, so buyer address is not treated as mandatory for simplified invoices by this change.
- `Contact.addressLine1` maps to buyer `cbc:StreetName`.
- `Contact.addressLine2` maps to buyer `cbc:AdditionalStreetName` when present; it is no longer used as district.
- `Contact.buildingNumber` maps to buyer `cbc:BuildingNumber`.
- `Contact.district` maps to buyer `cbc:CitySubdivisionName`.
- `Contact.city` maps to buyer `cbc:CityName`.
- `Contact.postalCode` maps to buyer `cbc:PostalZone`.
- `Contact.countryCode` maps to buyer `cac:Country/cbc:IdentificationCode`.
- Buyer province/state `BT-54` is present in the data dictionary but optional for the inspected rules and samples, so no `countrySubentity` contact field was added in this pass.

Implemented scope:

- Added nullable `Contact.buildingNumber` and `Contact.district` fields through Prisma migration `20260516170000_add_contact_zatca_buyer_address_fields`.
- Updated contact create/update DTO validation and API persistence so existing contacts remain valid.
- Added contact UI fields in the address section with ZATCA buyer-address helper text.
- Updated generated ZATCA XML to emit real buyer building number and district data without fake defaults.
- Added local readiness warnings for missing Saudi standard buyer address fields, including missing building number, while preserving XML generation behavior.
- Updated smoke and fresh-EGS demo data with explicit Saudi buyer address values: street, unit/additional street, 4-digit building number, district, city, 5-digit postal code, and country `SA`.

Validation result after this change:

- `corepack pnpm db:generate`: PASS after stopping the stale local API process that locked Prisma's query engine DLL.
- `corepack pnpm db:migrate`: PASS, nullable contact address migration applied locally.
- `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/contacts/contact.service.spec.ts src/zatca/zatca-rules.spec.ts src/zatca-core.spec.ts`: PASS, 3 suites and 45 tests.
- `corepack pnpm --filter @ledgerbyte/zatca-core test`: PASS, 24 tests.
- `node --check scripts/validate-zatca-sdk-hash-mode.cjs`, `node --check scripts/debug-zatca-pih-chain.cjs`, `node --check scripts/validate-generated-zatca-invoice.cjs`: PASS.
- `corepack pnpm typecheck`: PASS.
- `corepack pnpm build`: PASS.
- `corepack pnpm smoke:accounting`: PASS.
- `corepack pnpm zatca:debug-pih-chain`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, PIH chain stable, hash compare MATCH/noMutation for both invoices.
- `corepack pnpm zatca:validate-sdk-hash-mode`: PASS with Java 11.0.26, local SDK execution enabled, no network, invoice 1 global PASS, invoice 2 global PASS, hash compare MATCH/noMutation for both invoices.
- `BR-KSA-63` is cleared for the fresh-EGS generated standard-invoice path when the buyer contact has real `buildingNumber` and `district` data.
- No new buyer-address SDK warnings were introduced in the fresh-EGS validation run.

Validation environment note:

- The repository path contains a space. The official Windows `fatoora.bat` launcher is sensitive to that path shape, so validation used a temporary no-space copy of the official SDK `Apps` folder under `E:\Work\Temp\ledgerbyte-zatca-sdk-nospace` plus a temporary SDK `config.json` pointing back to the official `reference/` `Data`, `Rules`, certificate, and PIH files. This was local-only and did not alter production configuration.

Remaining limitations:

- No invoice signing is implemented.
- No CSID request flow was run.
- No clearance or reporting network call was enabled or submitted.
- No production credentials were used.
- No PDF/A-3 embedding is implemented.
- This is not a production compliance claim; it is customer/contact address support and generated XML cleanup only.

## 2026-05-16 ZATCA seller/buyer readiness checks

- Added local-only ZATCA readiness checks for seller profile invoice XML data, buyer contact invoice XML data, invoice generation state, EGS/hash-chain state, and generated XML availability.
- Official sources inspected: `reference/zatca-docs/EInvoice_Data_Dictionary.xlsx`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Standard/Invoice/Standard_Invoice.xml`, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Samples/Simplified/Invoice/Simplified_Invoice.xml`, standard credit/debit note samples, `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Rules/Schematrons/20210819_ZATCA_E-invoice_Validation_Rules.xsl`, `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`.
- Rules confirmed: seller invoice XML address checks use `BR-KSA-09`, seller building number format uses `BR-KSA-37`, seller postal code format uses `BR-KSA-66`, seller VAT checks use `BR-KSA-39` and `BR-KSA-40`, standard Saudi buyer postal-address readiness uses `BR-KSA-63`, Saudi buyer postal code format uses `BR-KSA-67`, buyer name standard-invoice warning uses `BR-KSA-42`, and buyer VAT format when present uses `BR-KSA-44`.
- Standard vs simplified behavior: standard-like tax invoices with Saudi buyers require buyer street, building number, district, city, postal code, and country code for clean XML readiness. Simplified invoices do not block on missing buyer postal address when official samples/rules do not require it.
- API changes: `GET /zatca/readiness` now returns detailed readiness sections while preserving legacy local readiness fields. `GET /sales-invoices/:id/zatca/readiness` returns read-only invoice readiness with `localOnly: true`, `noMutation: true`, and `productionCompliance: false`.
- UI changes: the ZATCA settings page shows section readiness cards, the contact detail page shows buyer address readiness for customer contacts, and the sales invoice detail page shows seller/buyer/invoice/EGS/XML readiness near ZATCA actions.
- Safety boundary: readiness checks do not sign XML, request CSIDs, call ZATCA, submit clearance/reporting, generate PDF/A-3, or claim production compliance.
- Recommended next step: improve admin workflows for correcting readiness issues in-place, then rerun local fresh-EGS SDK validation only when XML output changes.

## 2026-05-16 ZATCA signing readiness groundwork

- Added local-only signing readiness and Phase 2 QR readiness planning. This does not sign XML, request CSIDs, use production credentials, submit to ZATCA, clear/report invoices, generate PDF/A-3, or claim production compliance.
- Official sources inspected: SDK `Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates, `EInvoice_Data_Dictionary.xlsx`, XML implementation PDF, security features PDF, official signed standard/simplified invoice samples, standard credit/debit note samples, Schematron rules, and UBL/XAdES/XMLDSig XSD files under `reference/`.
- Design doc added: `docs/zatca/SIGNING_AND_PHASE_2_QR_PLAN.md`.
- Readiness changes: settings and invoice readiness now expose `signing`, `phase2Qr`, and `pdfA3` sections. These are production blockers, while local unsigned XML generation remains available and explicitly local-only.
- API change: `GET /sales-invoices/:id/zatca/signing-plan` returns a dry-run SDK `fatoora -sign -invoice <filename> -signedInvoice <filename>` command plan with `localOnly: true`, `dryRun: true`, `noMutation: true`, and `productionCompliance: false`.
- Safety behavior: the signing plan never returns private key content, never executes signing by default, never mutates ICV/PIH/hash/EGS metadata, and includes blockers for missing certificate lifecycle, private key custody, compliance CSID, production CSID, Phase 2 QR cryptographic tags, and PDF/A-3.
- Phase 2 QR status: current QR remains basic local groundwork. QR tags that depend on XML hash, ECDSA signature, public key, and simplified-invoice certificate signature remain blocked until signing/certificate work is implemented safely.
- Recommended next step: implement an explicitly disabled local dummy-material SDK signing experiment in a temp directory only after approving its safety envelope, or proceed directly to key-custody/KMS design.

## ZATCA key custody and CSR onboarding planning (2026-05-16)

- Added local-only CSR/key-custody planning based on the repo-local official SDK readme, `Configuration/usage.txt`, `Configuration/config.json`, CSR config templates/examples under `Data/Input`, compliance CSID/onboarding/renewal PDFs, XML/security implementation PDFs, data dictionary, signed samples, Schematron rules, and UBL/XAdES/XMLDSig XSDs.
- Added `GET /zatca/egs-units/:id/csr-plan` as a dry-run, no-mutation, no-network endpoint. It returns official CSR config keys, available values, missing values, planned temp file names, blockers, warnings, and redacted certificate/key state. It never returns private key PEM, CSID secrets, binary security tokens, OTPs, or production credentials.
- Extended ZATCA readiness with `KEY_CUSTODY` and `CSR` sections: raw database PEM is flagged as non-production custody risk, missing compliance/production CSIDs remain blockers, certificate expiry is unknown, renewal/rotation workflows are missing, and KMS/HSM-style production custody is recommended.
- Updated ZATCA settings UI to show key custody, CSR readiness, compliance CSID, production CSID, renewal status, and certificate expiry visibility. No real Request CSID, signing, clearance/reporting, PDF/A-3, or production-compliance action was enabled.
- Schema changes: none. Existing raw private-key storage is only detected and flagged; this phase intentionally avoids adding production secret storage fields.
- Remaining limitations: no invoice signing, no CSID requests, no production credentials, no real ZATCA network calls, no clearance/reporting, no PDF/A-3, and no production compliance claim.

## 2026-05-16 - ZATCA CSR dry-run workflow

- Official CSR references inspected: reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/usage.txt; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Configuration/config.json; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-template.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN.properties; reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Data/Input/csr-config-example-EN-VAT-group.properties; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf; reference/zatca-docs/20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf; reference/zatca-docs/compliance_csid.pdf; reference/zatca-docs/EInvoice_Data_Dictionary.xlsx; reference/zatca-docs/onboarding.pdf; reference/zatca-docs/renewal.pdf.
- Added local/non-production CSR dry-run scaffolding via `POST /zatca/egs-units/:id/csr-dry-run` and `corepack pnpm zatca:csr-dry-run`.
- Dry-run behavior is sanitized and no-mutation: no CSID request, no ZATCA network call, no invoice signing, no clearance/reporting, no PDF/A-3, no production credentials, and `productionCompliance: false`.
- Temp planning uses OS temp files only when explicitly requested; missing official CSR fields block config preparation instead of using fake values.
- `ZATCA_SDK_CSR_EXECUTION_ENABLED` defaults to `false`; SDK CSR execution remains skipped in this safe phase and only the command plan is returned.
- Redaction guarantee: private key PEM, certificate bodies, CSID/token content, OTPs, and generated CSR bodies are not returned or logged by the dry-run response/script.

## 2026-05-16 Update: ZATCA CSR onboarding field capture

- Official sources inspected: `reference/zatca-einvoicing-sdk-Java-238-R3.4.8/Readme/readme.md`, `Configuration/usage.txt`, `Configuration/config.json`, `Data/Input/csr-config-template.properties`, `Data/Input/csr-config-example-EN.properties`, `Data/Input/csr-config-example-EN-VAT-group.properties`, `reference/zatca-docs/compliance_csid.pdf`, `onboarding.pdf`, `renewal.pdf`, `20220624_ZATCA_Electronic_Invoice_Security_Features_Implementation_Standards.pdf`, `20220624_ZATCA_Electronic_Invoice_XML_Implementation_Standard_vF.pdf`, and `EInvoice_Data_Dictionary.xlsx`.
- Official CSR config keys modeled from SDK templates/examples: `csr.common.name`, `csr.serial.number`, `csr.organization.identifier`, `csr.organization.unit.name`, `csr.organization.name`, `csr.country.name`, `csr.invoice.type`, `csr.location.address`, and `csr.industry.business.category`.
- Field ownership: VAT/organization identifier, legal name, country code, and business category remain seller/ZATCA profile data; CSR common name, structured serial number, organization unit name, invoice type capability flags, and location address are captured as non-secret EGS onboarding metadata because the official examples are EGS/unit-specific and LedgerByte must not infer them.
- Schema change: nullable non-secret fields were added on `ZatcaEgsUnit`: `csrCommonName`, `csrSerialNumber`, `csrOrganizationUnitName`, `csrInvoiceType`, and `csrLocationAddress`. No private key, certificate, token, OTP, or CSID secret fields were added.
- API change: `PATCH /zatca/egs-units/:id/csr-fields` captures only those non-secret fields, requires `zatca.manage`, rejects production EGS units, trims values, blocks newlines/control characters/equals signs, and currently accepts only the official SDK example invoice type value `1100` until broader official values are modeled.
- CSR plan/dry-run behavior: `GET /zatca/egs-units/:id/csr-plan`, `POST /zatca/egs-units/:id/csr-dry-run`, and `corepack pnpm zatca:csr-dry-run` now use captured fields. Missing required CSR fields still block temp config preparation; captured fields become `AVAILABLE`; review-only fallbacks remain visible where values are not explicitly captured.
- UI change: ZATCA settings now includes a compact non-production EGS CSR field editor with local-only helper text: no CSID request, no ZATCA call, and no secrets.
- Safety guarantees: field capture does not generate CSR files, execute the SDK, request CSIDs, call ZATCA, sign invoices, mutate ICV/PIH/hash-chain fields, enable clearance/reporting, implement PDF/A-3, or claim production compliance. Responses and audit payloads remain redacted from private key/cert/token/OTP/CSR body content.
- Remaining limitations: signing, compliance CSID request, production CSID request, production credentials, clearance/reporting, PDF/A-3, real ZATCA network calls, SDK CSR execution, and production compliance remain intentionally out of scope.
- Recommended next step: add a controlled non-production CSR file-preparation review screen that previews sanitized SDK config output and keeps SDK execution disabled until an explicit onboarding phase approves it.

## 2026-05-16 - ZATCA CSR config preview

- Official sources inspected for this slice: SDK Readme/readme.md, Configuration/usage.txt, Configuration/config.json, Data/Input/csr-config-template.properties, Data/Input/csr-config-example-EN.properties, Data/Input/csr-config-example-EN-VAT-group.properties, compliance_csid.pdf, onboarding.pdf, renewal.pdf, the ZATCA XML and security implementation PDFs, and EInvoice_Data_Dictionary.xlsx under reference/.
- The SDK CSR template/examples use plain single-line key=value entries in this order: csr.common.name, csr.serial.number, csr.organization.identifier, csr.organization.unit.name, csr.organization.name, csr.country.name, csr.invoice.type, csr.location.address, csr.industry.business.category.
- Added a local-only sanitized CSR config preview for non-production EGS units at GET /zatca/egs-units/:id/csr-config-preview. It returns localOnly, dryRun, noMutation, noCsidRequest, noNetwork, productionCompliance false, canPrepareConfig, stable configEntries, missing/review fields, blockers, warnings, and sanitizedConfigPreview.
- The preview includes only captured/profile non-secret CSR values. It does not include private keys, certificate bodies, CSID tokens/secrets, portal one-time codes, generated CSR bodies, production credentials, invoice signatures, clearance/reporting payloads, or PDF/A-3 output.
- The preview does not write files, execute the SDK, request CSIDs, call ZATCA, mutate EGS ICV, mutate EGS lastInvoiceHash, or create submission logs. Production EGS units are rejected for this preview.
- The existing CSR dry-run now reuses the sanitized config formatter before writing temporary CSR config files, while SDK CSR execution remains intentionally skipped and disabled by default.
- ZATCA settings now shows a per-non-production-EGS CSR config preview card with readiness, missing/review fields, sanitized key=value text, and no CSID/no network/no secrets/no SDK execution disclaimers.
- Remaining limitations are unchanged: no SDK CSR execution, no compliance CSID request, no production CSID request, no invoice signing, no production credentials, no clearance/reporting, no PDF/A-3, no real ZATCA network calls, and no production compliance claim.
- Recommended next step: add an operator review/approval record for sanitized CSR config previews before any future controlled local SDK CSR generation phase.
