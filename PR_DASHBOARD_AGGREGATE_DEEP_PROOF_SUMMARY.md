# PR: Add dashboard aggregate deep proof pack

## Summary

This PR adds a local-only, opt-in Prisma proof for dashboard aggregate correctness and tenant isolation.

It proves:

- dashboard sales, Sales/AR attention, purchase, banking, inventory, report, trend, aging, compliance, storage, and attention-item sections calculate from synthetic tenant-scoped data
- tenant A dashboard output excludes tenant B markers and amounts
- tenant B dashboard output excludes tenant A markers
- dashboard summary reads do not create journals, audit logs, or bank statement transactions
- Sales/AR attention details are suppressed when the caller lacks Sales/AR view permission context
- the proof uses the real `DashboardService`, `ReportsService`, and `InventoryClearingReportService`

## Safety

- No production runtime code changed.
- No accounting logic changed.
- No Prisma schema or migrations changed.
- No UI behavior changed.
- No hosted migrations or hosted mutations were run.
- No provider/storage APIs were called.
- No live bank feed, payment initiation, automatic reconciliation, UAE/ZATCA provider behavior, or production compliance claim was added.
- The proof is synthetic and local-only.

## Opt-In Guard

Default test behavior is safe and skip-only. Full local DB proof requires:

```powershell
$env:LEDGERBYTE_DASHBOARD_AGGREGATE_DB_INTEGRATION='1'
$env:LEDGERBYTE_TEST_DATABASE_URL='postgresql://accounting:accounting@localhost:5432/accounting?schema=public'
corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath apps/api/src/dashboard-aggregate-deep-proof.integration.spec.ts
```

The spec refuses missing, hosted, non-local, and production-looking database URLs. It does not fall back to `DATABASE_URL`.

## Validation

- `corepack pnpm install --frozen-lockfile` - passed.
- `corepack pnpm --filter @ledgerbyte/api db:generate` - passed.
- Prisma validate with a local placeholder URL - passed.
- Default guarded spec run - passed with 5 guard tests passed and 3 DB proof tests skipped.
- Opt-in local DB proof run - passed with 8 tests passed against local Docker Postgres after local-only migrations.
- `corepack pnpm lint` - passed.
- `corepack pnpm typecheck` - passed.
- `corepack pnpm test` - passed.
- `corepack pnpm build` - passed.
- `corepack pnpm verify:diff` - passed.
- `git diff --check` - passed.
- Changed-file trailing whitespace scan - passed.
- Targeted high-risk secret scan on changed files - passed with no real secrets.
- Generated-file check restored generated `apps/web/next-env.d.ts` churn; final check is clean.

Implementation note: the proof spec uses real timers and current-month fixture dates so Prisma connections and queries are not affected by Jest fake timers.

## Remaining Gaps

- Browser rendering of the dashboard aggregate widgets.
- Hosted/customer-data dashboard proof.
- Dashboard concurrency/load behavior.
- Real storage readiness/provider behavior.
- Deep drilldown navigation from every dashboard card.
- Accountant beta sign-off.
