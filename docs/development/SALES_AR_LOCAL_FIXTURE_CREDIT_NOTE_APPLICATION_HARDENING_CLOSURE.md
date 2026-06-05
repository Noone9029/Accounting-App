# Sales/AR Local Fixture Credit-note Application Hardening Closure

Date: 2026-06-05

Sprint: Focused Local Sales/AR Fixture Credit-Note Application Hardening and Execute Retry Sprint

Marker: `SALES-AR-WALKTHROUGH-20260604`

## Summary

The local runtime safety gate initially failed while Docker Desktop was unavailable. After Docker/local runtime was restored, the safety gates passed, the credit-note apply DTO/service shape was diagnosed, the fixture was hardened to remove unsupported payload fields, dry-run passed, and exactly one guarded execute retry was attempted.

The execute retry progressed past credit-note application and refund/quote creation, then failed safely at a later fixture-side source-line lookup before recurring templates, delivery notes, collections, generated documents, PDF checks, browser walkthrough, or accountant review.

No production, beta, hosted, shared, or customer-data workflow was touched. No seed/reset/delete, cleanup/delete, repeated execute retry, email, payment gateway, payment link, VAT filing, ZATCA call, backup/restore, PDF generation, or deployed E2E was run.

## Safety Gates Result

Safety gates passed after Docker/local runtime was restored:

| Gate | Result |
| --- | --- |
| Docker engine | Passed; local Docker engine was available. |
| Local Postgres port `5432` | Listening locally. |
| Local Redis port `6379` | Listening locally. |
| Local API port `4000` | Listening locally. |
| Local web port `3000` | Listening locally. |
| `GET /health` | HTTP `200`. |
| `GET /readiness` | HTTP `200`. |
| `/login` | HTTP `200`. |
| Env target classification | Inspected keys classified local-only without printing values. |
| Remote target guard | No Supabase, Vercel, hosted, production, beta, user-testing, or unknown remote target was used. |
| Local login | Passed against local API only; password, token, cookies, and auth headers were suppressed. |
| Marker | Confirmed as `SALES-AR-WALKTHROUGH-20260604`. |

The first safety-gate check in this sprint failed before Docker was restored; no mutation was attempted during that failed gate.

## Credit-note Apply Request-shape Diagnosis

`POST /credit-notes/[id]/apply` is wired to the `ApplyCreditNoteDto` with only:

- `invoiceId`
- `amountApplied`

The credit-note service then validates that:

- the credit note belongs to the active organization
- the credit note is finalized
- the invoice belongs to the active organization
- the invoice belongs to the same customer
- the invoice is finalized
- the apply amount is positive
- the apply amount does not exceed the credit note unapplied amount
- the apply amount does not exceed the invoice outstanding balance

The previous failure was fixture-side: the fixture sent unsupported `note` to the strict apply DTO. Product validation was not weakened.

## Fixture Hardening Implemented

Updated `apps/api/scripts/sales-ar-walkthrough-fixture.ts`:

- removed unsupported `note` from the credit-note apply payload
- added a DTO-shaped credit-note apply payload builder
- added static unsupported-key validation for the apply payload
- added pre-apply validation against current credit note and invoice metadata
- validated organization, customer, status, positive amount, unapplied amount, and invoice balance before apply
- kept dry-run and execute on the same payload shape
- continued to preserve/reuse marker-scoped partial data where safe

No product API, backend service, database schema, web UI, accounting math, VAT logic, ZATCA behavior, generated-document behavior, or inventory behavior was changed.

## Credit-note Apply Validation Behavior

The fixture now validates before apply:

- active organization is resolved
- marker is present
- credit note and invoice exist before application
- credit note and invoice belong to the same organization when metadata is available
- credit note and invoice belong to the same customer when metadata is available
- credit note status is `FINALIZED`
- invoice status is `FINALIZED`
- apply amount is positive
- apply amount fits both credit-note unapplied amount and invoice balance
- payload keys are exactly `invoiceId` and `amountApplied`

If validation fails, the fixture stops before the apply request.

## Partial Marker Data Handling

The fixture preserved and reused existing marker-scoped data from previous partial executes:

- existing marker customer
- existing marker items
- existing marker sales invoices
- existing marker customer payment
- existing marker credit note

It did not delete, reset, cleanup, overwrite unrelated data, or manually mutate the database.

## Endpoint Status Checks

Status-only local endpoint checks passed with the local organization context before dry-run:

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
| `/credit-notes` | HTTP `200` |

Only HTTP status and safe summaries were recorded.

## Dry-run Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --dry-run --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: passed.
- Local target guard: passed.
- Active organization: resolved locally.
- Sales tax rate: active sales-valid rate selected.
- Revenue account: active posting revenue account selected.
- Payment posting account: active posting ASSET chart account selected.
- Credit-note apply payload shape: `invoiceId,amountApplied`.
- Unsupported credit-note apply keys: none.
- Partial marker data reuse plan: present.
- Created data: false.
- Database writes: false.
- Seed/reset/delete: false.
- Email, payment gateway, payment link, VAT filing, ZATCA, PDF generation, backup/restore, hosted/beta/customer-data workflow: not run.

## Execute Retry Result

Command:

