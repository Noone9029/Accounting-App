# Fixed Assets MVP: Burner Rollout Evidence

Status: **PASS for the fixed-assets scope in the approved burner/user-testing environment.** The implementation, accounting fixes, clean-organization hosted API proof, and authenticated browser surface are present. This is not a production-readiness, compliance, backup/recovery, or full-close sign-off; the shared burner still contains prior diagnostic data and non-fixed-asset close blockers remain.

Scope is limited to Supabase project `xynelbjqcmbgtscfmmzv`, Vercel projects `ledgerbyte-api-test` and `ledgerbyte-web-test`, and the approved aliases below. This document does not claim production, compliance, provider, money-movement, backup, restore, or official e-invoicing proof.

## Source, merge, and review evidence

- Fixed-assets implementation and follow-up fixes are merged through PRs #363, #364, #365, #366, #368, #369, #370, #371, #372, #373, and #374.
- Current merged `origin/main`: `bf369ceba4593d024dcc637cb97bb82523d9572a`.
- PR #368 (`8005bc79`) corrected reconciliation to net depreciation reversals while excluding disposed and written-off historical assets from current-balance aggregation.
- PR #369 (`5c47284a`) corrected multi-line depreciation posting and reversal so each asset is updated once by the aggregated run amount and exact restoration is preserved.
- PR #370 (`af4e19f8`) corrected the web register's organization transition state: prior rows are cleared immediately and late responses cannot repopulate a previous tenant's register.
- PR #372 (`1ebe7b7e`) batched default-role and foundation-account provisioning, reducing organization-create round trips; a clean organization then provisioned with HTTP 201.
- PR #373 (`6a07082f`) batched straight-line schedule generation with `createMany`.
- PR #374 (`bf369ceb`) batched depreciation post/reversal schedule updates and movement inserts while preserving per-line evidence and row-count checks.
- Independent reviews of the #372, #373, and #374 changes found no Critical or Important findings. The reviews recorded only pre-existing limitations: organization-create retry idempotency, a reversal predicate outside the patch, and unit tests not being a substitute for concurrent integration tests. All PR checks passed GitHub Non-mutating verification and GitGuardian security checks.

## Supabase and migration evidence

- Additive disposal-evidence and disposal-review migrations were applied to project `xynelbjqcmbgtscfmmzv`; remote migration/schema read-back confirmed the disposal-review columns and movement proceeds/gain/loss columns.
- PR #372 was deployed and a new organization was created successfully through the approved API alias with HTTP 201. The final clean smoke organization was `d525baa6-bc9d-45a0-b9d4-b867918b50f2`, with open fiscal period `f74043b3-81c8-416e-9b6f-49f0e4a22ba0` (`2026`).
- Earlier provisioning and schedule-timeout failures were retained as diagnostic evidence: the first organization-create attempt hit the old 30-second transaction ceiling, and the first clean depreciation preview hit the pre-#373 per-row schedule insert ceiling. Neither failure was bypassed; both were corrected in merged PRs #372 and #373.
- All smoke data is marked `SMOKE-CLEAN-FA-*` or `SMOKE-*`. No protected root artifact or production tenant was used.

## Deployments

| Surface | Deployment | State | Alias |
| --- | --- | --- | --- |
| API | `dpl_9xC8cNziAJeVSXbSpstXG7txfrUV` | READY / production | `https://ledgerbyte-api-test.vercel.app` |
| Web | `dpl_87moFnjjBpesJ2p8k2exWoegdv5N` | READY / production | `https://ledgerbyte-web-test.vercel.app` |

Observed public checks after the merged API deployment: API `/`, `/health`, and `/readiness` returned HTTP 200; protected fixed-assets access without credentials returned HTTP 401. The web alias loaded the authenticated fixed-assets routes used below.

## API and hosted smoke evidence

The clean API smoke covered matrix items 1–29: category/account mapping; manual acquisition and balanced posting; finalized bill and full-line capitalization; duplicate rejection; foreign-currency evidence preservation; opening import; depreciation preview/review/post; balanced depreciation journal; idempotent replay; reverse/reopen; sale and gain/loss; write-off and zero proceeds; register, depreciation, disposal, and reconciliation reports; CSV/PDF exports; close-readiness endpoint checks; and cross-tenant category, asset, run, and report HTTP 403 checks.

