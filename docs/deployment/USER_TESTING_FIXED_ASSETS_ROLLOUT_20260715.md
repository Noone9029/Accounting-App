# Fixed Assets MVP: Burner Rollout Evidence

Status: **PARTIAL PASS for the approved burner/user-testing environment.** The implementation, accounting fixes, hosted API proof, and authenticated browser surface are present. This is not a clean-ledger or production-readiness sign-off because the approved burner contains prior diagnostic data, a clean organization could not be provisioned, and non-fixed-asset close blockers remain.

Scope is limited to Supabase project `xynelbjqcmbgtscfmmzv`, Vercel projects `ledgerbyte-api-test` and `ledgerbyte-web-test`, and the approved aliases below. This document does not claim production, compliance, provider, money-movement, backup, restore, or official e-invoicing proof.

## Source, merge, and review evidence

- Fixed-assets implementation and follow-up fixes are merged through PRs #363, #364, #365, #366, #368, #369, and #370.
- Current merged `origin/main`: `f5e0cc719559cee62257711c69129e0c34b88b1c`.
- PR #368 (`8005bc79`) corrected reconciliation to net depreciation reversals while excluding disposed and written-off historical assets from current-balance aggregation.
- PR #369 (`5c47284a`) corrected multi-line depreciation posting and reversal so each asset is updated once by the aggregated run amount and exact restoration is preserved.
- PR #370 (`af4e19f8`) corrected the web register's organization transition state: prior rows are cleared immediately and late responses cannot repopulate a previous tenant's register.
- The independent accounting review found no Critical or Important findings after the #369 correction. It recorded a Minor limitation: the new service tests stub journal creation and do not independently assert journal balancing; existing journal tests cover that concern. All three PRs passed GitHub Non-mutating verification and GitGuardian security checks.

## Supabase and migration evidence

- Additive disposal-evidence and disposal-review migrations were applied to project `xynelbjqcmbgtscfmmzv`; remote migration/schema read-back confirmed the disposal-review columns and movement proceeds/gain/loss columns.
- The approved user-testing account and original smoke organization remain the only confirmed membership context. A new organization-create attempt returned hosted HTTP 500 before a new organization could be provisioned, so the clean smoke had to remain in the approved existing burner.
- All smoke data is marked `SMOKE-CLEAN-FA-*` or `SMOKE-*`. No protected root artifact or production tenant was used.

## Deployments

| Surface | Deployment | State | Alias |
| --- | --- | --- | --- |
| API | `dpl_AErvHiy8J7owD7KuSbBe9w9x2bTo` | READY / production | `https://ledgerbyte-api-test.vercel.app` |
| Web | `dpl_87moFnjjBpesJ2p8k2exWoegdv5N` | READY / production | `https://ledgerbyte-web-test.vercel.app` |

Observed public checks after the merged API deployment: API `/`, `/health`, and `/readiness` returned HTTP 200; protected fixed-assets access without credentials returned HTTP 401. The web alias loaded the authenticated fixed-assets routes used below.

## API and hosted smoke evidence

The marked API smoke covered matrix items 1–29: category/account mapping; manual acquisition and balanced posting; finalized bill and full-line capitalization; duplicate rejection; foreign-currency evidence preservation; opening import; depreciation preview/review/post; balanced depreciation journal; idempotent replay; reverse/reopen; sale and gain/loss; write-off and zero proceeds; register, depreciation, disposal, and reconciliation reports; CSV/PDF exports; close-readiness blocker observation and clearance; and cross-tenant category, asset, run, and report HTTP 403 checks.

The earlier smoke observed `scheduleLines: 12`, one posted depreciation line, a `POSTED` then `REVERSED` run, disposal `DISPOSED`, write-off `WRITTEN_OFF`, report counts of 16/156/8, non-empty CSV/PDF exports, and cross-tenant HTTP 403. Its reconciliation result was deliberately recorded as false because the burner already contained earlier diagnostic records.

A second marked lifecycle was executed against the corrected API deployment in the approved existing burner:

