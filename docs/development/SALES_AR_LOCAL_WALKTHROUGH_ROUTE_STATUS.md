# Sales/AR Local Walkthrough Route Status

Date: 2026-06-05

Marker planned: `SALES-AR-WALKTHROUGH-20260604`

Execution mode: local runtime activation, fixture dry-run, local schema readiness, fixture prerequisite hardening, idempotent local execute completion, and metadata-only local route walkthrough.

Status values:

- not run
- reviewed by Codex locally
- reviewed by accountant
- blocked
- not applicable

## Current Route Status

| Route | Status | Finding IDs linked | Notes |
| --- | --- | --- | --- |
| `/dashboard` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/dashboard/summary` `200`; no dashboard mutation was run. |
| `/customers` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/contacts` `200`; marker customer count `1`. |
| `/customers/[id]` | reviewed by Codex locally | None | Metadata-only check: web `200`, API detail `200` for the marker customer. |
| `/sales/invoices` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/sales-invoices` `200`; marker invoice count `5`. |
| `/sales/invoices/new` | reviewed by Codex locally | None | Metadata-only check: web `200`; no create action was submitted from the UI. |
| `/sales/invoices/[id]` | reviewed by Codex locally | None | Metadata-only check: web `200`, API detail `200` for a marker invoice. |
| `/sales/quotes` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/sales-quotes` `200`; marker quote count `2`. |
| `/sales/quotes/new` | reviewed by Codex locally | None | Metadata-only check: web `200`; no create action was submitted from the UI. |
| `/sales/quotes/[id]` | reviewed by Codex locally | None | Metadata-only check: web `200`, API detail `200` for the accepted marker quote. |
| `/sales/recurring-invoices` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/recurring-invoices` `200`; marker template count `1`. |
| `/sales/recurring-invoices/new` | reviewed by Codex locally | None | Metadata-only check: web `200`; no create action was submitted from the UI. |
| `/sales/recurring-invoices/[id]` | reviewed by Codex locally | None | Metadata-only check: web `200`, API detail `200`; generated recurring draft invoice count `1`. |
| `/sales/delivery-notes` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/delivery-notes` `200`; marker delivery note count `2`. |
| `/sales/delivery-notes/new` | reviewed by Codex locally | None | Metadata-only check: web `200`; no create action was submitted from the UI. |
| `/sales/delivery-notes/[id]` | reviewed by Codex locally | None | Metadata-only check: web `200`, API detail `200`; source invoice and source quote link counts were each `1`. |
| `/sales/collections` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/collections` `200`; marker collection case count `2`. |
| `/sales/collections/new` | reviewed by Codex locally | None | Metadata-only check: web `200`; no create action was submitted from the UI. |
| `/sales/collections/[id]` | reviewed by Codex locally | None | Metadata-only check: web `200`, API detail `200`; marker collection activity count `4`. |
| `/reports/aged-receivables` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/reports/aged-receivables` `200`; no report body was dumped. |
| `/reports/vat-summary` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/reports/vat-summary` `200`; no report body was dumped. |
| `/reports/vat-return` | reviewed by Codex locally | None | Metadata-only check: web `200`, API `/reports/vat-return` `200`; no report body was dumped. |
| `/tax` | reviewed by Codex locally | None | Metadata-only check: web `200`; tax authority submission was not run. |
| `/documents` | not run | None | Generated-document count was `0`; no PDF generation or document route check was performed. |

## Accountant Review Status

No route was reviewed by an accountant in this sprint.

## Codex Local Review Status

Codex performed a metadata-only local route walkthrough after the fixture execute completed.

Verified locally:

- API health/readiness.
- Web `/login`.
- Seed/demo login and `/auth/me` against the local API with token/password/cookie/header output suppressed.
- Sales/AR endpoint status checks.
- Fixture dry-run with idempotency reuse plan.
- One guarded fixture execute attempt.
- Read-only marker scan.
- Web and API route metadata checks listed above.

This is not accountant review, broad E2E, UI acceptance, PDF review, or approval.

## Current Execution Blocker

The previous local database schema blocker, payment account mapping blocker, credit-note apply request-shape blocker, source-line lookup blocker, and partial allocation idempotency blocker are resolved for the local fixture scope.

No current fixture-execute blocker was found in this sprint.

Remaining route-review limitations:

- `/documents` was not run because no generated-document rows were created.
- PDF metadata checks were skipped because PDF generation was not part of this sprint.
- Accountant wording/layout acceptance, tax title policy, official VAT filing wording review, and production/customer-data proof remain pending.

## Prior Blocked Status

The 2026-06-04 route status marked every route as blocked because local services were unavailable. That environment blocker is resolved for local runtime only. Full browser acceptance and accountant review remain pending.