The earlier smoke observed `scheduleLines: 12`, one posted depreciation line, a `POSTED` then `REVERSED` run, disposal `DISPOSED`, write-off `WRITTEN_OFF`, report counts of 16/156/8, non-empty CSV/PDF exports, and cross-tenant HTTP 403. Its reconciliation result was deliberately recorded as false because the burner already contained earlier diagnostic records.

A second marked lifecycle was executed against the corrected API deployment in the approved existing burner:

- Marker: `SMOKE-CLEAN-FA-20260715161407`.
- Three assets were capitalized; the marked sale became `DISPOSED`; the marked zero-proceeds write-off became `WRITTEN_OFF`; and the depreciation run became `POSTED`.
- Register/depreciation/disposal report counts were 22/204/10 for the whole burner; CSV length was 6,057 bytes; register/depreciation/reconciliation PDFs were 4,426/21,553/2,303 bytes.
- After PR #368, reconciliation returned `reconciled: true`: register and GL cost `15,950`, accumulated depreciation `625`, carrying value `15,325`, depreciation expense `425`, with all reported differences equal to `0`. This is a shared-burner reconciliation result, not a clean-ledger result.
- After PR #369, reviewed multi-line run `b7b42073-f1a2-4b0e-901c-cc0f78474ca2` posted successfully. A second marked period `7dfa19c3-6f4e-4f19-8d31-c8adbd6519a4` had a fixed-asset close blocker before posting (`FIXED_ASSET_DEPRECIATION_UNPOSTED`, count 2); marked run `ab260ca2-e3b4-41f5-b4ac-2f9af9bf7837` then posted with status `POSTED`, version `3`, and the fixed-asset readiness check changed to `FIXED_ASSETS_READY` / `INFORMATION`. Overall readiness decreased from 4 blockers to 3; the remaining blockers are outside this MVP.
- Two earlier 2099 diagnostic runs remain marked `REVIEWED` after an intentionally failed pre-#369 multi-line posting probe; they were not deleted through direct database mutation. Their presence is part of the shared-burner limitation.

The final clean-organization smoke was run against API deployment `dpl_9xC8cNziAJeVSXbSpstXG7txfrUV`:

- Organization provisioning returned HTTP 201; the account mapping category used posting accounts `130`, `120`, `511`, `411`, and `512`.
- A marked purchase bill finalized with a posted balanced journal; the full eligible line capitalized once, and the second capitalization attempt returned HTTP 409. A foreign-currency asset without source evidence returned HTTP 400.
- The reviewed opening-balance CSV committed locally with zero validation errors (`COMMITTED_LOCAL`). Three manual assets were reviewed and capitalized with balanced acquisition journals.
- Depreciation preview returned a positive straight-line monthly run; preview replay returned the same run; review, post, idempotent post replay, reverse, exact restoration, and repost all completed. The clean run exercised the batched schedule and movement paths introduced by PRs #373 and #374.
- The marked sale is `DISPOSED` with positive gain and balanced journal `8128f4e7-2195-49db-a9fb-f012b8bf11eb` (debit/credit `900/900`). The zero-proceeds write-off is `WRITTEN_OFF` with loss `550` and balanced journal `f99696ca-e0b5-4be0-8cb2-d877fd7ed5c2` (debit/credit `600/600`).
- Final reconciliation returned `reconciled: true`; register and GL cost were `3700`, accumulated depreciation `483.3334`, depreciation expense `358.3334`, and all differences were `0`.
- JSON report endpoints returned HTTP 200. CSV exports were non-empty at 1,556 / 18,316 / 746 / 115 bytes; PDF exports were non-empty at 2,499 / 8,315 / 2,278 bytes for register / depreciation / reconciliation. Final close-readiness returned HTTP 200, and fixed-assets/categories/assets/depreciation-runs/reconciliation all returned HTTP 403 with a foreign organization header.

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
- The merged PR #374 non-mutating verification passed; the independent review recorded `7` fixed-asset suites / `19` tests, and the local API typecheck plus focused fixed-asset tests passed after the batching changes. API production deployment build completed successfully.

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

This rollout is **PASS for the fixed-assets scope in the approved burner/user-testing environment**. The fixed-assets code, targeted tests, merged source, deployed API and web aliases, authenticated browser surface, clean-organization lifecycle, exports, reconciliation, fixed-asset close-readiness evidence, and tenant-boundary evidence are present. The shared burner remains non-clean because it contains prior diagnostic records; overall close readiness still has three non-fixed-asset blockers; and backup/restore proof remains synthetic or plan-only. None of those boundaries is represented as production, compliance, PITR, RPO/RTO, or disaster-recovery proof.