```powershell
corepack pnpm --filter @ledgerbyte/api exec tsx scripts/sales-ar-walkthrough-fixture.ts --execute --marker SALES-AR-WALKTHROUGH-20260604
```

Result:

- Status: failed safely after one guarded execute retry.
- Prior credit-note apply blocker: cleared; the unsupported `note` error did not recur.
- Credit-note allocation evidence: one marker-scoped credit-note allocation exists.
- Later failure point: fixture-side source-line lookup while preparing delivery note source linkage.
- Safe error summary: `Expected source document to include at least one line.`
- Root cause candidate: `firstLineId` expects `entity.lines[0].id`, but the reused/list payload for a source invoice or accepted quote did not include line details.
- Retry loop: not run.
- Manual database mutation after failure: not run.

## Created Counts

Metadata-only local marker scan after the execute retry:

| Area | Marker-scoped local synthetic records |
| --- | ---: |
| Customers | 1 |
| Items | 2 |
| Sales invoices | 3 |
| Customer payments | 1 |
| Credit notes | 1 |
| Credit-note allocations | 1 |
| Customer refunds | 1 |
| Sales quotes | 2 |
| Recurring invoice templates | 0 |
| Delivery notes | 0 |
| Collection cases | 0 |
| Generated documents | 0 |

The full fixture data set is still incomplete. No cleanup/delete was run.

## Credit-note Application Evidence

The previous `property note should not exist` error did not recur.

Read-only marker scan found:

- credit notes: `1`
- credit-note allocations: `1`
- customer refunds: `1`
- sales quotes: `2`

This shows the fixture progressed beyond credit-note application and refund/quote steps before reaching the later delivery-note source-line blocker.

## Route And Checkpoint Updates

Updated:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

Routes remain not browser-reviewed. Technical metadata moved forward only where actually verified. No route was reviewed by an accountant.

## Findings Log Status

Updated:

- `docs/accountant-review/SALES_AR_WALKTHROUGH_FINDINGS_LOG.md`

No accountant findings were recorded. No findings were approved.

The unsupported credit-note apply payload was recorded as a development fixture defect candidate, not an accountant finding. The new `firstLineId` source-line blocker is also a development fixture defect candidate, not an accountant finding.

## Product/API/Backend Changes

No product API or backend service validation was changed.

The only code change was the local walkthrough fixture script:

- `apps/api/scripts/sales-ar-walkthrough-fixture.ts`

## Safety Boundaries

This sprint did not run:

- seed/reset/delete
- cleanup/delete
- repeated execute retry
- manual database mutation after failure
- production, beta, hosted, shared, or customer-data workflow
- real email
- payment gateway capture or payment links
- VAT filing
- ZATCA calls
- backup/restore
- PDF generation
- browser walkthrough
- deployed E2E

## Validation Commands And Results

| Command/check | Result |
| --- | --- |
| `git status --short --branch` | Completed; worktree is dirty from prior Sales/AR work. `apps/web/src/app/marketing.test.tsx` remains untracked and unrelated. |
| Docker availability check | Passed after Docker/local runtime was restored. |
| Local port checks for `5432`, `6379`, `4000`, `3000` | Passed after local runtime was restored. |
| `GET http://localhost:4000/health` | HTTP `200`. |
| `GET http://localhost:4000/readiness` | HTTP `200`. |
| `GET http://localhost:3000/login` | HTTP `200`. |
| Env target classification | Inspected keys classified local-only without printing values. |
| Local login and `/auth/me` | Passed without printing password, token, cookies, or auth headers. |
| Local endpoint status checks | Passed for Sales/AR, contacts, items, tax-rates, accounts, customer-payments, and credit-notes endpoints. |
| Fixture dry-run command | Passed. |
| Fixture execute command | Ran exactly once; failed safely at later `firstLineId` source-line blocker. |
| Read-only marker scan | Completed; count-only evidence recorded. |
| `git diff --check` | See final response for latest result. |

## Marketing Typecheck Blocker

`apps/web/src/app/marketing.test.tsx` remains unrelated untracked marketing work and was not modified.

Repo-wide web typecheck remains blocked by that unrelated file, which previously reports `HomePage` as `() => void` at lines `35` and `65`.

## Remaining Blockers

- The fixture must fetch detail payloads or otherwise resolve source line IDs before creating delivery notes.
- Recurring template, generated draft invoice, delivery notes, collection cases, generated documents, dashboard attention coverage, route walkthrough, PDF metadata checks, accountant review, tax review, and findings triage remain pending.
- The current local marker data is partial and preserved by default.

## Recommended Next Sprint

Run a focused local fixture source-line hardening sprint: make the fixture resolve invoice/quote detail records before delivery-note source linkage, rerun dry-run, attempt exactly one guarded local execute, then capture marker-scoped metadata only if it progresses.

## Follow-up Status

2026-06-05 follow-up:

- The source-line hardening sprint added detail-record resolution for source invoice and source quote lines.
- Hardened dry-run now resolves one finalized source invoice line and one accepted source quote line.
- The single guarded source-line execute retry stopped before delivery-note creation on existing partial credit-note allocation state.
- See `docs/development/SALES_AR_LOCAL_FIXTURE_SOURCE_LINE_HARDENING_CLOSURE.md`.
