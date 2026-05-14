# LedgerByte Bug Audit

Audit date: 2026-05-14

Commit inspected: pending (`Add inventory clearing preview groundwork`)

## Scope

Reviewed the current LedgerByte monorepo without adding product features:

- `apps/api`
- `apps/web`
- `packages/accounting-core`
- `packages/shared`
- `packages/pdf-core`
- `packages/zatca-core`
- `packages/ui`
- `infra`
- `README.md`

## Commands Run

- `git status --short --branch`
- `git rev-parse --short HEAD`
- `git log -1 --oneline`
- `git ls-files`
- `corepack pnpm --filter @ledgerbyte/api test`
- `corepack pnpm db:migrate`
- `corepack pnpm db:seed`
- `corepack pnpm db:generate`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- API smoke test against `http://localhost:4000`
- Frontend route checks against `http://localhost:3000`
- API health check against `http://localhost:4000/health`

## Bugs Found And Fixed

### Inventory clearing preview and matching groundwork added

Added inventory clearing account settings, purchase receipt posting mode, enhanced purchase receipt accounting previews, purchase bill receipt matching status, purchase order receipt/bill matching visibility, UI panels, docs, tests, and smoke coverage. This is design and review groundwork only; purchase receipt previews still create no journals and always return `canPost: false`.

Risk reduced:

- Accountants can map a separate Inventory Clearing account before purchase receipt asset posting exists.
- Clearing account validation requires a tenant-owned active posting `LIABILITY` or `ASSET` account, blocks reuse of inventory asset, and rejects Accounts Payable code `210`.
- Purchase receipt previews show receipt value, matched bill value, value difference, matching summary, and Dr Inventory Asset / Cr Inventory Clearing preview lines.
- Purchase bill and purchase order detail pages expose receipt matching status and warnings without accounting mutation.
- Seed/foundation data now includes code `240` Inventory Clearing for new organizations.

Remaining risks:

- Purchase receipt GL posting is still disabled.
- Bill/receipt clearing entries are not implemented.
- Landed cost is missing.
- FIFO remains placeholder-only.
- Accountant review is required before production use.

Tests/smoke added:

- Backend clearing account validation, enhanced receipt preview, bill/receipt matching status, tenant, and permission tests.
- Frontend helper tests for posting mode, warnings, missing clearing mapping, and matching status labels.
- Smoke coverage for configuring Inventory Clearing, linked bill receipt preview, bill receipt matching status, and unchanged journal counts from receipt preview.

### Manual COGS posting added

Added explicit manual COGS posting and reversal for sales stock issues using the existing preview layer. Posting is permission-gated, tenant-scoped, fiscal-period guarded, transactional, and linked back to `SalesStockIssue`. The implementation creates one reviewed Dr COGS / Cr Inventory Asset journal only when the user explicitly posts COGS; invoices and stock issues still do not auto-post COGS.

Risk reduced:

- `inventory.cogs.post` and `inventory.cogs.reverse` separate COGS posting from ordinary inventory/sales operations.
- Posting requires enabled inventory accounting, mapped inventory asset and COGS accounts, `MOVING_AVERAGE`, a posted/unvoided issue, no prior COGS journal, no preview blocking reasons, and positive estimated COGS.
- Reversal creates a linked reversal journal without voiding the sales stock issue.
- Stock issue voiding is blocked while COGS is active and allowed again after COGS reversal.
- P&L reflects COGS through posted journals, not stock movements.

Remaining risks:

- No purchase receipt inventory asset posting.
- Inventory clearing mapping and previews exist, but no clearing journals or bill clearing entries.
- No landed cost.
- FIFO placeholder only.
- No automatic COGS posting from invoices or stock issues.
- Accountant review is required before production use.

Tests/smoke added:

- Backend COGS posting, reversal, double-post/double-reverse, fiscal-period guard, void protection, tenant, permission metadata, no stock movement mutation, and P&L report tests.
- Frontend helper tests for COGS status, post/reverse button visibility, and financial-report warning display.
- Smoke coverage for enabling inventory accounting, manual COGS posting, P&L COGS activity, active-COGS void block, COGS reversal, and stock issue void after reversal.

### Inventory accounting preview groundwork added

Added preview-only inventory accounting settings, account mapping validation, purchase receipt accounting preview, sales stock issue COGS preview, UI preview panels, design documents, tests, and smoke coverage. The implementation keeps inventory accounting non-posting: preview endpoints do not create journal entries and do not affect GL, COGS, inventory asset balances, VAT, or financial statements.

Risk reduced:

- Accountants can review mapped inventory asset, COGS, adjustment gain, and adjustment loss accounts before real posting exists.
- Purchase receipt previews show design-only Dr Inventory Asset / Cr Inventory Clearing or AP placeholder lines and explicitly warn that bill/receipt matching and inventory clearing are not finalized.
- Sales stock issue previews show estimated moving-average COGS with Dr COGS / Cr Inventory Asset lines.
- `enableInventoryAccounting` remains false by default and cannot be enabled without required mappings and `MOVING_AVERAGE`.
- FIFO remains placeholder-only.

Remaining risks:

- No automatic COGS posting; manual COGS posting now requires explicit review/action.
- No inventory asset posting.
- Inventory clearing mapping and previews exist, but no clearing journals or bill clearing entries.
- No landed cost.
- No serial/batch tracking.
- Accountant review is required before any financial inventory posting.

Tests/smoke added:

- Backend settings validation, permission, tenant, preview, moving-average estimate, and no-journal tests.
- Frontend helper tests for warnings, preview line display, non-postable previews, and missing mappings.
- Smoke coverage for accounting settings, purchase receipt preview, sales issue COGS preview, and unchanged journal counts.

### Purchase receiving and sales stock issue groundwork added

Added operational purchase receipts from purchase orders, purchase bills, or standalone suppliers, plus sales stock issues from finalized sales invoices. Receipts create `PURCHASE_RECEIPT_PLACEHOLDER` stock movements, sales issues create `SALES_ISSUE_PLACEHOLDER` stock movements, and voids create controlled reversal movements. Source status endpoints now expose NOT_STARTED/PARTIAL/COMPLETE progress without storing fragile received/issued totals on source lines.

Risk reduced:

- Purchase orders and purchase bills can now be received into active warehouses with line-level remaining quantity guards.
- Finalized sales invoices can now issue tracked stock with invoice remaining quantity and stock availability checks.
- Receipt and issue voids are one-time operations and are blocked when a receipt void would make stock negative.
- Inventory balances, movement summaries, and valuation estimates naturally include receipt/issue movement rows.
- The workflow remains operational-only and creates no journal entries.

Remaining risks:

- No automatic COGS posting.
- No inventory asset GL posting.
- No landed cost.
- No serial/batch tracking.
- No delivery note or supplier delivery document workflow.
- No automatic financial inventory accounting.

Tests/smoke added:

- Backend purchase receipt, sales stock issue, source status, tenant, no-journal, and permission tests.
- Frontend helper and route/action permission tests for receipt/issue statuses and source labels.
- Smoke coverage for PO receiving, sales invoice stock issue, void restoration, source statuses, and no receipt/issue journal entries.

### Inventory valuation/reporting groundwork added

Added per-organization inventory settings, moving-average operational stock valuation, movement summary reporting, low-stock reporting from item reorder points, CSV export for inventory reports, frontend inventory report/settings pages, reorder fields on items, tests, and smoke coverage. The implementation keeps inventory operations reporting-only: it does not post inventory journals, COGS, inventory asset accounting, or financial statement values.

Risk reduced:

- Teams can review operational estimated stock value by item and warehouse without changing GL.
- Missing inbound cost data is visible as a valuation warning instead of silently producing accounting-like totals.
- Movement summary exposes opening, inbound, outbound, closing, count, and movement-type breakdown from the stock ledger.
- Low-stock reporting now has simple reorder-point groundwork.
- Inventory settings make the valuation method explicit while keeping FIFO marked as placeholder.

Remaining risks:

- No automatic COGS posting.
- No inventory asset accounting.
- Purchase receiving and sales issue are operational-only and do not post accounting.
- Valuation needs accountant review before financial use.
- FIFO is placeholder-only.
- No inventory financial statements.
- No serial/batch tracking.

Tests/smoke added:

- Backend inventory settings, valuation, movement summary, low-stock, tenant, and permission tests.
- Frontend helper tests for valuation warnings, settings labels, movement summaries, and low-stock statuses.
- Smoke coverage for inventory settings, valuation report, movement summary, low-stock shape, and no-journal inventory operations.

### Reconciliation approval and import preview added

Added pasted CSV/JSON statement import preview, validation summaries, duplicate warnings, partial import support, closed-period import protection, and a bank reconciliation submit/approve/reopen/close workflow with review events. Reconciliation close now requires approval, while closed periods continue to lock statement transaction changes and overlapping imports.

Risk reduced:

- Statement imports can be previewed before records are written, with valid/invalid rows, detected columns, totals, and warnings.
- Real imports now reuse the preview parser/validator and reject invalid rows unless partial import is explicitly requested.
- Imports into closed reconciliation periods are blocked, while preview warns without writing data.
- Reconciliations now preserve submit, approve, reopen, close, and void history through review events.
- Approved-only close provides a reviewer checkpoint before immutable period locking.

Remaining risks:

- No file upload storage.
- No OFX/CAMT/MT940 parser.
- No bank feeds or external banking APIs.
- No strict dual-control approval queue beyond the same-submitter guard.
- No automatic/ML matching.

Tests/smoke added:

- Backend CSV parser, preview/import validation, approval workflow, review event, permission, tenant, and closed-period protection tests.
- Frontend helper tests for import preview summaries, reconciliation status/actions, review timeline labels, and locked warnings.
- Smoke coverage for CSV preview, import, submit, approve, close, review events/items, closed-period mutation/import rejection, preview warning, report export, and void/unlock.

### Report exports and reconciliation report PDFs added

Added CSV and PDF delivery for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, Aged Payables, plus bank reconciliation report data/CSV/PDF endpoints. Report PDFs are archived through generated documents, and frontend report pages and reconciliation detail pages now expose download actions.

Risk reduced:

- Core accounting reports can now be exported from the API and UI instead of only viewed as JSON/page data.
- CSV helpers escape commas, quotes, and newlines and use accountant-readable columns.
- Report PDFs share the existing PDF rendering package and generated-document archive.
- Bank reconciliation report output includes status, period, balances, close/void actors, item snapshots, and summary totals.

Remaining risks:

- Accountant review is still needed before relying on report layouts or definitions in production.
- No scheduled reports or email delivery exists yet.
- VAT Summary is not an official VAT filing export.
- No report approval workflow exists yet.
- Voiding reconciliation is administrative only and does not reverse categorized journals.

Tests/smoke added:

- Backend CSV helper, report controller, PDF renderer, report archive, reconciliation report data, and permission tests.
- Frontend export URL, filename, PDF path, and document type label tests.
- Smoke coverage for trial balance CSV/PDF, reconciliation report data/CSV/PDF, and generated report document archive entries.

### Bank reconciliation close/lock workflow added

Added `BankReconciliation` and `BankReconciliationItem` records, tenant-scoped reconciliation list/create/detail/close/void/items APIs, reconciliation close pages, closed item snapshots, summary metadata for latest close/open draft/closed-through date, statement transaction lock warnings, permissions, tests, and smoke coverage.

Risk reduced:

- Bank accounts can now be formally reconciled for a date range instead of relying only on ad hoc summary totals.
- Closing requires zero difference and no unmatched statement transactions in the period.
- Closed reconciliations snapshot matched/categorized/ignored statement rows for review history.
- Closed periods block statement transaction match, categorize, ignore, and import void/status-changing actions.
- Voiding a reconciliation preserves audit history and unlocks the period without mutating journal entries.

Remaining risks:

- Reviewer approval now exists; strict dual-control queues remain future work.
- No file upload parser, OFX, CAMT, MT940, live feeds, external banking API, or payment gateway integration.
- No automatic/ML matching.
- Voiding reconciliation is administrative only and does not reverse categorized journals.
- Accountant review is still needed before production use.

Tests/smoke added:

- Backend reconciliation service and controller permission tests.
- Backend statement lock tests for match, categorize, ignore, and import void.
- Frontend helper tests for reconciliation status, close-block messages, closed-through date, and locked row warnings.
- Smoke coverage for draft creation, close, item snapshot, locked-row rejection, void/unlock, and summary fields.

### Bank statement import and reconciliation groundwork added

Added `BankStatementImport` and `BankStatementTransaction` records, local JSON/CSV row import APIs, statement row list/detail APIs, match-candidate lookup against posted bank journal lines, manual matching, categorization posting, ignore workflow, reconciliation summary, frontend import/transaction/review/summary pages, permissions, tests, and smoke coverage.

Risk reduced:

- Imported bank statement rows are tenant-scoped and stored separately from ledger postings.
- Statement imports do not create accounting entries until a user explicitly categorizes an unmatched row.
- Manual matching validates same organization, same linked bank account, posted journal status, amount, and direction.
- Categorization creates a balanced posted journal and respects fiscal-period posting locks.
- Reconciliation summaries expose unmatched, matched, categorized, ignored, debit, credit, ledger balance, statement closing balance, and difference fields.

Remaining risks:

- No file upload storage or robust bank file parser beyond local JSON/CSV paste rows.
- No OFX, CAMT, MT940, live feeds, external banking API, or payment gateway integration.
- No automatic/ML matching.
- Formal close/lock, report export, and reviewer workflow now exist; file upload storage remains future work.
- Accountant review is still needed before production use.

Tests/smoke added:

- Backend bank statement service and controller permission tests.
- Frontend helper tests for row parsing, status labels, candidate labels, and reconciliation status.
- Smoke coverage for importing a matching statement row, manual matching, categorizing an unmatched debit, and fetching reconciliation summary.

### Bank transfers and opening balance safeguards added

Added `BankTransfer` posting workflow, transfer list/create/detail UI, immediate balanced transfer journals, idempotent transfer void reversal, one-time bank opening-balance posting, fiscal-period guards, transaction source labels, permissions, tests, and smoke coverage.

Risk reduced:

- Users can now move funds between active bank/cash profiles without using ad hoc manual journals.
- Transfer voiding is guarded so repeated void requests do not create duplicate reversal journals.
- Opening balance metadata can be posted once into the ledger and is locked afterward to avoid duplicate opening-balance journals.
- Bank account transactions now identify transfer, transfer reversal, and opening-balance sources when matched.

Remaining risks:

- Bank statement import preview, manual matching, reconciliation approval/close, and report export now exist; bank feeds and file upload storage remain future work.
- No live feeds or external banking API.
- No transfer fees.
- No multi-currency FX transfers.

Tests/smoke added:

- Backend bank transfer service/controller permission tests.
- Backend bank account opening-balance posting and transaction source tests.
- Frontend helper tests for transfer validation/status and opening-balance/source labels.
- Smoke coverage for create/void transfer, bank/cash transaction visibility, opening-balance posting, and duplicate-post rejection.

### Bank account profiles added

Added bank/cash account profile groundwork with `BankAccountProfile`, profile lifecycle APIs, default Cash/Bank profile seeding, posted-ledger balance summaries, transaction visibility, frontend list/detail/create/edit pages, role permissions, and bank-aware payment/refund/expense dropdown labels.

Risk reduced:

- Users can now distinguish operational cash/bank/wallet/card accounts from generic chart-of-account asset rows.
- Posted cash/bank activity is visible from one module across customer payments, supplier payments, refunds, cash expenses, and manual journals.
- Payment and expense forms remain compatible with raw `accountId` posting while showing clearer bank profile labels when available.

Remaining risks:

- Bank statement import preview, manual matching, reconciliation approval/close, and report export now exist; bank feeds and file upload storage remain future work.
- No live feeds or external banking API.
- No transfer fees or multi-currency FX handling.

Tests/smoke added:

- Backend bank account service and controller permission tests.
- Frontend helper tests for status, labels, running balance, and dropdown display.
- Smoke coverage for default bank profiles, balance movement after payment/expense flows, and transaction endpoint rows.

### Purchase orders MVP added

Added non-posting purchase orders with tenant-scoped API permissions, default role grants, draft/approve/sent/closed/voided/billed lifecycle rules, PDF/archive support, frontend list/detail/create/edit pages, and conversion into draft purchase bills.

Risk reduced:

- Suppliers can now be ordered from before AP bill entry without prematurely posting accounting journals.
- Converted purchase bills retain a source PO link and only post AP when finalized through the existing bill workflow.
- Purchase order permissions now gate view/create/update/approve/void/convert actions across API and UI.

Remaining risks:

- No approval workflow or dual-control policy.
- No partial receiving or partial billing.
- No inventory stock receipt or stock movement.
- No email sending to suppliers.

Tests/smoke added:

- Backend purchase order lifecycle/conversion tests.
- Frontend purchase order helper and PDF path tests.
- Smoke coverage for create, approve, send, PDF download, convert to draft bill, and finalize converted bill.

### Account deletion missed dependent records

`DELETE /accounts/:id` only checked journal lines, child accounts, and system accounts. Accounts referenced by sales invoice lines, items, or customer payments could reach a database foreign-key failure instead of a clear business error.

Fix: `ChartOfAccountsService.remove` now checks:

- journal lines
- child accounts
- sales invoice lines
- item revenue/expense account references
- customer payment paid-through account references
- system account flag

### Payment void could reopen a voided invoice

Voiding a payment restored invoice `balanceDue` by incrementing every allocated invoice, even if the invoice had already been voided. That could leave a `VOIDED` invoice with a positive `balanceDue`.

Fix: payment void now restores balance only for allocated invoices still in `FINALIZED` status for the same organization.

### Statement date validation accepted impossible dates

`GET /contacts/:id/statement` accepted strings like `2026-02-31` because JavaScript normalized them into a later valid date.

Fix: statement date parsing now validates the parsed UTC year/month/day against the input parts.

### Negative tax rates could be created or updated

Tax rate DTOs accepted decimal strings and the service did not reject negative values. Invoices would later fail when using those rates, but invalid tax setup could still be stored.

Fix: `TaxRateService` now rejects negative rates on create and update.

### Supplier contact detail page showed a ledger error

`/contacts/[id]` loaded only the customer ledger endpoint. Supplier-only contacts linked from `/contacts` therefore showed `Customer contact not found` instead of a usable contact profile.

Fix: the contact detail page now loads the base contact first. Customer/BOTH contacts load ledger and statement sections; supplier-only contacts show the profile with an informational ledger message.

## Tests Added Or Updated

- Added chart-of-accounts deletion dependency tests.
- Added tax-rate negative validation tests.
- Added statement impossible-date validation test.
- Updated customer payment void tests to assert finalized-invoice restoration filtering.
- Existing API/web test suites now pass with the new checks.

## API Smoke Coverage

The local API smoke test verified:

- seed login
- organization lookup
- balanced journal creation
- unbalanced journal rejection
- journal posting
- edit-after-post rejection
- reversal creation
- duplicate reversal rejection
- customer and supplier contact creation
- item creation
- draft invoice edit/delete
- invoice finalization
- finalized invoice edit/delete rejection
- finalize idempotency
- payment allocation to draft invoice rejection
- allocation above balance rejection
- partial payment balance update
- full payment balance update
- unapplied payment amount behavior
- payment receipt-data allocations
- payment void balance restoration
- payment void idempotency
- payment void after invoice void keeps voided invoice balance at `0.0000`
- customer ledger fetch
- customer statement fetch
- supplier ledger rejection
- impossible statement date rejection

Smoke summary from the successful run:

```json
{
  "invoiceTotal": "115",
  "balanceAfterPartial": "65",
  "balanceAfterFull": "0",
  "balanceAfterVoidPayment": "65",
  "voidedInvoiceBalanceAfterPaymentVoid": "0",
  "ledgerRows": 11,
  "ledgerClosingBalance": "65.0000",
  "statementRows": 11,
  "receiptAllocations": 1
}
```

## Frontend Route Checks

HTTP route checks returned `200` for:

- `/`
- `/login`
- `/register`
- `/dashboard`
- `/organization/setup`
- `/accounts`
- `/tax-rates`
- `/branches`
- `/contacts`
- `/journal-entries`
- `/journal-entries/new`
- `/items`
- `/sales/invoices`
- `/sales/invoices/new`
- `/sales/customer-payments`
- `/sales/customer-payments/new`
- `/get-started`
- `/reports`

The in-app browser automation backend could not run because the configured Node runtime is `v22.19.0`, while the Node REPL browser backend requires `>=22.22.0`. Route-level checks and server logs were used as the fallback.

## Command Failures During Audit

- `rg --files` failed with Windows app binary access denied for the bundled `rg.exe`; fallback used `git ls-files` and PowerShell file enumeration.
- Initial focused `typecheck`/API test run failed after the first patch because a test mock was updated in the wrong helper and date parsing needed an explicit tuple type. Both were corrected before final verification.
- Browser automation setup failed with: Node runtime `v22.19.0` found, Node REPL requires `>=22.22.0`.

Final verification passed:

- `corepack pnpm db:migrate`
- `corepack pnpm db:seed`
- `corepack pnpm db:generate`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`

## Concurrency Hardening Pass

Audit date: 2026-05-07

Commit inspected: `ec40a0a` (`Stabilize current accounting workflows`)

### Race Risks Found And Fixed

- Invoice finalization could create more than one journal if two requests finalized the same draft invoice at the same time.
- Invoice voiding could race with payment allocation or create inconsistent reversal state.
- Finalized invoices with active customer payments could be voided, creating unclear AR/payment state.
- Customer payment creation validated invoice balances before the transaction and then decremented balances unconditionally, allowing concurrent over-allocation.
- Customer payment voiding could restore invoice balances twice if two void requests ran together.
- Manual journal duplicate reversal could surface a raw Prisma unique-constraint failure.

### Strategy Used

- Invoice finalization now re-reads the invoice inside the transaction and claims the draft row with `updateMany` before creating the journal entry.
- Invoice voiding now claims the invoice row before checking active payment allocations, then creates/reuses the reversal inside the same transaction.
- Finalized invoices with active non-voided payment allocations are rejected with: `Cannot void invoice with active payments. Void payments first.`
- Customer payment creation validates customer/account/invoice references inside the transaction and uses conditional `balanceDue >= amountApplied` invoice updates.
- Customer payment voiding claims the posted payment row before creating a reversal or restoring invoice balances.
- Duplicate journal reversal attempts are converted into clear business errors.
- Number sequence behavior remains based on Prisma atomic `upsert` increment and now has direct tests, including transaction-client usage.

### Commands Run

- `corepack pnpm db:generate` failed with Windows `EPERM` while renaming Prisma `query_engine-windows.dll.node`; a running local API/dev process was holding the generated Prisma client DLL open.
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- Docker service check for Postgres and Redis health.
- API health check against `http://localhost:4000/health`.
- Web route check against `http://localhost:3000/login`.
- API smoke test for login, invoice finalization idempotency, payment allocation, invoice void rejection with active payment, over-allocation rejection, payment void idempotency, balance restoration, and contact ledger fetch.

### Tests Added Or Updated

- Invoice finalize idempotency and lost-claim behavior.
- Invoice finalization failure before journal link.
- Invoice void with active payments rejected.
- Draft invoice void without reversal.
- Payment allocation stale-claim rejection with no journal/payment created.
- Payment number sequence not consumed after allocation claim failure.
- Payment void lost-claim idempotency.
- Journal duplicate reversal unique-constraint handling.
- Number sequence formatting and transaction-client usage.

## Repeatable Accounting Smoke Workflow

Audit date: 2026-05-07

Commit inspected: `c3b5b81` (`Harden accounting transaction safety`)

### Smoke Script Added

Added `apps/api/scripts/smoke-accounting.ts` and package scripts:

- `corepack pnpm --filter @ledgerbyte/api smoke:accounting`
- `corepack pnpm smoke:accounting`

The script runs against `LEDGERBYTE_API_URL` or `http://localhost:4000` by default.

### Smoke Coverage

- Seed user login.
- `/auth/me` organization discovery.
- Tenant headers on every business request.
- Smoke customer creation.
- Smoke service item creation using account code `411` and VAT on Sales 15% when available.
- Draft sales invoice creation and edit.
- Invoice finalization and repeated finalization idempotency.
- Over-allocation payment rejection.
- Partial payment and remaining payment allocation.
- Invoice `balanceDue` reduction to zero.
- Customer ledger invoice debit and payment credit checks.
- Customer statement date-range and closing balance checks.
- Customer payment receipt-data allocation and journal checks.
- Payment void and repeated payment void idempotency.
- Invoice void rejection while another active payment exists.