- Marker: `SMOKE-CLEAN-FA-20260715161407`.
- Three assets were capitalized; the marked sale became `DISPOSED`; the marked zero-proceeds write-off became `WRITTEN_OFF`; and the depreciation run became `POSTED`.
- Register/depreciation/disposal report counts were 22/204/10 for the whole burner; CSV length was 6,057 bytes; register/depreciation/reconciliation PDFs were 4,426/21,553/2,303 bytes.
- After PR #368, reconciliation returned `reconciled: true`: register and GL cost `15,950`, accumulated depreciation `625`, carrying value `15,325`, depreciation expense `425`, with all reported differences equal to `0`. This is a shared-burner reconciliation result, not a clean-ledger result.
- After PR #369, reviewed multi-line run `b7b42073-f1a2-4b0e-901c-cc0f78474ca2` posted successfully. A second marked period `7dfa19c3-6f4e-4f19-8d31-c8adbd6519a4` had a fixed-asset close blocker before posting (`FIXED_ASSET_DEPRECIATION_UNPOSTED`, count 2); marked run `ab260ca2-e3b4-41f5-b4ac-2f9af9bf7837` then posted with status `POSTED`, version `3`, and the fixed-asset readiness check changed to `FIXED_ASSETS_READY` / `INFORMATION`. Overall readiness decreased from 4 blockers to 3; the remaining blockers are outside this MVP.
- Two earlier 2099 diagnostic runs remain marked `REVIEWED` after an intentionally failed pre-#369 multi-line posting probe; they were not deleted through direct database mutation. Their presence is part of the shared-burner limitation.
- The continuation run did not claim a new cross-tenant result because it necessarily ran inside the existing approved organization. The earlier independent smoke recorded cross-tenant and stale-organization HTTP 403 results.

## Browser matrix evidence

Authenticated Playwright checks against the final web deployment and canonical alias `https://ledgerbyte-web-test.vercel.app` passed for `/fixed-assets`, `/reports/fixed-assets`, and `/fixed-assets/categories`:

- Desktop 1440×1000: correct headings, LTR/en, no horizontal overflow, named controls, skip-link first keyboard focus.
- Tablet 768×1024: correct headings, LTR/en, no horizontal overflow.
- Mobile 390×844: correct headings, LTR/en, no horizontal overflow.
- Mobile Arabic: fixed-asset register loaded with `dir=rtl`, `lang=ar`, and no horizontal overflow.
- Organization-state reset: the pre-fix run reproduced stale register data after an invalid organization-change event; PR #370 was deployed, and the final run retained no marked data after the same event (`retainedMarkedData: false`).
- The final browser run recorded zero console messages and zero page errors. Aborted RSC/API requests were observed during route transitions, but the tested routes rendered their expected headings and no API response error was surfaced in the page.
- Visual inspection covered the desktop register and mobile Arabic layout. This is browser evidence, not a claim of full WCAG conformance or an independent accessibility audit.

## Verification gates

- `corepack pnpm verify:ci:local` passed on merged `origin/main`: web typecheck, web Jest (`189` suites / `865` tests), web production build (`149` generated routes), and `git diff --check`.
- The targeted fixed-assets API suite passed earlier with `7` suites and `19` tests, including reconciliation reversal arithmetic and multi-line post/reversal restoration. API typecheck and production build also passed.

## Implementation boundaries

- Depreciation is straight-line only.
- Capitalization is full-line only; partial-line allocation is not implemented.
- Impairment, cost adjustments/revaluations, component accounting, automated recurring depreciation, multi-book depreciation, and external fixed-asset imports remain deferred.
- No provider integration, compliance approval, official serializer, money movement, production backup, PITR, or restore proof is implied.

## Backup and recovery boundary

- `corepack pnpm backup:restore-proof -- --json --strict --dry-run` passed as a synthetic boundary check with no network, database, secret, or real backup/restore execution.
- `corepack pnpm --filter @ledgerbyte/api backup:local-postgres-drill -- --mode plan --json` returned `LOCAL_POSTGRES_DR_PLAN_READY` and correctly blocked execution because no safe disposable database URL was supplied.
- No hosted Supabase backup, logical dump, restore, PITR, or object-storage recovery proof is claimed.

## Closeout limitation

This rollout remains **PARTIAL PASS**. The fixed-assets code, targeted tests, merged source, deployed API and web aliases, authenticated browser surface, exports, reconciliation correction, fixed-asset close-blocker clearance, and tenant-boundary evidence are present. Full completion is withheld because the approved burner is not a clean ledger, organization creation is currently a hosted HTTP 500, overall close readiness still has three non-fixed-asset blockers, and backup/restore proof remains synthetic or plan-only.
