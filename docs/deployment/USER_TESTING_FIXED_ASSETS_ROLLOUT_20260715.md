# Fixed Assets MVP: Burner Rollout Evidence

Status: **PARTIAL PASS for the approved burner/user-testing environment.**

Scope is limited to Supabase project `xynelbjqcmbgtscfmmzv`, Vercel projects `ledgerbyte-api-test` and `ledgerbyte-web-test`, and the approved aliases below. This is not production, compliance, backup, restore, or official-provider proof.

## Source and merge evidence

- Fixed-assets MVP and follow-up fixes are merged through PR #363 and PR #364.
- Current merged `origin/main` source commit: `80578951d9e4bf58e07015ab1f56cfd7f94096fa`.
- PR #364 corrected hosted depreciation-run preview persistence and changed empty-run posting from an unhandled 500 to a controlled business error. Local focused service tests passed 3/3 and API typecheck passed.

## Supabase evidence

- Additive migrations for disposal evidence and disposal review were applied successfully to project `xynelbjqcmbgtscfmmzv`.
- Remote migration ledger and schema read-back confirmed the new `FixedAsset` disposal-review columns and `FixedAssetMovement` proceeds/gain/loss columns.
- Approved user/membership read-only verification found exactly one user and one active membership for the smoke organization.
- The burner password was repaired only through a guarded transaction; the replacement credential is not stored in the repository or this document.

## Vercel evidence

| Surface | Deployment | State | Alias |
| --- | --- | --- | --- |
| API | `dpl_4rnud3hqVSkXnAyaVxxgKedLSuXU` | READY / production | `https://ledgerbyte-api-test.vercel.app` |
| Web | `dpl_9NhGMQLEfoQ1ntcpCwu2dKyA4pZA` | READY / production | `https://ledgerbyte-web-test.vercel.app` |

Observed public checks after the merged API deployment:

- API `/`, `/health`, and `/readiness`: HTTP 200.
- Web `/`, `/login`, `/dashboard`, `/fixed-assets`, `/reports/fixed-assets`, and `/accounting-close`: HTTP 200.
- API protected fixed-assets and report endpoints without credentials: HTTP 401.

## Authenticated API smoke evidence

The approved burner credential was repaired and authenticated API smoke was executed with marked disposable data.

- Manual fixed-asset lifecycle: draft -> review -> capitalize -> schedule -> depreciation preview -> review -> post -> reverse -> reopened schedule.
- Disposal lifecycle: disposal review evidence -> sale with proceeds -> gain evidence -> reversal.
- Write-off lifecycle: zero proceeds -> reviewed write-off -> `WRITTEN_OFF`.
- Opening-balance import: one valid row, committed locally with status `COMMITTED_LOCAL`.
- Purchase-bill lifecycle: finalized with journal evidence -> capitalization candidate -> active fixed asset; duplicate capitalization returned HTTP 409.
- Reports: register, depreciation, disposals, and reconciliation JSON; register CSV; register/depreciation/reconciliation PDFs all returned successfully. Observed PDF sizes were 4017, 17319, and 2306 bytes.
- Close-readiness endpoint returned four blockers and one warning for the selected burner period.
- Cross-tenant fixed-asset access and stale-organization list access both returned HTTP 403.

The observed burner reconciliation result was `reconciled: false` because the approved tenant contains earlier diagnostic smoke records. This is not presented as a clean-ledger reconciliation result.

## Remaining proof boundary

This document does not claim completion of the full 32-step browser matrix. The real-browser DevTools MCP and `agent-browser` executable were not configured in this operator session, so desktop/tablet/mobile screenshots, Arabic RTL interaction, keyboard traversal, live console/overflow checks, stale-response UI behavior, and authenticated browser UX remain unproven here. Local focused web tests and production build passed, but they do not replace that hosted visual/browser evidence.

Do not promote this document to production readiness, compliance approval, backup/restore proof, or full authenticated/browser fixed-asset workflow proof without completing that remaining browser matrix and resolving the burner reconciliation state if a clean reconciliation claim is required.
