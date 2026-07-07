# Dashboard Aggregate Deep Proof Review

Status: local-only proof pack branch, targeted proof implemented.

Branch: `codex/dashboard-aggregate-deep-proof`

## Scope

This branch adds a guarded Prisma-backed proof for the API dashboard aggregate service. It does not add runtime dashboard behavior, accounting logic, hosted proof execution, provider/storage calls, bank feeds, automatic reconciliation, UAE/ZATCA behavior, schema changes, migrations, or UI changes.

## Areas Covered

- Local-only opt-in database guard.
- Two synthetic tenants with separate dashboard source data.
- Sales invoice totals, overdue receivables, customer payment totals, and Sales/AR attention rows.
- Purchase bill totals, overdue payables, and supplier payment totals.
- Bank account count, bank balance, unreconciled imported bank statement transaction count, and latest closed reconciliation date.
- Inventory tracked-item count, low-stock count, estimated inventory value, and clearing variance summary path.
- Trial balance, profit-and-loss, balance-sheet, sales trend, purchase trend, net-profit trend, and cash-balance trend.
- AR/AP aging bucket impact from the real reports service.
- Fiscal-period, audit-log, ZATCA-readiness, storage-readiness, and attention-item signals.
- Read-only behavior for dashboard summary calls.
- Sales/AR attention detail suppression when the caller lacks Sales/AR view permission context.
- Cross-tenant negative assertions for both tenant A and tenant B summaries.

## Guard Model

The proof defaults to skipped. It runs only when:

- `LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION=1`
- `LEDGERBYTE_TEST_DATABASE_URL` is set

The test refuses:

- missing explicit test database URL
- non-Postgres URLs
- non-local hosts
- production-looking database names

The spec intentionally does not fall back to `DATABASE_URL`.

## Bugs Found

- None in production runtime code.
- The initial proof harness used Jest fake timers before Prisma setup, which stalled the opt-in local DB run. The spec now uses real timers with current-month synthetic fixture dates.

## Fixes Implemented

- Added `apps/api/src/dashboard-aggregate-deep-proof.integration.spec.ts`.
- Added this review document and PR summary document.
- Kept the proof dynamic to the current month so dashboard "this month", overdue, due-today, due-soon, and trend assertions remain valid without faking time.

## Accounting Impact

No production accounting logic changed. The proof uses existing dashboard/report behavior and synthetic posted journal rows to verify aggregate math.

## Remaining Untested Areas

- Browser rendering of the dashboard aggregate widgets.
- Hosted/customer-data dashboard proof.
- Dashboard concurrency/load behavior.
- Real storage readiness/provider behavior.
- Deep drilldown navigation from every dashboard card.
- Accountant beta sign-off.

## Commands Run

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with local placeholder URL - passed.
- Default guarded dashboard aggregate proof - passed with 5 guard tests passed and 3 DB proof tests skipped.
- Local Docker Postgres/Redis started under `ledgerbyte-dashboard-aggregate-proof`, local migrations applied, opt-in local DB dashboard aggregate proof passed with 8 tests passed.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Generated-file check restored `apps/web/next-env.d.ts` generated route-type churn; final check clean.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk secret scan - passed with no real secrets.

## Remaining Risks

- This proof is local-only and synthetic. It does not prove hosted staging behavior or production readiness.
- The proof relies on application-level tenant scoping, not database-enforced RLS.
- Dashboard aggregate correctness is broad; this lane proves representative core aggregates rather than every possible dashboard card state.

## Next Recommended Prompt

Codex, review the dashboard aggregate deep proof PR only for owner-review readiness. Confirm the diff is limited to the local-only dashboard aggregate proof spec and docs, run the guarded default test, run the opt-in local DB proof if local Postgres is available, run lint/typecheck/test/build/verify:diff, check generated files and secrets, and do not add hosted mutations, accounting logic changes, schema changes, provider calls, UAE/ZATCA work, UI changes, or dashboard runtime changes.
