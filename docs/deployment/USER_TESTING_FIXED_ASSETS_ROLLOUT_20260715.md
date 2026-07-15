# Fixed Assets MVP: Burner Rollout Evidence

Status: **PARTIAL PASS for the approved burner/user-testing environment.** The implementation and browser surface are present, but this is not a clean-ledger or production-readiness sign-off because the approved burner contains prior diagnostic data and its close-readiness query exceeded the smoke timeout.

Scope is limited to Supabase project `xynelbjqcmbgtscfmmzv`, Vercel projects `ledgerbyte-api-test` and `ledgerbyte-web-test`, and the approved aliases below. This document does not claim production, compliance, provider, money-movement, backup, restore, or official e-invoicing proof.

## Source, merge, and review evidence

- Fixed-assets implementation and follow-up fixes are merged through PRs #363, #364, #365, and #366.
- Current merged `origin/main`: `61e05c6ffeac3e50e0a98b264389f5faef09dc6a`.
- PR #366 (`af2346ef`) corrected reconciliation to exclude disposed and written-off historical assets from current-balance aggregation. It merged as `61e05c6f`.
- PR #366 passed GitHub Non-mutating verification and GitGuardian security checks. No GitHub human review was recorded for PR #366; local self-review found no Critical or Important findings. This is reported as a review limitation, not as independent approval.

## Supabase and migration evidence

- Additive disposal-evidence and disposal-review migrations were applied to project `xynelbjqcmbgtscfmmzv`; remote migration/schema read-back confirmed the disposal-review columns and movement proceeds/gain/loss columns.
- The approved user-testing account and original smoke organization remain the only confirmed membership context. A new organization-create attempt returned hosted HTTP 500 before a new organization could be provisioned, so the clean smoke had to remain in the approved existing burner.
- All smoke data is marked `SMOKE-CLEAN-FA-*` or `SMOKE-*`. No protected root artifact or production tenant was used.

## Deployments

| Surface | Deployment | State | Alias |
| --- | --- | --- | --- |
| API | `dpl_GwoUS3LstjGEDtgYkn5t81AJCxhe` | READY / production | `https://ledgerbyte-api-test.vercel.app` |
| Web | `dpl_9NhGMQLEfoQ1ntcpCwu2dKyA4pZA` | READY / production | `https://ledgerbyte-web-test.vercel.app` |

Observed public checks after the merged API deployment: API `/`, `/health`, and `/readiness` returned HTTP 200; protected fixed-assets access without credentials returned HTTP 401. The web alias loaded the authenticated fixed-assets routes used below.

## API and hosted smoke evidence

The earlier marked API smoke covered the functional matrix items 1–29: category/account mapping; manual acquisition and balanced posting; finalized bill and full-line capitalization; duplicate rejection; foreign-currency evidence preservation; opening import; depreciation preview/review/post; balanced depreciation journal; idempotent replay; reverse/reopen; sale and gain/loss; write-off and zero proceeds; register, depreciation, disposal, and reconciliation reports; CSV/PDF exports; close-readiness blocker observation; and cross-tenant/stale-organization HTTP 403 checks.

The earlier smoke observed `scheduleLines: 12`, one posted depreciation line, a `POSTED` then `REVERSED` run, disposal `DISPOSED`, write-off `WRITTEN_OFF`, report counts of 16/156/8, non-empty CSV/PDF exports, and cross-tenant HTTP 403. Its reconciliation result was deliberately recorded as false because the burner already contained earlier diagnostic records.

A second marked lifecycle was executed against the corrected API deployment in the approved existing burner:

- Marker: `SMOKE-CLEAN-FA-20260715161407`.
- Three assets were capitalized; the marked sale became `DISPOSED`; the marked zero-proceeds write-off became `WRITTEN_OFF`; and the depreciation run became `POSTED`.
- Register/depreciation/disposal report counts were 22/204/10 for the whole burner; CSV length was 6,057 bytes; register/depreciation/reconciliation PDFs were 4,426/21,553/2,303 bytes.
- Reconciliation returned `reconciled: false` with cost difference `0`, accumulated-depreciation difference `0`, and depreciation-expense difference `700`. The remaining difference is attributed to older active diagnostic records in the shared burner; it is not presented as a clean-ledger result.
- The accounting-close readiness endpoint exceeded the 25-second smoke timeout before and after depreciation. No readiness transition is claimed from this run.
- The continuation run did not claim a new cross-tenant result because it necessarily ran inside the existing approved organization. The earlier independent smoke recorded cross-tenant and stale-organization HTTP 403 results.

## Browser matrix evidence

Authenticated Playwright checks against `https://ledgerbyte-web-test.vercel.app` passed for `/fixed-assets`, `/reports/fixed-assets`, and `/fixed-assets/categories`:

- Desktop 1440×1000: correct headings, LTR/en, no horizontal overflow, named controls, skip-link first keyboard focus.
- Tablet 768×1024: correct headings, LTR/en, no horizontal overflow.
- Mobile 390×844: correct headings, LTR/en, no horizontal overflow.
- Mobile Arabic: fixed-asset register loaded with `dir=rtl`, `lang=ar`, and no horizontal overflow.
- Organization-state reset: stale organization state was cleared after the organization-change event; marked data was not retained in the stale state.
- Final browser run recorded zero console messages and zero page errors. The only failed-request records were aborted Next.js RSC prefetches during navigation; no API or page-load failure was observed.
- Visual inspection covered the desktop register and mobile Arabic layout. This is browser evidence, not a claim of full WCAG conformance or an independent accessibility audit.

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

This rollout remains **PARTIAL PASS**. The fixed-assets code, targeted tests, merged source, deployed API, authenticated browser surface, exports, and tenant-boundary evidence are present. Full completion is withheld until a clean marked organization or otherwise isolated clean ledger can prove reconciliation and the before/after close-readiness transition, plus an independent review record if that is required by the release gate.
