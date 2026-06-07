# Sales/AR Local Fixture Payment Account Hardening Closure

Date: 2026-06-05

Sprint: Focused Local Sales/AR Fixture Payment-Account Hardening and Execute Retry Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Summary

The local safety gates passed, the customer payment paid-through account requirement was diagnosed, and the local Sales/AR walkthrough fixture was hardened so customer payments and refunds use an active posting ASSET chart-of-account id instead of a bank account profile id.

The hardened dry-run passed. One guarded execute retry was attempted after dry-run passed. That execute retry got past the previous customer payment blocker, created marker-scoped local synthetic payment and credit-note records, then failed safely at credit-note application because the fixture sent an unsupported `note` field.

No retry loop was run. No cleanup/delete was run. No accountant findings were recorded or approved.

## Safety Gates Result

Passed before fixture edit, dry-run, and execute retry:

- Docker engine was available.
- Local Postgres was listening on port `5432`.
- Local Redis was listening on port `6379`.
- Local API was reachable on `http://localhost:4000`.
- Local web was reachable on `http://localhost:3000`.
- `GET /health` returned HTTP `200`.
- `GET /readiness` returned HTTP `200`.
- `/login` returned HTTP `200`.
- Seed/demo login and `/auth/me` succeeded against the local API.
- Passwords, tokens, cookies, auth headers, DB URLs, and secrets were not recorded.
- Inspected env target keys classified as local-only.
- No Supabase, Vercel, production, staging, beta, user-testing, hosted, shared, or unknown remote target was used.

## Customer Payment Paid-through Account Diagnosis

The fixture failure from the previous sprint was caused by fixture account mapping, not product validation:

- `CreateCustomerPaymentDto.accountId` is a chart-of-account id.
- `CustomerPaymentService` validates the paid-through account as active, posting-enabled, type `ASSET`, and scoped to the organization.
- `CreateCustomerRefundDto.accountId` and `CustomerRefundService` use the same chart-account requirement for paid-from accounts.
- `BankAccountProfile.id` is not accepted for those fields.
- `BankAccountProfile.accountId` and the included linked `account.id` point to the required chart-of-account record.

## Fixture Hardening Implemented

Updated:

- `apps/api/scripts/sales-ar-walkthrough-fixture.ts`

Changes:

- Added a separate `paymentAccount` fixture preflight field.
- Kept the selected bank account profile as metadata only.
- Resolved the linked active posting ASSET chart account from the bank profile/account list.
- Required bank profile selection to be active and linked to an active posting ASSET account.
- Required payment account selection to satisfy the same active/posting/ASSET conditions expected by customer payment/refund services.
- Updated dry-run output to show both bank profile metadata and paid-through posting asset account metadata.
- Updated customer payment and customer refund fixture payloads to pass `paymentAccount.id`.

No customer payment service, customer refund service, DTO, accounting, posting, tax, ZATCA, email, payment gateway, inventory, permissions, or production infrastructure behavior changed.

## Payment Account Validation Behavior

Before execute mutation, the fixture now requires:

- active local session and organization
- marker present
- active sales tax rate with `SALES` or `BOTH` scope
- active posting revenue account
- active bank/cash profile backed by a posting asset account
- active posting ASSET chart account for customer payment/refund `accountId`
- ready prerequisite endpoints
- local target guard passing

If these prerequisites fail, execute is blocked before mutation.

## Partial Marker Data Handling

Existing partial marker data was preserved and reused where the fixture could safely match by marker/fake identifier:

- Existing marker customer was reused.
- Existing marker items were reused.
- Existing marker sales invoices were reused.

No marker cleanup/delete was run. No database reset was run. No existing unrelated data was overwritten.

## Endpoint Status Checks

Status-only local checks before dry-run:

| Endpoint | Status |
| --- | --- |
| `/sales-invoices` | HTTP `200` |
| `/sales-quotes` | HTTP `200` |
| `/recurring-invoices` | HTTP `200` |
| `/delivery-notes` | HTTP `200` |
| `/collections` | HTTP `200` |
| `/collections/summary` | HTTP `200` |
| `/dashboard/summary` | HTTP `200` |
| `/contacts` | HTTP `200` |
| `/items` | HTTP `200` |
| `/tax-rates` | HTTP `200` |
| `/accounts` | HTTP `200` |
| `/customer-payments` | HTTP `200` |

