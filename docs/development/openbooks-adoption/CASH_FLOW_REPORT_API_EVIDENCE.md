# Cash Flow Report API Evidence

## PR Title

`Add cash flow report API`

## Branch

`codex/openbook-cash-flow-report`

## Commit

`pending before final commit`

## Scope

- Add a LedgerByte-native cash flow report builder.
- Add an API service method that reads active cash/bank accounts and posted/reversed journal lines.
- Add `GET /reports/cash-flow`.
- Add focused service and controller coverage.

## Adopted Behavior

- Behavior inspiration: cash-flow management visibility.
- LedgerByte-native implementation: cash flow is derived from LedgerByte journal lines for active cash/bank accounts.
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
| `apps/api/src/reports/reports.service.ts` | Adds `cashFlow` and `buildCashFlowReport`, calculating opening cash, monthly inflows/outflows, net cash flow, and closing cash. |
| `apps/api/src/reports/reports.service.spec.ts` | Covers cash-flow math, active account selection, tenant/date/status/account scoping, and branch filter forwarding. |
| `apps/api/src/reports/reports.controller.ts` | Adds `GET /reports/cash-flow`. |
| `apps/api/src/reports/reports.controller.spec.ts` | Covers controller delegation to the cash-flow report engine. |
| `docs/development/openbooks-adoption/CASH_FLOW_REPORT_API_EVIDENCE.md` | Records guardrails and validation evidence for this slice. |

## Runtime Behavior Changed

`yes`

The API now exposes a read-only cash-flow report endpoint. It does not add persistence, hosted mutations, bank-feed behavior, payment initiation, provider behavior, storage behavior, exports, generated documents, or compliance submission behavior.

## Report Basis

- Basis: `POSTED_AND_REVERSED_CASH_AND_BANK_JOURNAL_LINES`.
- Included: active-organization journal lines for active LedgerByte cash/bank accounts with `POSTED` or `REVERSED` journal status.
- Excluded: draft, voided, inactive-account, source-document-only, other-tenant, outside-date-range, and non-matching-branch activity.
- Granularity: monthly.
- Opening cash: posted/reversed cash/bank journal lines before the selected `from` date.

## Tests Run

- `corepack pnpm --filter @ledgerbyte/api test -- reports.service.spec.ts reports.controller.spec.ts`: `failed before implementation as expected; missing cash-flow builder/service/controller`.
- `corepack pnpm --filter @ledgerbyte/api test -- reports.service.spec.ts reports.controller.spec.ts`: `passed`.

## Tests Skipped And Why

- Full monorepo test suite: not required for this API-only report slice unless focused checks fail.
- Browser/visual checks: not applicable; no web UI changed.
- CSV/PDF/export checks: not applicable; this slice does not add cash-flow export endpoints.

## Screenshots/Evidence Captured

- Not applicable; API-only behavior covered by focused Jest tests.

## Feature Status

`PARTIAL`

Cash-flow API is implemented as a narrow report-pack slice. Broader report-pack UI, exports, trend/dashboard wiring, and additional report summaries remain future slices.

## Guardrails

- No hosted mutations were added.
- No bank feeds, payment initiation, provider integration, provider submission, email sending, or external network behavior was added.
- No object-storage, backup, signed URL, or generated-document production claim was added.
- No ZATCA, UAE, Peppol, ASP, tax filing, or production compliance claim was added.
- No OpenBook source was copied or reused.