### Remaining Gaps

- The smoke script is live-API coverage, not a multi-process concurrency load test.
- It intentionally leaves smoke records in the database for auditability.
- It does not cover frontend browser interaction, ZATCA, PDFs, credit notes, purchases, or bank reconciliation.

## PDF Groundwork Pass

Audit date: 2026-05-07

Commit inspected: `870b3b5` (`Add accounting smoke workflow`)

### PDF Groundwork Added

- Added shared PDF data contracts and PDFKit-based renderers in `packages/pdf-core`.
- Added sales invoice PDF data and PDF endpoints.
- Added customer payment receipt PDF data and PDF endpoints.
- Added customer statement PDF data and PDF endpoints.
- Updated frontend invoice, payment, and contact statement pages with authenticated PDF download actions.
- Extended the live accounting smoke workflow to verify PDF data endpoints and PDF responses.

### Smoke Coverage Added

The smoke script now verifies:

- `GET /sales-invoices/:id/pdf-data`
- `GET /sales-invoices/:id/pdf`
- `GET /customer-payments/:id/receipt-pdf-data`
- `GET /customer-payments/:id/receipt.pdf`
- `GET /contacts/:id/statement-pdf-data`
- `GET /contacts/:id/statement.pdf`

PDF smoke checks validate status, `application/pdf` content type, non-empty body, and `%PDF` file header.

### Remaining PDF Risks

- These PDFs are not legal/ZATCA-compliant tax documents yet.
- No XML embedding, QR code, PDF/A-3, cryptographic stamp, or hash-chain data is included.
- No template designer, custom fonts, logo handling, or stored PDF archive exists yet.

## Document Settings And Archive Groundwork

Audit date: 2026-05-07

Commit inspected: `09bb7c9` (`Add invoice and receipt PDF groundwork`)

### Document Groundwork Added

- Added organization document settings for invoice, receipt, and statement titles, footer text, colors, visibility flags, and saved template choices.
- Added generated document archive records for sales invoice PDFs, customer payment receipt PDFs, and customer statement PDFs.
- PDF downloads now apply organization document settings and archive generated PDF snapshots with content hash, size, filename, source reference, and base64 content.
- Added generated document list/detail/download APIs and frontend archive/settings pages.
- Extended the accounting smoke workflow to verify document settings, PDF archive creation, and archived PDF download.

### Remaining Document Risks

- Base64 database PDF storage is temporary and should move to S3-compatible storage before production scale.
- GET PDF endpoints archive each download, so repeated downloads create repeated archive records until a retention/supersede policy is added.
- Saved `compact` and `detailed` template options currently fall back to the standard renderer.
- Legal/ZATCA compliance is still out of scope: no XML embedding, QR code, PDF/A-3, cryptographic stamp, or clearance/reporting flow.

## ZATCA Foundation Groundwork

Audit date: 2026-05-07

Commit inspected: `2d5bc3e` (`Add document settings and archive groundwork`)

### ZATCA Groundwork Added

- Added organization ZATCA profiles for seller identity, VAT number, Saudi address fields, environment, and registration status.
- Added development EGS units with active-unit selection, local CSR/private-key/CSID placeholders, last ICV, and previous invoice hash state.
- Added sales invoice ZATCA metadata for invoice UUID, local compliance status, ICV, previous hash, invoice hash, XML base64, QR base64, and error fields.
- Added ZATCA submission logs for local compliance-generation events.
- Added `packages/zatca-core` helpers for deterministic UBL-like XML skeletons, basic TLV QR payloads, SHA-256 invoice hashes, and combined payload building.
- Added API endpoints for ZATCA profile, EGS units, invoice compliance metadata, XML downloads, QR payloads, and submission logs.
- Added frontend ZATCA settings and invoice compliance sections.
- Extended smoke coverage to generate local XML/QR/hash data for a finalized invoice and verify XML/QR endpoints.

### Remaining ZATCA Risks

- This is local-only foundation work and is not production ZATCA compliance.
- No real ZATCA APIs, OTP onboarding, CSR generation, CSID issuance, clearance, reporting, cryptographic signing, XML canonicalization, or official validation is implemented.
- Private keys are stored only as development placeholders in the database; production must use secrets manager/KMS-backed storage.
- PDF/A-3 and XML embedding are not implemented.
- Official ZATCA documentation and sandbox behavior must be re-verified before building the real onboarding/submission phase.

## ZATCA Onboarding Groundwork

Audit date: 2026-05-07

Commit inspected: `cc0df31` (`Add ZATCA foundation groundwork`)

### CSR And Mock CSID Groundwork Added

- Added CSR/private-key generation helpers in `packages/zatca-core` using Node-compatible local crypto utilities.
- Added CSR validation for required seller, VAT, organization, device serial, city, and Saudi country fields.
- Added EGS CSR generation, CSR preview, and CSR download endpoints.
- Added a ZATCA onboarding adapter interface with a local mock adapter for compliance CSID requests.
- Added mock OTP flow accepting local 6-digit values such as `000000`.
- Added mock compliance CSID state handling, certificate request id storage, active mock EGS handling, and submission logs.
- Changed onboarding submission logs so they can be EGS/onboarding scoped without requiring an invoice metadata row.
- Hardened EGS API responses so `privateKeyPem` is not exposed through normal frontend APIs after generation.
- Added frontend onboarding controls for CSR generation/download, mock CSID request, OTP entry, EGS status, and recent ZATCA logs.

### Remaining Onboarding Risks

- Private key database storage remains development-only. Production must use KMS/secrets manager and must never log private keys.
- The mock CSID flow does not validate real OTPs, does not issue real CSIDs, and does not call ZATCA.
- Production CSID request intentionally returns not implemented.
- Real ZATCA sandbox credentials, official API contracts, CSR profile requirements, certificate chain handling, and compliance checks must be verified against current ZATCA documentation before production work.

## ZATCA Sandbox Adapter Scaffolding

Audit date: 2026-05-08

Commit inspected: `9ea5047` (`Add safe ZATCA sandbox adapter scaffolding`)

### Sandbox Adapter Scaffolding Added

- Added config-gated ZATCA adapter modes: `mock`, `sandbox-disabled`, and scaffolded `sandbox`.
- Added `ZATCA_ENABLE_REAL_NETWORK=false` default behavior so real ZATCA calls remain intentionally disabled unless explicit sandbox env flags are set.
- Added sandbox-disabled and HTTP sandbox adapter scaffolds with flexible request/response types for future compliance CSID, production CSID, compliance-check, clearance, and reporting methods.
- Added failed submission logging for disabled or incomplete adapter calls, including base64 request/response/error payloads and clear disabled response codes.
- Added local/mock invoice compliance-check logging without marking invoices cleared or reported.

### Remaining Adapter Risks

- This is still not production ZATCA compliance.
- Real calls are intentionally disabled by default and official ZATCA endpoint URLs, request bodies, response mappings, credentials, and auth headers must be verified before any sandbox network enablement.
- Compliance risk remains until official ZATCA documentation and valid sandbox credentials are used for real compliance CSID and compliance-check testing.

## ZATCA Foundation Stabilization

Audit date: 2026-05-11

Commit inspected: pending (`Stabilize ZATCA groundwork`)

### Stabilization Added

- Made repeated local ZATCA invoice generation idempotent: once XML/QR/hash metadata exists for an invoice, repeat generation returns that metadata without consuming another ICV or changing the active EGS hash chain.
- Added backend coverage that compliance CSID request logs do not store OTP, CSR PEM, or private-key material.
- Added core coverage for XML escaping, deterministic hashing, and UTF-8 byte-length handling for Arabic/Unicode QR TLV seller names.
- Extended smoke coverage for safe adapter defaults, EGS private-key redaction, CSR-only response behavior, repeated ZATCA generation idempotency, and safe blocked clearance/reporting logs.
- Rechecked that normal EGS responses redact `privateKeyPem` and that CSR endpoints return CSR PEM only.

### Remaining Stabilization Risks

- The ZATCA XML remains a local skeleton and must be verified against current official ZATCA/FATOORA XML, canonicalization, signing, and validation rules.
- Real network adapter endpoint paths and payloads remain intentionally unverified and disabled by default.
- Private-key database storage is still development-only and must move to KMS/secrets-manager-backed storage before real certificate handling.
- Mock CSID and mock invoice compliance checks are fake local workflow states and must not be treated as legal clearance or reporting.

