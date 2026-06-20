# Revenue Trend Report API Evidence

## PR Title

`Add revenue trend report API`

## Branch

`codex/openbook-revenue-trend-report`

## Commit

`pending before final commit`

## Scope

- Add a LedgerByte-native revenue trend report builder.
- Add an API service method that reads posted and reversed revenue-account journal lines.
- Add `GET /reports/revenue-trend`.
- Add focused service and controller coverage.

## Adopted Behavior

- Behavior inspiration: management revenue trend visibility.
- LedgerByte-native implementation: revenue is derived from LedgerByte journal lines, not simplified source-document totals.
- OpenBook source used: `No`.

## Clean-Room Confirmation Checklist

- [x] No OpenBook code copied.
- [x] No OpenBook schema copied.
- [x] No OpenBook comments copied.
- [x] No OpenBook UI text copied.
- [x] No OpenBook file names, function names, or implementation structure copied.
- [x] No OpenBook dependency added.
- [x] No OpenBook source fetched, vendored, imported, translated, ported, or reused.
- [x] Production source does not reference OpenBook.
- [x] Implementation is LedgerByte-native and follows existing report service/query patterns.

## Files Changed

| File | Purpose |
| --- | --- |
| `apps/api/src/reports/reports.service.ts` | Adds `revenueTrend` and `buildRevenueTrendReport`, grouping posted/reversed revenue journal lines by month. |
| `apps/api/src/reports/reports.service.spec.ts` | Covers monthly grouping, tenant/date/status/account scoping, and branch filter forwarding. |
| `apps/api/src/reports/reports.controller.ts` | Adds `GET /reports/revenue-trend`. |
| `apps/api/src/reports/reports.controller.spec.ts` | Covers controller delegation to the revenue trend report engine. |
| `docs/development/openbooks-adoption/REVENUE_TREND_REPORT_API_EVIDENCE.md` | Records guardrails and validation evidence for this slice. |

## Runtime Behavior Changed

`yes`

The API now exposes a read-only revenue trend report endpoint. It does not add persistence, hosted mutations, provider behavior, storage behavior, exports, generated documents, or compliance submission behavior.

## Report Basis

- Basis: `POSTED_AND_REVERSED_REVENUE_JOURNAL_LINES`.
- Included: active-organization journal lines for revenue accounts with `POSTED` or `REVERSED` journal status.
- Excluded: draft, voided, source-document-only, non-revenue, other-tenant, outside-date-range, and non-matching-branch activity.
- Granularity: monthly.

## Tests Run

- `corepack pnpm --filter @ledgerbyte/api test -- reports.service.spec.ts reports.controller.spec.ts`: `failed before implementation as expected; missing revenue trend builder/service/controller`.
- `corepack pnpm --filter @ledgerbyte/api test -- reports.service.spec.ts reports.controller.spec.ts`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this API-only report slice unless focused checks fail.
- Browser/visual checks: not applicable; no web UI changed.
- CSV/PDF/export checks: not applicable; this slice does not add revenue trend export endpoints.

## Screenshots/Evidence Captured

- Not applicable; API-only behavior covered by focused Jest tests.

## Feature Status

`PARTIAL`

Revenue trend API is implemented as a narrow report-pack slice. Broader report-pack UI, exports, cash-flow reporting, and additional report summaries remain future slices.

## Guardrails

- No hosted mutations were added.
- No provider integration, provider submission, email sending, or external network behavior was added.
- No object-storage, backup, signed URL, or generated-document production claim was added.
- No ZATCA, UAE, Peppol, ASP, tax filing, or production compliance claim was added.
- No OpenBook source was copied or reused.
