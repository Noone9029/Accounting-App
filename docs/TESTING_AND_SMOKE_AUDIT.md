# Testing And Smoke Audit

Audit date: 2026-05-12

## Test Commands

Run from repo root:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Optional live API smoke, only when local DB/API is running:

```bash
corepack pnpm smoke:accounting
```

Database setup commands:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

## Current Test Coverage

Test locations:

- Backend Jest tests: `apps/api/src/**/*.spec.ts`
- Frontend Jest tests: `apps/web/src/lib/*.test.ts`
- ZATCA core Node tests: `packages/zatca-core/test/*.test.ts`
- Smoke script: `apps/api/scripts/smoke-accounting.ts`

Latest known counts after `dd498c7`:

- API: 20 test suites, 181 tests.
- Web helper tests: 7 test suites, 40 tests.
- ZATCA core: 2 suites, 12 tests.

Audit verification run on 2026-05-12:

- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed with the counts above.
- `corepack pnpm build`: passed.
- `corepack pnpm smoke:accounting`: skipped because the local API was not responding on `localhost:4000`.

## Backend Unit Areas

- Journal rules and reversal.
- Chart of accounts guards.
- Tax rate validation.
- Number sequence generation.
- Sales invoice rules and transaction safety.
- Customer payment posting/allocation/voiding.
- Unapplied customer payment application/reversal.
- Credit note posting/allocation/reversal.
- Customer refunds.
- Purchase bills and supplier payments.
- Customer/supplier ledger behavior.
- Document settings and generated document archive.
- PDF rendering.
- ZATCA config, rules, controller behavior, SDK readiness/wrapper.

## Frontend Unit Areas

- Credit note helpers.
- Customer payment helpers.
- Customer refund helpers.
- Document setting helpers.
- Money/allocation preview helpers.
- PDF download URL helpers.
- ZATCA display/readiness helpers.

## Smoke Workflow Coverage

Smoke script: `apps/api/scripts/smoke-accounting.ts`

Current smoke verifies:

- Seed login and organization discovery.
- Document settings read/update.
- Account/tax/item/customer setup.
- Sales invoice draft creation/edit/finalization/idempotency.
- ZATCA profile, adapter safe defaults, checklist/readiness/XML mapping, EGS private-key redaction, CSR, mock CSID, XML/QR/hash, local validation, SDK readiness/dry-run, and safe blocked clearance/reporting.
- Payment over-allocation rejection.
- Partial and full customer payments.
- Customer ledgers/statements.
- Customer receipt data and PDFs.
- Generated document archive download.
- Customer overpayment application/reversal.
- Customer refunds from payments and credit notes.
- Credit note creation/finalization/application/allocation reversal/PDF/archive/ledger.
- Supplier contact setup.
- Purchase bill creation/finalization/idempotency/AP journal/PDF/archive.
- Supplier payment posting/allocation/void/receipt PDF.
- Supplier ledger and supplier statement.
- Expected rejection paths for unsafe/blocked operations.

## What Is Not Covered

- Browser-driven route interaction.
- Visual PDF rendering checks beyond endpoint validity.
- Multi-user role/permission behavior.
- Fiscal-period locking because it is not implemented.
- Inventory, purchase orders, debit notes, reports, bank reconciliation because they are not implemented.
- Real ZATCA SDK execution, signing, CSID, clearance, reporting, and PDF/A-3 because they are intentionally not implemented.
- Load/concurrency testing across multiple processes.

## Platform Caveats

- Windows Prisma DLL lock: `db:generate` can fail with `EPERM` if API/dev Node processes hold generated Prisma client DLLs. Stop API/dev processes and rerun.
- PowerShell path parsing: paths containing `(app)` must be quoted or passed with `-LiteralPath`.
- Docker Desktop pipe unavailable: if Docker commands fail with `open //./pipe/dockerDesktopLinuxEngine`, start Docker Desktop and wait for `docker info`.
- ZATCA SDK path issue: the local checkout path `E:\Accounting App` contains a space; previous SDK launcher work noted path-with-spaces risk.
- ZATCA SDK Java version: SDK docs need manual verification; previous notes indicated Java 11-14 expectations while local Java may differ.
- Prisma seed warning: `package.json#prisma` seed config is deprecated and should move before Prisma 7.

## Recommended Test Improvements

- Add Playwright or equivalent browser flows for invoices, payments, credit notes, purchase bills, supplier payments, documents, and ZATCA settings.
- Add report tests once financial reports are implemented.
- Add load/concurrency tests for simultaneous invoice finalization, payment allocation, refund voiding, supplier payment allocation, and bill voiding.
- Add PDF snapshot or text extraction tests for all document types.
- Add role/permission tests when authorization is enforced.
