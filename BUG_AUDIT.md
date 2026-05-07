# LedgerByte Bug Audit

Audit date: 2026-05-06

Commit inspected: `da77d04` (`Implement customer ledger and receipts`)

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

Commit inspected: pending (`Add safe ZATCA sandbox adapter scaffolding`)

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

## Remaining Risks

- The concurrency strategy relies on PostgreSQL row locks produced by conditional updates inside Prisma transactions. A small multi-process load test is still recommended before production.
- If a manual journal reversal races against an invoice/payment void of the same journal, the void may fail cleanly and need a retry instead of silently reusing that concurrent reversal.
- Branch defaults are not globally normalized; multiple branches can be marked default.
- Account parent updates prevent self-parenting but do not yet prevent descendant cycles.
- `next-env.d.ts` flips between `.next/types` and `.next/dev/types` when switching between build and dev on Next 16. The tracked file is kept clean after verification, but this remains local development churn.
- Prisma 6 warns that `package.json#prisma` seed configuration is deprecated and should move to a Prisma config file before Prisma 7.
- ZATCA groundwork is intentionally non-compliant until real onboarding, signing, clearance/reporting, PDF/A-3, and official validation are implemented.

## Recommended Next Steps

1. Add optimistic concurrency or transaction guards for invoice finalization, payment allocation, and reversal idempotency.
2. Add a lightweight Playwright or browser smoke suite once the local Node runtime supports the in-app browser backend.
3. Normalize branch default behavior and account parent cycle validation.
4. Move Prisma seed configuration to `prisma.config.ts` before upgrading to Prisma 7.