No full JSON bodies, customer data, tokens, cookies, auth headers, DB URLs, or secrets were recorded.

## Dry-run Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: passed.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Selected tax rate: `VAT on Sales 15%`, rate `15`, scope `SALES`, active.
- Selected sales revenue account: code `411`, type `REVENUE`, active, posting-enabled.
- Selected bank profile: type `BANK`, status `ACTIVE`, linked account code `112`.
- Selected paid-through posting asset account: code `112`, type `ASSET`, active, posting-enabled.
- Existing marker metadata was reported from read-only endpoint scans.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.

## Execute Retry Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: failed safely.
- Failure point: `POST /credit-notes/[id]/apply`.
- Safe error summary: `property note should not exist`.
- Previous customer payment paid-through account blocker: resolved for this execute attempt.
- Retry count after this failure: `0`.
- Manual database mutation after this failure: not performed.
- Cleanup/delete after this failure: not performed.
- Seed/reset/delete: not performed.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflows: not run.

## Created Counts

Metadata-only marker scan after the failed execute retry:

| Area | Marker-scoped local synthetic records |
| --- | ---: |
| Customers | 1 |
| Items | 2 |
| Sales invoices | 3 |
| Customer payments | 1 |
| Credit notes | 1 |
| Customer refunds | 0 |
| Sales quotes | 0 |
| Recurring invoice templates | 0 |
| Delivery notes | 0 |
| Collection cases | 0 |
| Generated documents | 0 |

The partial marker-scoped local data is preserved by default.

## Route And Checkpoint Updates

Updated:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

Routes remain blocked for walkthrough completion because the fixture did not create the full synthetic data set. No browser route was reviewed and no route was accountant-reviewed.

Expected-result checkpoints remain not run or blocked. No checkpoint was accountant-approved.

## Findings Log Status

Updated:

- `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`

No accountant reviewed the walkthrough in this sprint. No accountant findings were recorded or approved.

The payment-account fixture fix and the new credit-note apply blocker are development execution evidence only.

## Product/API/Backend Changes

Fixture script only:

- `apps/api/scripts/sales-ar-walkthrough-fixture.ts`

No product API/service validation changed.

No accounting calculation, posting behavior, invoice balance logic, payment allocation logic, credit-note product behavior, refund product behavior, VAT math, ZATCA behavior, email behavior, inventory behavior, permissions, schema, migration, seed, reset, delete, production infrastructure, hosted, beta, or customer-data behavior changed.

## Validation Commands

Run:

- `git status --short --branch`
- `docker version --format '{{.Server.Version}}'`
- Local port checks for `5432`, `6379`, `4000`, and `3000`
- `GET http://localhost:4000/health`
- `GET http://localhost:4000/readiness`
- `GET http://localhost:3000/login`
- Local seed/demo login and `/auth/me` with password, token, cookies, and auth headers suppressed
- Env target classification for local-only keys without printing values
- Status-only checks for Sales/AR endpoints and `/customer-payments`
- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604`
- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604`
- Metadata-only marker scan
- `git diff --check`

Final `git diff --check` result is recorded in the final sprint response.

## Marketing Blocker Status

Repo-wide web typecheck remains blocked by unrelated untracked marketing work:

- `apps/web/src/app/marketing.test.tsx`
- Known error from prior sprints: `HomePage` is reported as `() => void` at lines `35` and `65`.

This sprint did not touch, delete, stage, or modify marketing files.

## Remaining Blockers

- The fixture must be hardened in a future sprint so credit-note application uses the supported request shape and omits the unsupported `note` field unless the API explicitly supports it.
- The full marker-scoped Sales/AR sample data set is still incomplete.
- Browser route walkthrough has not run.
- Expected-results checkpoint review has not run.
- No accountant review has occurred.
- No accountant findings exist.

## Recommended Next Sprint

Run a focused local-only fixture credit-note-application hardening sprint:

- Diagnose the credit-note apply DTO/service request shape.
- Update the fixture only if the fixture request is wrong.
- Rerun local gates and dry-run.
- Attempt exactly one guarded execute retry if dry-run passes.
- Preserve existing marker data and do not cleanup/delete.
- Continue to avoid production, hosted, beta, customer data, real email, payment gateway, VAT filing, ZATCA, seed/reset/delete, backup/restore, and deployed E2E behavior.