## ZATCA Official-Docs Mapping And Checklist

Audit date: 2026-05-12

Commit inspected: pending (`Add ZATCA compliance checklist mapping`)

### Checklist Mapping Added

- Added `docs/zatca` engineering checklists for Phase 2 mapping, API integration, XML, QR, CSR/CSID onboarding, PDF/A-3 archive, security/key management, and testing/validation.
- Added typed `ZATCA_PHASE_2_CHECKLIST` data in `packages/zatca-core` so future implementation can be tracked against explicit requirement areas instead of guessed code paths.
- Added authenticated `GET /zatca/compliance-checklist` and `GET /zatca/readiness` endpoints.
- Added settings-page checklist and readiness display with status/risk badges and local blocking reasons.
- Kept `productionReady=false` and real network calls disabled by default.

### Remaining Critical ZATCA Risks

- Official ZATCA XML rules are not fully implemented or validated.
- Real compliance CSID onboarding is not integrated.
- Invoice signing and cryptographic stamp generation are not implemented.
- PDF/A-3 conversion and XML embedding are not implemented.
- Clearance and reporting submissions are not implemented.
- Real private keys are not stored in KMS/secrets-manager-backed custody.

## ZATCA XML Mapping Scaffold

Audit date: 2026-05-12

Commit inspected: pending (`Add ZATCA XML mapping scaffold`)

### XML Mapping Scaffold Added

- Added local XML field mapping docs and fixture guidance under `docs/zatca`.
- Added local dev fixtures under `packages/zatca-core/fixtures` for standard and simplified VAT invoice skeletons, including Arabic/Unicode text and XML escaping cases.
- Refactored the local XML builder into deterministic section builders for header, supplier, customer, tax totals, monetary totals, invoice lines, and ZATCA extension/signature TODO placeholders.
- Added typed `ZATCA_XML_FIELD_MAPPING` constants and local-only `validateLocalZatcaXml` checks in `packages/zatca-core`.
- Added authenticated `GET /zatca/xml-field-mapping` and `GET /sales-invoices/:id/zatca/xml-validation` endpoints.
- Added invoice UI display for local XML validation and settings UI visibility for XML mapping counts.

### Remaining XML Mapping Risks

- Official UBL/ZATCA field mapping still requires official documentation verification.
- Local XML validation is not official ZATCA SDK validation and must not be treated as legal certification.
- Signing, canonicalization, cryptographic stamp, official invoice hash source, PDF/A-3 XML embedding, clearance, and reporting are still not implemented.

## ZATCA Official Reference Mapping

Audit date: 2026-05-12

Commit inspected: pending (`Map official ZATCA references`)

### Reference Mapping Added

- Inventoried the local `reference/` folder, including official ZATCA PDFs, the data dictionary XLSX, Java SDK files, sample XML files, UBL XSD schemas, Schematron XSL rules, PDF/A-3 samples, and non-ZATCA local PDFs.
- Added `docs/zatca/OFFICIAL_IMPLEMENTATION_MAP.md` to map official source files to CSR, CSID, XML, QR, hash, signing, API, PDF/A-3, and validation work.
- Added `docs/zatca/SDK_USAGE_PLAN.md` with a safe plan for using the Java SDK as an isolated validation/hash/signing oracle later.
- Added `docs/zatca/ZATCA_CODE_GAP_REPORT.md` comparing current local scaffolding to the inspected references.
- Added official source-reference metadata to `ZATCA_PHASE_2_CHECKLIST` items.

### Remaining Reference-Backed ZATCA Risks

- Current XML still does not match the SDK sample structure for `ICV`, `PIH`, `QR`, populated UBL extensions, signature blocks, invoice type flags, and several tax/monetary structures.
- Current invoice hash is not official C14N11 canonicalization and has not been compared to the SDK `-generateHash` output.
- The SDK requires Java 11 through below 15; the local machine has Java 17, and the Windows launcher has path-with-space issues in this checkout.
- Real API base URLs, credentials, request headers, and sandbox behavior still require manual verification before any real network calls.
- No signing, production CSID, clearance/reporting, PDF/A-3 embedding, or KMS-backed key custody is implemented.

## ZATCA SDK Validation Wrapper Groundwork

Audit date: 2026-05-12

Commit inspected: pending (`Add ZATCA SDK validation wrapper groundwork`)

### SDK Wrapper Groundwork Added

- Added test-only SDK discovery for the local `reference/` folder, SDK JAR, `fatoora` launcher, `jq`, Java availability/version, and repo path-space warnings.
- Added authenticated `GET /zatca-sdk/readiness` and dry-run-only `POST /zatca-sdk/validate-xml-dry-run` endpoints.
- Added `ZATCA_SDK_EXECUTION_ENABLED=false` default behavior; local SDK execution remains blocked by default.
- Added an execution endpoint gate that returns a clear disabled error unless explicitly enabled, and still avoids real execution until the command format is verified.
- Added settings-page SDK readiness display and invoice-detail SDK dry-run command-plan display.
- Extended smoke coverage for SDK readiness and dry-run planning without requiring Java execution.

### Remaining SDK Wrapper Risks

- Direct JAR and `fatoora.bat` invocation still require manual command verification because previous local attempts hit a Java/config null-pointer and Windows path-with-space issues.
- Java 11-14 should be pinned before any execution attempt; local Java 17 is outside the SDK readme range.
- SDK validation is not wired into normal app startup or normal invoice generation.
- No signing, hash replacement, real API calls, PDF/A-3, production CSID, clearance, or reporting behavior was implemented.

## Sales Credit Notes MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add sales credit notes MVP`)

### Credit Notes Added

- Added `CreditNoteStatus`, `CreditNote`, and `CreditNoteLine` schema models with tenant-scoped relations to customer, optional original sales invoice, branch, item, account, tax rate, journal entry, and reversal journal entry.
- Added authenticated credit note APIs for list/create/detail/update/delete/finalize/void plus PDF data/PDF endpoints and invoice-linked credit note listing.
- Added credit note calculation using the same server-side invoice line semantics for gross, discount, taxable amount, tax, and total.
- Added finalization posting: debit revenue by line taxable amount, debit VAT Payable for tax, and credit Accounts Receivable for the credit note total.
- Added void posting through one reusable reversal journal and idempotent finalize/void behavior.
- Added customer ledger and statement rows for finalized and voided credit notes.
- Added operational credit note PDF rendering and generated document archive support with `DocumentType.CREDIT_NOTE`.
- Added frontend credit note list/create/detail/edit pages, invoice detail links/linked rows, and contact ledger navigation.
- Extended smoke coverage for credit note create/finalize, linked invoice listing, ledger row, PDF endpoint, and archived PDF download.

### Remaining Credit Note Risks

- Credit note refund application is not implemented.
- ZATCA credit note XML, signing, PDF/A-3 embedding, clearance, and reporting are not implemented.
- Inventory returns and stock valuation effects are not implemented.
- Credit note application and allocation reversal now mutate invoice `balanceDue`, but refunds and broader customer credit workflows still need design.

## Credit Note Application Workflow

Audit date: 2026-05-12

Commit inspected: pending (`Add credit note application workflow`)

### Credit Application Added

- Added immutable `CreditNoteAllocation` rows that link finalized credit notes to finalized open sales invoices.
- Added authenticated `POST /credit-notes/:id/apply`, `GET /credit-notes/:id/allocations`, and `GET /sales-invoices/:id/credit-note-allocations` endpoints.
- Added transaction-guarded balance updates so credit application decreases `SalesInvoice.balanceDue` and `CreditNote.unappliedAmount` without allowing negative balances.
- Confirmed credit application creates no journal entry because credit note finalization already posts the AR reduction.
- Added ledger and statement `CREDIT_NOTE_ALLOCATION` rows with zero debit/credit so matching is visible without double-counting AR.
- Blocked voiding allocated credit notes and invoices with active credit note allocations until reversal exists.
- Extended credit note PDF data/rendering and frontend invoice/credit note/contact views to show allocations.
- Extended smoke coverage for partial application, over-application rejection, neutral ledger rows, PDF allocation data, and allocated credit note void blocking.

### Remaining Credit Application Risks

