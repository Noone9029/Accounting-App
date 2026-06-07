# ZATCA Custody Foundation CI Remediation

Date: 2026-06-07

## Scope

- Branch inspected: `codex/dev-12-generated-documents-storage-retention`
- Pull request: `#1 ZATCA key custody and CSID lifecycle metadata foundation`
- Starting commit: `1296175bde3db3903cb7007df3eba301fc06071c`
- Base inspected: `origin/main` at `5804dbd2110eaee2106468088e3059dcff806292`
- Failing workflow/job/step: `PR Verification` / `Non-mutating verification` / `Run local CI verification gate`
- Reported run id: `27089879334`

## Local Reproduction

The local gate was reproduced in component order:

- `git diff --check`: passed with LF-to-CRLF working-copy warnings only.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: failed before remediation.

First failing command: `corepack pnpm test`.

Failure summary:

- `apps/web/src/lib/permission-matrix.test.ts` reported five shared permissions missing from `PERMISSION_GROUPS`.
- `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts` used an older item mock without the tracking default fields now guaranteed by the item schema/service.

## Root Cause

The branch introduced or preserved shared permission keys and item tracking defaults, but two test fixtures/catalogs lagged behind those committed contracts:

- The role permission matrix did not group `customerPayments.applyUnapplied`, `customerPayments.reverseUnappliedAllocation`, `customerPayments.receiptPdf.generate`, `zatca.signing.dryRun`, or `zatca.submit`.
- A sales invoice rules test created an item service mock without `inventoryTracking`, `trackingMode`, `expiryTrackingEnabled`, and `binTrackingEnabled`, causing a status-only update to look like an invalid tracking payload at runtime.

## Fix Applied

- Added the missing permissions to the web role permission matrix with safe wording.
- Kept ZATCA wording limited to local dummy-material dry-runs and blocked clearance/reporting stubs; this does not enable real ZATCA networking, signing, clearance, reporting, or production compliance.
- Updated the stale API test mock to include metadata-only item tracking defaults.

## Checks Rerun

- `corepack pnpm test`: passed after the fix.
- `git diff --check`: passed with LF-to-CRLF working-copy warnings only.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed in the final gate sequence.
- `corepack pnpm build`: passed.
- `node --test scripts/test-credential-env.test.cjs`: passed.
- `corepack pnpm test:user-testing-cleanup-plan`: passed.
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json parse ok')"`: passed.

## Safety Boundaries Preserved

- No PR merge, auto-merge, force-push, or rebase was performed.
- No migrations were run or applied.
- No seed/reset/delete, deploy, provider/env change, production check, real ZATCA call, real OTP, real CSID, real credential, real private key, signing, clearance/reporting, PDF/A-3, export/download, browser login/audit-writing flow, or destructive cleanup was performed.
- Graphify output remains preserved on disk and ignored; no graphify artifacts were staged.
- Real ZATCA production compliance remains not enabled.

## Files Changed

- `apps/web/src/lib/permission-matrix.ts`
- `apps/api/src/sales-invoices/sales-invoice-rules.spec.ts`
- `docs/development/ZATCA_CUSTODY_FOUNDATION_CI_REMEDIATION.md`

## Remaining Blockers

- GitHub Actions must rerun on the pushed remediation commit.
- PR #1 must not be merged until required checks pass and merge approval is explicitly given.

Recommended next prompt: `LedgerByte verify ZATCA custody foundation PR checks after CI remediation`.
