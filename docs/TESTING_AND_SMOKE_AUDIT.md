# Testing And Smoke Audit

Audit date: 2026-05-15

## Test Commands

Run from repo root:

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm e2e
```

Optional live API smoke, only when local DB/API is running:

```bash
corepack pnpm smoke:accounting
```

Optional browser smoke, only when local DB/API/web are running:

```bash
corepack pnpm e2e
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
- Browser E2E smoke: `tests/e2e/*.spec.ts`

Latest known counts from the dashboard checkpoint:

- API: 78 test suites, 558 tests.
- Web helper tests: 27 test suites, 139 tests.
- ZATCA core: 2 suites, 12 tests.
- Browser E2E smoke: 11 specs covering critical app surfaces.

Route QA polish pass on 2026-05-15:

- Static route inventory covered 111 frontend `page.tsx` route patterns.
- Literal app-link sweep found no unmatched frontend app links after replacing the stale dashboard reconciliation URL.
- Focused dashboard helper test verifies permission-aware drill-down links for customer payments, bank account/reconciliation review, negative stock, fiscal periods, and restricted P&L visibility.
- Responsive table polish was applied to older list routes that still clipped wide tables instead of allowing horizontal scrolling.

Audit verification run on 2026-05-15:

- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed with the counts above.
- `corepack pnpm build`: passed.
- `corepack pnpm smoke:accounting`: passed at the dashboard checkpoint after starting a transient local API.

## Backend Unit Areas

- Journal rules and reversal.
- Chart of accounts guards.
- Tax rate validation.
- Number sequence generation.
- Dashboard summary aggregation and permission metadata.
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
- Dashboard KPI formatting, attention labels, quick-action visibility, and empty-state helpers.
- Dashboard drill-down visibility and route helper coverage.
- Number sequence settings helpers.
- Audit export/retention helpers.

## Smoke Workflow Coverage

Smoke script: `apps/api/scripts/smoke-accounting.ts`

Current smoke verifies:

- Seed login and organization discovery.
- Dashboard summary section checks and sensitive-field absence checks.
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
- Number sequence settings/listing/audit logging.
- Audit retention settings, retention dry-run preview, and audit CSV export redaction.
- Storage readiness and migration-plan dry-run checks.
- Email readiness, invite acceptance, password reset, and token cleanup coverage.
- Inventory COGS, receipt asset posting, clearing reconciliation, and variance proposal flows.

## What Is Not Covered

- Browser-driven route interaction has smoke-level Playwright coverage for critical surfaces, but it intentionally avoids deep accounting assertions.
- Route QA is still smoke/static focused; it does not replace visual regression testing or manual responsive review on every dynamic detail page.
- Visual PDF rendering checks beyond endpoint validity.
- Full multi-user role/permission behavior across every route.
- Full visual regression coverage.
- Load/concurrency testing.
- Real ZATCA SDK execution, signing, CSID, clearance, reporting, and PDF/A-3 because they are intentionally not implemented.
- Live bank feeds, real email provider delivery, object-storage migration, and production backup/restore drills.

## Platform Caveats

- Windows Prisma DLL lock: `db:generate` can fail with `EPERM` if API/dev Node processes hold generated Prisma client DLLs. Stop API/dev processes and rerun.
- PowerShell path parsing: paths containing `(app)` must be quoted or passed with `-LiteralPath`.
- Docker Desktop pipe unavailable: if Docker commands fail with `open //./pipe/dockerDesktopLinuxEngine`, start Docker Desktop and wait for `docker info`.
- ZATCA SDK path issue: the local checkout path `E:\Accounting App` contains a space; previous SDK launcher work noted path-with-spaces risk.
- ZATCA SDK Java version: SDK docs need manual verification; previous notes indicated Java 11-14 expectations while local Java may differ.
- Prisma seed warning: `package.json#prisma` seed config is deprecated and should move before Prisma 7.

## Recommended Test Improvements

- Keep the deployed E2E workflow manual until the test database reset/migration strategy is safe, then consider scheduled runs.
- Expand browser smoke where browser-only regressions are found.
- Add load/concurrency tests for simultaneous invoice finalization, payment allocation, refund voiding, supplier payment allocation, and bill voiding.
- Add PDF snapshot or text extraction tests for all document types.
- Add deeper role/permission browser tests for restricted users.