- Customer refunds now exist, but payment gateway refunds and bank reconciliation are not implemented.
- Credit note allocation does not yet support automatic suggestions across multiple open invoices.
- ZATCA credit note XML/signing/submission remains pending.
- Inventory returns and stock valuation effects remain pending.

## Credit Note Allocation Reversal

Audit date: 2026-05-12

Commit inspected: pending (`Add credit note allocation reversal`)

### Allocation Reversal Added

- Added reversal metadata to `CreditNoteAllocation`: `reversedAt`, `reversedById`, and `reversalReason`.
- Added authenticated `POST /credit-notes/:id/allocations/:allocationId/reverse`.
- Added guarded transaction logic that restores `SalesInvoice.balanceDue` and `CreditNote.unappliedAmount` without creating a journal entry.
- Added clear duplicate reversal handling with `Credit allocation has already been reversed.`
- Updated credit note and invoice void guards so only active allocations block voiding; reversed allocations do not block.
- Added neutral `CREDIT_NOTE_ALLOCATION_REVERSAL` ledger and statement rows.
- Updated credit note/invoice UI allocation tables, credit note PDFs, tests, and smoke coverage for reversal.

### Remaining Allocation Reversal Risks

- Reversal itself is all-or-nothing, but there is no user-facing allocation reversal history page beyond credit note/invoice/ledger rows.
- Manual customer refund workflow now exists, but payment gateway refunds are not implemented.
- ZATCA credit note XML/signing/submission remains pending.
- Inventory return integration remains pending.

## Customer Refund Groundwork

Audit date: 2026-05-12

Commit inspected: pending (`Add customer refund groundwork`)

### Customer Refunds Added

- Added `CustomerRefundStatus`, `CustomerRefundSourceType`, and tenant-scoped `CustomerRefund` records for manual refunds from unapplied customer payments or finalized credit notes.
- Added authenticated refund APIs for list/create/detail/refundable-sources/void plus PDF data/PDF/archive endpoints.
- Added transaction-guarded source balance updates so refunds decrease payment or credit note `unappliedAmount` and voiding restores it once.
- Added accounting posting: debit Accounts Receivable account code `120`, credit the selected paid-from bank/cash asset account.
- Added refund void reversal journals and blocked source payment/credit note voiding while posted refunds exist.
- Added customer ledger and statement rows for `CUSTOMER_REFUND` and `VOID_CUSTOMER_REFUND`.
- Added frontend refund list/create/detail pages, sidebar navigation, payment/credit-note refund links, and contact ledger navigation.
- Added customer refund PDF rendering and generated document archive support with `DocumentType.CUSTOMER_REFUND`.
- Extended smoke coverage for payment refunds, credit note refunds, refund voiding, source unapplied balance restoration, ledger rows, and refund PDF download.

### Remaining Customer Refund Risks

- No payment gateway refund integration exists.
- No bank reconciliation or bank-feed matching exists.
- No ZATCA credit note/refund XML, signing, clearance, reporting, or PDF/A-3 embedding exists.
- Supplier debit notes and inventory return integration remain pending.

## Customer Overpayment Application Workflow

Audit date: 2026-05-12

Commit inspected: pending (`Add customer overpayment application workflow`)

### Overpayment Application Added

- Added tenant-scoped `CustomerPaymentUnappliedAllocation` audit rows for applying existing customer overpayments to later finalized open invoices.
- Added authenticated APIs for listing unapplied payment allocations, applying unapplied payment amounts, reversing allocations, and viewing invoice-side allocation history.
- Added transaction-guarded allocation and reversal updates so invoice `balanceDue` and payment `unappliedAmount` cannot go negative or exceed original invoice/payment totals.
- Confirmed unapplied payment application and reversal are matching-only actions and do not create journal entries because the original customer payment already posted `Dr Bank/Cash, Cr Accounts Receivable`.
- Active unapplied payment allocations now block customer payment voiding and invoice voiding; reversed allocations do not block voiding.
- Customer refunds continue to use only the current payment `unappliedAmount`, so amounts applied to invoices are not refundable unless the allocation is reversed first.
- Added neutral customer ledger and statement rows for `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION` and `CUSTOMER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL`.
- Updated payment receipts, invoice detail, payment detail, contact ledger UI, tests, and smoke coverage for the new workflow.

### Remaining Overpayment Risks

- No automated customer-credit matching or allocation suggestions exist yet.
- No bank reconciliation or bank-feed matching exists.
- No payment gateway refund integration exists.
- Supplier debit notes and inventory return integration remain pending.
- ZATCA credit note/submission workflow remains pending.

## Purchases And Supplier Payments MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add purchases and supplier payments MVP`)

### Purchases Groundwork Added

- Added `PurchaseBillStatus`, `PurchaseBill`, `PurchaseBillLine`, `SupplierPaymentStatus`, `SupplierPayment`, and `SupplierPaymentAllocation` schema records with tenant-scoped supplier, branch, account, tax rate, item, journal, and allocation relations.
- Added authenticated purchase bill APIs for list/create/detail/update/delete/finalize/void, open bill lookup, PDF data, and PDF download.
- Added authenticated supplier payment APIs for list/create/detail/void, receipt PDF data, and receipt PDF download.
- Added purchase bill calculations using the same decimal-safe gross, discount, taxable, tax, and line-total semantics as sales invoices.
- Added AP posting on bill finalization: debit expense/cost-of-sales/asset purchase accounts, debit VAT Receivable account code `230`, and credit Accounts Payable account code `210`.
- Added supplier payment posting: debit Accounts Payable account code `210`, credit selected paid-through asset account, and reduce allocated bill balances.
- Added supplier payment voiding with one reusable reversal journal and one-time bill balance restoration.
- Added supplier ledger and supplier statement APIs with purchase bill, supplier payment, voided payment, and voided bill rows.
- Added purchase bill and supplier payment receipt PDF rendering plus generated document archive types.
- Added frontend purchases navigation, bill list/create/detail/edit pages, supplier payment list/create/detail pages, and supplier ledger/statement sections on contact detail.
- Extended smoke coverage for supplier contact setup, purchase bill finalization, AP journal checks, partial supplier payment, supplier payment void, supplier ledger/statement, and purchase/supplier payment PDFs.

### Remaining Purchase Risks

- No purchase orders are implemented.
- No supplier debit notes or supplier credit allocation/refund workflow exists beyond supplier payments.
- No inventory stock movement, landed-cost, or COGS integration exists for purchase bill lines that reference inventory accounts.
- No bank reconciliation or bank-feed matching exists for supplier payments.
- No ZATCA purchase-side compliance, validation, or submission workflow is implemented.

## Full Project Audit And Roadmap

Audit date: 2026-05-12

Commit inspected: `dd498c7` (`Add purchases and supplier payments MVP`)

### Audit Docs Created

- Added `docs/PROJECT_AUDIT.md` with current maturity, top risks, and next priorities.
- Added `docs/IMPLEMENTATION_STATUS.md` with module-by-module MVP/partial/groundwork status.
- Added `docs/CODEBASE_MAP.md` with repo structure, backend modules, frontend routes, package boundaries, and logic locations.
- Added `docs/API_CATALOG.md` with implemented endpoints grouped by module.
- Added `docs/DATABASE_MODEL_CATALOG.md` with Prisma enum/model purposes, relationships, accounting impact, and limitations.
- Added `docs/FRONTEND_ROUTE_CATALOG.md` with implemented UI routes, data fetched, actions, and missing UX pieces.
- Added `docs/ACCOUNTING_WORKFLOW_AUDIT.md` with journal postings, balance effects, void/reversal behavior, and risks.
- Added `docs/ZATCA_STATUS_AUDIT.md` with explicit non-compliance warnings and remaining official validation needs.
- Added `docs/TESTING_AND_SMOKE_AUDIT.md` with test counts, smoke coverage, uncovered areas, and Windows caveats.
- Added `docs/REMAINING_ROADMAP.md` with phased next work from MVP stabilization through production/SaaS readiness.
- Added `docs/MANUAL_DEPENDENCIES.md` with human/third-party setup requirements.

### New Issues Found

- Supplier AP balances currently reuse the shared customer-style Dr/Cr display helper on contact detail. The underlying AP ledger math is documented, but the UI should later use supplier-specific payable wording.
- Prisma continues to warn that `package.json#prisma` seed configuration is deprecated and should move to `prisma.config.ts` before Prisma 7.
- PowerShell paths containing `(app)` need quoting or `-LiteralPath` during local operations.

