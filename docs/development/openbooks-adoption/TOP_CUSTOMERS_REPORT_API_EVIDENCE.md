# Top Customers Report API Evidence

## PR Title

`Add finalized-invoice top customers report API`

## Branch

`codex/openbook-top-customers-report`

## Scope

- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/reports/reports.service.spec.ts`
- `apps/api/src/reports/reports.controller.ts`
- `apps/api/src/reports/reports.controller.spec.ts`

## Adopted Behavior

- Behavior inspiration: add a small reports-pack slice for ranking customers.
- LedgerByte-native specification: aggregate finalized sales invoices for the active organization, optional branch, and optional date range.
- OpenBooks source used: `No`.

## Clean-Room Confirmation Checklist

- [x] No OpenBooks code copied.
- [x] No OpenBooks schema copied.
- [x] No OpenBooks comments copied.
- [x] No OpenBooks UI text copied.
- [x] No OpenBooks file names, function names, or implementation structure copied.
- [x] No OpenBooks dependency added.
- [x] No OpenBooks source fetched, vendored, imported, translated, ported, or reused.
- [x] Production source does not reference OpenBooks.
- [x] Implementation follows existing LedgerByte report service/controller patterns.

## Runtime Behavior Changed

`yes`

Adds `GET /reports/top-customers` behind the existing reports authentication, organization-context, and `reports.view` permission guard. The response ranks customers by finalized sales invoice gross total in the selected period and returns totals plus conservative report notes.

## Guardrails

- No hosted service was touched.
- No customer data was mutated.
- No report-pack generation, PDF export, CSV export, storage adapter, provider integration, email sending, or authority workflow was added.
- No UAE, ZATCA, Peppol, ASP, storage-provider, or production-readiness claim was added.
- The report explicitly states that it does not net credit notes, refunds, delivery notes, quotes, recurring templates, or payment timing.

## Tests Run

- `corepack pnpm install --frozen-lockfile`: `passed`.
- `corepack pnpm --filter @ledgerbyte/api db:generate`: `passed`.
- `corepack pnpm --filter @ledgerbyte/api test -- reports.service.spec.ts reports.controller.spec.ts`: `passed`.
- `corepack pnpm --filter @ledgerbyte/api typecheck`: `passed`.
- `corepack pnpm verify:openbooks-clean-room`: `passed` with `blockedReferencesCount: 0` and `forbiddenClaimCount: 0`.
- `git diff --check`: `passed` with repository line-ending warnings only.

## Tests Skipped And Why

- Full monorepo test suite: not required for this bounded API report slice unless focused checks fail.
- Browser/E2E run: not run because no web route or UI was added.

## Remaining Blockers

- Top products/services, cash flow, revenue trend, and richer report-pack UI remain future independent slices.
- Credit-note/refund netting should be designed separately before labeling this as net revenue or customer profitability.

## Next Recommended PR

`Add a LedgerByte-native top products/services report API slice from finalized sales invoice lines, with explicit exclusions and focused tenant/date/branch tests.`