### Major Remaining Risks

- Role permission enforcement is now MVP-grade, but invite/member management and approval workflows remain limited.
- Fiscal periods now lock posting dates, but formal year-end close and approval workflows remain limited.
- Core financial reports now have MVP coverage, but still need accountant review and production hardening.
- Inventory/COGS remain unimplemented; purchase orders and bank reconciliation are MVP-grade and still need advanced hardening.
- Generated PDFs are still stored as database base64 and need object storage before production scale.
- ZATCA remains local/mock/scaffold only and is not production compliant.

### Next Recommended Module

Supplier debit notes are the next accounting module because purchases/AP now exists and supplier-side adjustments are needed before deeper purchase-order or inventory flows.

## Supplier Debit Notes MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add purchase debit notes MVP`)

### Supplier Debit Notes Added

- Added `PurchaseDebitNoteStatus`, `PurchaseDebitNote`, `PurchaseDebitNoteLine`, and `PurchaseDebitNoteAllocation` schema records with tenant-scoped supplier, original bill, branch, account, tax rate, item, journal, and allocation relations.
- Added authenticated purchase debit note APIs for list/create/detail/update/delete/finalize/void/apply/allocation reversal plus PDF data/PDF/archive endpoints.
- Added purchase bill helper APIs for linked debit notes and debit note allocations.
- Added AP reversal posting on debit note finalization: debit Accounts Payable account code `210`, credit line purchase accounts by taxable amounts, and credit VAT Receivable account code `230` when tax exists.
- Added transaction-guarded allocation and reversal updates so purchase bill `balanceDue` and debit note `unappliedAmount` cannot go below zero or above source totals.
- Confirmed debit note allocation and allocation reversal are matching-only actions and do not create journal entries because finalization already posts the AP reduction.
- Added supplier ledger and statement rows for `PURCHASE_DEBIT_NOTE`, `VOID_PURCHASE_DEBIT_NOTE`, `PURCHASE_DEBIT_NOTE_ALLOCATION`, and `PURCHASE_DEBIT_NOTE_ALLOCATION_REVERSAL`.
- Added operational purchase debit note PDF rendering and generated document archive support with `DocumentType.PURCHASE_DEBIT_NOTE`.
- Added frontend purchases navigation, debit note list/create/detail/edit pages, purchase bill linked debit-note sections, allocation/reversal actions, and contact supplier ledger row links.
- Extended smoke coverage for debit note finalization, journal checks, allocation, allocation reversal, voiding after reversal, supplier ledger rows, PDF download, and archived PDF download.

### Remaining Supplier Debit Note Risks

- No inventory return or stock movement integration exists for supplier debit notes.
- No ZATCA debit note XML, signing, clearance, reporting, or PDF/A-3 embedding exists.
- Supplier cash refund workflow now exists for unapplied debit note balances, but it is manual accounting only and has no bank integration.
- No purchase order linkage exists.
- No bank reconciliation or bank-feed matching exists.

## Supplier Overpayment And Refund Workflow

Audit date: 2026-05-12

Commit inspected: pending (`Add supplier overpayment and refund workflow`)

### Supplier Credit Handling Added

- Added `SupplierPaymentUnappliedAllocation`, `SupplierRefundStatus`, `SupplierRefundSourceType`, and `SupplierRefund` schema records with tenant-scoped supplier, source payment/debit note, account, journal, reversal, and generated document support.
- Added authenticated supplier payment APIs for applying unapplied supplier payment credit to open bills, listing unapplied applications, and reversing active unapplied applications.
- Added authenticated supplier refund APIs for list/create/detail/refundable-source lookup/void/PDF data/PDF/archive.
- Added guarded matching-only updates so supplier payment unapplied applications decrease `PurchaseBill.balanceDue` and `SupplierPayment.unappliedAmount`, while reversal restores both without creating journal entries.
- Added supplier refund posting: debit selected bank/cash asset account and credit Accounts Payable account code `210`.
- Added supplier refund voiding with one reusable reversal journal and one-time source `unappliedAmount` restoration.
- Blocked supplier payment voiding while active unapplied payment applications or posted supplier refunds exist; reversed applications and voided refunds do not block.
- Blocked purchase bill voiding while active supplier payment unapplied applications exist.
- Blocked purchase debit note voiding while posted supplier refunds from that debit note exist.
- Added supplier ledger/statement rows for `SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION`, `SUPPLIER_PAYMENT_UNAPPLIED_ALLOCATION_REVERSAL`, `SUPPLIER_REFUND`, and `VOID_SUPPLIER_REFUND`.
- Added operational supplier refund PDF rendering and generated document archive support with `DocumentType.SUPPLIER_REFUND`.
- Added frontend purchases navigation, supplier refund list/create/detail pages, supplier payment unapplied application/reversal UI, supplier refund links from payments/debit notes, purchase bill allocation visibility, and contact supplier ledger row links.
- Extended backend/frontend tests and smoke coverage for supplier overpayment application, reversal, supplier payment refunds, debit note refunds, supplier ledger rows, and supplier refund PDF download.

### Remaining Supplier Credit Risks

- No bank reconciliation or bank-feed matching exists for supplier refunds or supplier payments.
- No payment gateway or bank reconciliation integration exists; refunds are manual accounting records only.
- No automated supplier credit matching or allocation suggestions exist.
- No purchase order linkage exists.
- No inventory return or stock movement integration exists.
- No ZATCA debit note XML/signing/submission exists.

## Cash Expenses MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add cash expenses MVP`)

### Cash Expenses Added

- Added `CashExpenseStatus`, `CashExpense`, and `CashExpenseLine` schema records with tenant-scoped optional supplier/contact, branch, paid-through account, line account, tax rate, item, journal, and void reversal relations.
- Added `DocumentType.CASH_EXPENSE` and `NumberSequenceScope.CASH_EXPENSE` with seeded `EXP-` numbering.
- Added authenticated cash expense APIs for list/create/detail/void/PDF data/PDF/archive.
- Added immediate posting behavior: debit line expense/COGS/asset accounts, debit VAT Receivable account code `230` when tax exists, and credit the selected paid-through asset account.
- Added cash expense voiding with one reusable reversal journal and idempotent void-state handling.
- Added optional supplier/contact linkage with supplier/BOTH validation.
- Added neutral supplier ledger/statement rows for linked cash expenses so supplier activity is visible without changing AP running balance.
- Added operational cash expense PDF rendering and generated document archive support.
- Added frontend purchases navigation route, cash expense list/create/detail pages, PDF download, and void action.
- Extended backend/frontend tests and smoke coverage for posting, VAT journal behavior, supplier ledger visibility, PDF download, and void reversal.

### Remaining Cash Expense Risks

- No receipt attachment upload exists yet.
- No OCR or receipt scanning exists yet.
- No employee claim approval workflow exists yet.
- No bank reconciliation or bank-feed matching exists.
- No cash expense import workflow exists.

## Core Accounting Reports MVP

Audit date: 2026-05-12

Commit inspected: pending (`Add core accounting reports MVP`)

### Reports Added

- Added authenticated, tenant-scoped report APIs for General Ledger, Trial Balance, Profit & Loss, Balance Sheet, VAT Summary, Aged Receivables, and Aged Payables.
- General Ledger, Trial Balance, Profit & Loss, Balance Sheet, and VAT Summary are derived from posted journal activity. Historical journals marked `REVERSED` are included with their posted reversal journals so reversal accounting remains balanced.
- Aged Receivables uses current finalized, non-voided sales invoices with open `balanceDue`.
- Aged Payables uses current finalized, non-voided purchase bills with open `balanceDue`.
- Added frontend report pages under `/reports/*` with date/as-of filters, loading/error/empty states, tabular output, and totals.
- Added report helper tests, backend report math tests, and smoke checks for all report endpoints.

### Remaining Reports Risks

- VAT Summary is not an official VAT return filing report.
- Report PDFs and basic CSV exports now exist.
- Scheduled/email delivery is not implemented yet.
- Report definitions and presentation still need accountant review before production use.

## Fiscal Period Posting Locks

Audit date: 2026-05-12

Commit inspected: pending (`Add fiscal period posting locks`)

### Fiscal Period Controls Added

- Added authenticated, tenant-scoped fiscal period APIs for list/create/detail/update/close/reopen/lock.
- Added overlap validation, end-before-start validation, and guarded status transitions for `OPEN`, `CLOSED`, and `LOCKED`.
- Added a central fiscal period posting guard: if no periods exist, posting remains allowed; once periods exist, posting dates must fall inside an `OPEN` period.
- Enforced the guard on manual journal posting/reversal and all accounting workflows that create posted journals or reversal journals.
- Kept pure allocation/matching actions unguarded because they create no journal entry and should not be treated as new postings.
- Added `/fiscal-periods` frontend page with period creation, status badges, close/reopen/lock actions, and irreversible-lock warnings.
- Extended backend/frontend tests and smoke coverage for fiscal period transitions and closed-period posting rejection.

### Remaining Fiscal Period Risks

- Locked periods cannot be reopened in this MVP; no admin unlock/approval workflow exists.
- Reversal journals use the current date as their posting date; no user-selected reversal date exists yet.
- No fiscal year wizard, period templates, or year-end close workflow exists yet.
- No retained earnings close process exists yet.
- Reports do not yet label or summarize fiscal period status for selected date ranges.

## Role Permission Enforcement

Audit date: 2026-05-12

Commit inspected: pending (`Enforce role permissions`)

### Permissions Enforcement Added

- Added shared permission constants, default role permission sets, and helpers in `packages/shared`.
- Seeded Owner, Admin, Accountant, Sales, Purchases, and Viewer roles with explicit permission arrays.
- Added a tenant-scoped `PermissionGuard` and `@RequirePermissions(...)` decorator for sensitive API routes.
- Enforced permissions on accounting, sales, purchase, reports, document, fiscal period, generated document, organization, role, branch, audit, and ZATCA endpoints.
- Updated `/auth/me` to expose active memberships with role name and permissions for frontend decisions.
- Added frontend permission helpers, sidebar filtering, route-level access denied handling, and permission-aware action visibility.
- Extended smoke coverage to verify role permissions are visible from `/auth/me`.

### Permission Risks Reduced

- Users with active organization membership can no longer perform sensitive accounting actions solely by guessing API endpoints.
- Report, posting, voiding, fiscal lock, document settings, generated document download, and ZATCA management actions now require explicit role permissions.
- Frontend navigation and high-risk action buttons no longer advertise workflows the active role cannot use.

### Remaining Permission Risks

- Invite flow and member/role assignment UI remain limited.
- Role editor UI is not yet production-grade.
- Approval workflows, maker-checker review, and dual-control policies are not implemented.
- Permission coverage must be kept current when new modules or endpoints are added.

## Team And Role Management

Audit date: 2026-05-13

Commit inspected: pending (`Add team and role management`)

### Team/Role Management Added

- Added `Role.isSystem` so seeded default roles can be protected from deletion and editing.
- Added role create/update/delete APIs with permission-string validation against the shared permission catalog.
- Added organization member list/detail, role update, status update, and local invite-placeholder APIs.
- Added lockout safeguards that block removing the last active full-access member and leaving the organization without an active user manager.
- Added `/settings/team`, `/settings/roles`, and `/settings/roles/[id]` UI pages with permission-aware controls.
- Added grouped permission matrix UI for viewing and editing custom roles.
- Extended smoke coverage for role list, member list, custom role creation, and unknown permission rejection.

### Remaining Team/Role Risks

- Email invite delivery is not implemented.
- Password reset and onboarding for invited users are not implemented.
- Approval workflows and dual-control for high-risk role/member changes are not implemented.
- Role/member changes write audit logs, but there is no dedicated audit review UI yet.

## Inventory Warehouse And Stock Ledger Groundwork

Audit date: 2026-05-13

Commit inspected: pending (`Add inventory warehouse groundwork`)

### Inventory Groundwork Added

- Added warehouse and stock movement schema groundwork with active/archived warehouse status and positive-quantity stock ledger movement types.
- Added seeded and provisioned `MAIN` default warehouses for organizations.
- Added authenticated warehouse APIs for list/create/detail/update/archive/reactivate with tenant scoping and archive safeguards.
- Added authenticated stock movement APIs for list/create/detail with tracked-item validation, active-warehouse validation, duplicate opening-balance rejection, and negative-stock prevention.
- Added derived inventory balance API by item and warehouse.
- Added Inventory sidebar navigation, warehouse pages, stock movement pages, balance table, item inventory-tracking quantity display, and frontend inventory helper tests.
- Extended smoke coverage for default warehouse lookup, inventory-tracked item setup, opening balance, adjustment in/out, balance verification, movement listing, and no-journal stock movement behavior.

### Remaining Inventory Risks

- No inventory valuation accounting exists.
- No automatic COGS posting exists; manual COGS posting now requires explicit review/action.
- Manual operational purchase receiving now exists, but no automatic purchase bill stock receipt or inventory asset posting exists.
- Manual operational sales stock issue now exists, but no sales delivery document, automatic sales invoice stock issue, or automatic COGS posting exists.
- Direct stock-movement adjustments have been replaced by the controlled adjustment workflow.
- No inventory financial reporting or valuation report exists.

## Inventory Adjustments And Warehouse Transfers

Audit date: 2026-05-14

Commit inspected: pending (`Add inventory adjustments and transfers`)

### Inventory Operations Added

- Added `InventoryAdjustment` schema, statuses, types, number sequences, permissions, APIs, and frontend list/create/detail/edit pages.
- Added draft adjustment lifecycle with draft-only edit/delete, approval to generated `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` movements, and one-time void reversal movements.
- Added `WarehouseTransfer` schema, status, number sequence, permissions, APIs, and frontend list/create/detail pages.
- Added immediate posted warehouse transfers with atomic `TRANSFER_OUT` and `TRANSFER_IN` stock movements plus one-time reversal movements on void.
- Restricted direct stock movement creation to `OPENING_BALANCE`; adjustments and transfers now own their generated stock rows.
- Extended inventory balance behavior and tests so adjustment and transfer movement directions are included.
- Extended smoke coverage for adjustment approval/void, transfer posting/void, balance restoration, and no-journal inventory behavior.

### Remaining Inventory Risks

- No automatic COGS posting exists; manual COGS posting now requires explicit review/action.
- No inventory valuation accounting exists.
- Manual operational purchase receiving now exists, but no automatic purchase bill stock receipt or inventory asset posting exists.
- Manual operational sales stock issue now exists, but no sales delivery document, automatic sales invoice stock issue, or automatic COGS posting exists.
- Operational inventory reports exist, but no accounting-grade inventory financial reports exist.
- No landed cost workflow exists.
- No barcode, serial, or batch tracking exists.

## Remaining Risks

- The concurrency strategy relies on PostgreSQL row locks produced by conditional updates inside Prisma transactions. A small multi-process load test is still recommended before production.
- If a manual journal reversal races against an invoice/payment void of the same journal, the void may fail cleanly and need a retry instead of silently reusing that concurrent reversal.
- Branch defaults are not globally normalized; multiple branches can be marked default.
- Account parent updates prevent self-parenting but do not yet prevent descendant cycles.
- `next-env.d.ts` flips between `.next/types` and `.next/dev/types` when switching between build and dev on Next 16. The tracked file is kept clean after verification, but this remains local development churn.
- Prisma 6 warns that `package.json#prisma` seed configuration is deprecated and should move to a Prisma config file before Prisma 7.
- Inventory warehouse/stock ledger, adjustment approval, warehouse transfer controls, purchase receiving, sales stock issue controls, and accounting preview groundwork exist, but real COGS posting, inventory asset GL posting, inventory clearing, landed cost, serial/batch tracking, automatic financial inventory accounting, and inventory financial reporting remain unimplemented.
- ZATCA groundwork is intentionally non-compliant until real onboarding, signing, clearance/reporting, PDF/A-3, official SDK/schema/Schematron validation, and KMS-backed key custody are implemented.

## Recommended Next Steps

1. Review the new inventory accounting preview layer with an accountant, then add explicit COGS posting only after approval.
2. Add formal fiscal year close, retained earnings close, and admin unlock/approval workflows.
3. Add a lightweight Playwright or browser smoke suite once the local Node runtime supports the in-app browser backend.
4. Normalize branch default behavior and account parent cycle validation.
5. Move Prisma seed configuration to `prisma.config.ts` before upgrading to Prisma 7.
