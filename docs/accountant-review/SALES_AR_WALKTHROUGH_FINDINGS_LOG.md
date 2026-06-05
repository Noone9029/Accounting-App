# Sales/AR Walkthrough Findings Log

Prepared: 2026-06-04

This log is ready for accountant walkthrough findings. It intentionally contains no findings yet.

No findings are approved or implemented until reviewed and converted into bounded implementation tasks.

## Current Walkthrough Execution Status

Date: 2026-06-04

Execution sprint: Controlled Local Sales/AR Accountant Walkthrough Execution Sprint

Status:

- Local execution preflight completed.
- Marker planned: `SALES-AR-WALKTHROUGH-20260604`.
- Local sample data was not created.
- Browser walkthrough was not run.
- Accountant review was not performed.
- No accountant findings are recorded.
- No findings are approved.

Execution was blocked because local database/API/web services were not running, Docker was unavailable, safe local login was not verified, and no explicit write-capable execute approval existed. See:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXECUTION_PREFLIGHT.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

## Execution Defect Candidates

No Codex technical execution defect candidates were recorded in this sprint.

The current blockers are environment/preflight blockers, not verified product defects.

## Local Services Bring-up Status

Date: 2026-06-04

Execution sprint: Local Services Bring-up and Sales/AR Walkthrough Dry-run Sprint

Status:

- Local target configuration was verified as local at the inspected env-key level.
- Docker Desktop Linux engine was unavailable.
- Local Postgres, Redis, API, and web services were not reachable.
- API health/readiness and web root checks were unreachable.
- Safe local login was not verified.
- Fixture dry-run plan was documented.
- Fixture script was not added.
- Fixture dry-run was not run.
- No sample data was created.
- No browser walkthrough was run.
- No accountant review was performed.
- No accountant findings are recorded.
- No findings are approved.

Development blockers are recorded in:

- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_PREFLIGHT.md`
- `docs/development/SALES_AR_WALKTHROUGH_FIXTURE_DRY_RUN_PLAN.md`
- `docs/development/SALES_AR_LOCAL_SERVICES_BRINGUP_DRY_RUN_SPRINT_CLOSURE.md`

## Local Runtime Activation Dry-run Status

Date: 2026-06-05

Execution sprint: Controlled Local Runtime Activation and Sales/AR Fixture Dry-run Sprint

Status:

- Docker Desktop engine was available.
- Local Postgres, Redis, API, and web services were reachable.
- Local API health and readiness checks passed.
- Local web root/login route responded.
- Seed/demo login was verified against the local API without recording credentials, tokens, cookies, or auth headers.
- Guarded fixture dry-run script was added.
- Fixture dry-run was executed in dry-run mode only.
- Fixture dry-run printed fake planned records and counts only.
- No sample data was created.
- No fixture execute mode was run.
- No browser walkthrough was run.
- No accountant review was performed.
- No accountant findings are recorded.
- No findings are approved.

Runtime activation evidence is recorded in:

- `docs/development/SALES_AR_LOCAL_RUNTIME_ACTIVATION_DRY_RUN_CLOSURE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

## Local Fixture Execute Attempt Status

Date: 2026-06-05

Execution sprint: Local-Only Sales/AR Fixture Execute and Walkthrough Evidence Sprint

Status:

- Local Docker, Postgres, Redis, API, web, health, readiness, login route, and seed/demo login gates passed.
- Guarded fixture dry-run was rerun and passed.
- Guarded fixture execute mode was attempted locally with marker `SALES-AR-WALKTHROUGH-20260604`.
- Execute mode stopped before completion when the API rejected item creation because the selected sales tax rate was inactive or invalid for the active organization.
- No manual database mutation was attempted after the failure.
- No cleanup/delete was run.
- No browser walkthrough was run.
- No PDF generation was run.
- No accountant review was performed.
- No accountant findings are recorded.
- No findings are approved.

Technical execution blocker details are recorded in:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`
- `docs/development/SALES_AR_LOCAL_FIXTURE_EXECUTE_WALKTHROUGH_EVIDENCE_CLOSURE.md`

## Local Fixture Hardening Retry Status

Date: 2026-06-05

Execution sprint: Focused Local Sales/AR Fixture Hardening and Safe Execute Retry Sprint

Status:

- Local Docker, Postgres, Redis, API, web, health, readiness, login route, and seed/demo login gates passed.
- The fixture tax-rate selection defect was fixed in the local fixture script by requiring active `SALES` or `BOTH` scope.
- The fixture now validates read-only execute prerequisites before mutation.
- Hardened dry-run selected valid local prerequisites:
  - active sales VAT/tax rate with `SALES` scope
  - active posting revenue account
  - active bank account profile backed by a posting account
- Hardened dry-run blocked before execute because the local database schema was not current for the Sales/AR modules at that time.
- Execute retry was not run.
- No additional sample data was created.
- No cleanup/delete was run.
- No browser walkthrough was run.
- No PDF generation was run.
- No accountant review was performed.
- No accountant findings are recorded.
- No findings are approved.

Development blocker details are recorded in:

- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`
- `docs/development/SALES_AR_LOCAL_FIXTURE_HARDENING_EXECUTE_RETRY_CLOSURE.md`

## Local Schema Readiness Execute Retry Status

Date: 2026-06-05

Execution sprint: Local-Only Schema Readiness and Sales/AR Fixture Execute Retry Sprint

Status:

- Local Docker, Postgres, Redis, API, web, health, readiness, login route, and seed/demo login gates passed.
- Inspected env targets classified local-only without printing values.
- Pending local migrations were inspected before application.
- Local migrations were applied with `corepack pnpm db:migrate`.
- Prisma client generation initially hit a local Windows file lock from the running API process; the local API listener was stopped, generation succeeded, and the local API was restarted.
- Migration status then reported the local database schema is up to date.
- Sales/AR endpoint status-only checks returned HTTP `200`.
- Hardened fixture dry-run passed after schema readiness.
- One guarded local execute retry was attempted with marker `SALES-AR-WALKTHROUGH-20260604`.
- Execute retry stopped safely at `POST /customer-payments`.
- Safe error summary: `Paid-through account must be an active posting asset account in this organization.`
- Metadata-only marker scan found partial local synthetic records: one customer, two items, and three sales invoices.
- Customer payments, credit notes, refunds, sales quotes, recurring templates, delivery notes, collection cases, and generated documents were not created.
- No retry loop, manual mutation, cleanup/delete, seed/reset/delete, browser walkthrough, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or accountant review was run after the failure.
- No accountant findings are recorded.
- No findings are approved.

Development blocker details are recorded in:

- `docs/development/SALES_AR_LOCAL_SCHEMA_READINESS_PREFLIGHT.md`
- `docs/development/SALES_AR_LOCAL_SCHEMA_READINESS_EXECUTE_RETRY_CLOSURE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

## Local Fixture Payment-account Hardening Retry Status

Date: 2026-06-05

Execution sprint: Focused Local Sales/AR Fixture Payment-Account Hardening and Execute Retry Sprint

Status:

- Local Docker, Postgres, Redis, API, web, health, readiness, login route, and seed/demo login gates passed.
- Inspected env targets classified local-only without printing values.
- Customer payment and customer refund paid-through account requirements were diagnosed from product DTO/service validation.
- The fixture was hardened to keep the bank account profile as metadata and pass the linked active posting ASSET chart-of-account id for customer payment/refund `accountId`.
- Status-only Sales/AR endpoint checks returned HTTP `200`.
- Hardened fixture dry-run passed with marker `SALES-AR-WALKTHROUGH-20260604`.
- One guarded local execute retry was attempted.
- The execute retry passed the customer payment step and stopped safely at `POST /credit-notes/[id]/apply`.
- Safe error summary: `property note should not exist`.
- Metadata-only marker scan found partial local synthetic records: one customer, two items, three sales invoices, one customer payment, and one credit note.
- Refunds, sales quotes, recurring templates, delivery notes, collection cases, and generated documents were not created.
- No retry loop, manual mutation after failure, cleanup/delete, seed/reset/delete, browser walkthrough, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or accountant review was run after the failure.
- No accountant findings are recorded.
- No findings are approved.

Development blocker details are recorded in:

- `docs/development/SALES_AR_LOCAL_FIXTURE_PAYMENT_ACCOUNT_HARDENING_CLOSURE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

## Local Fixture Credit-note Application Hardening Execute Retry Status

Date: 2026-06-05

Execution sprint: Focused Local Sales/AR Fixture Credit-Note Application Hardening and Execute Retry Sprint

Status:

- The sprint initially hit a local runtime gate while Docker/local services were unavailable, then continued after Docker/local runtime was restored.
- Local Docker, Postgres, Redis, API, web, health, readiness, login route, local login, and `/auth/me` gates passed after runtime restoration.
- Inspected env targets classified local-only without printing values.
- Credit-note apply DTO/service shape was diagnosed.
- The fixture was hardened to send only `invoiceId` and `amountApplied` to `POST /credit-notes/[id]/apply`.
- Fixture dry-run passed with the credit-note apply payload shape validated.
- Exactly one guarded local execute retry was attempted.
- The execute retry progressed past credit-note application, created one marker-scoped credit-note allocation, created one marker-scoped customer refund, and created two marker-scoped sales quotes.
- The execute retry then stopped safely at a later fixture-side source-line lookup before recurring templates, delivery notes, collections, generated documents, browser walkthrough, PDF generation, or accountant review.
- Safe error summary: `Expected source document to include at least one line.`
- No retry loop, cleanup/delete, seed/reset/delete, manual database mutation after failure, browser walkthrough, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or accountant review was run.
- No accountant findings are recorded.
- No findings are approved.

The previously recorded credit-note apply request-shape blocker is resolved in the fixture and remains a development fixture defect candidate, not an accountant finding.

The new delivery/source-line lookup failure is a development fixture blocker, not an accountant finding and not a proven product API bug.

Development blocker details are recorded in:

- `docs/development/SALES_AR_LOCAL_FIXTURE_CREDIT_NOTE_APPLICATION_HARDENING_CLOSURE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

## Local Fixture Source-line Hardening Execute Retry Status

Date: 2026-06-05

Execution sprint: Focused Local Sales/AR Fixture Source-Line Hardening and Execute Retry Sprint

Status:

- Local Docker, Postgres, Redis, API, web, health, readiness, login route, local login, and `/auth/me` gates passed.
- Inspected env targets classified local-only without printing values.
- Sales/AR endpoint status-only checks returned HTTP `200`.
- Source-line DTO/service behavior was diagnosed from local code only.
- The fixture was hardened to fetch source sales invoice and source sales quote detail records before building source-linked delivery notes.
- The fixture now validates source document organization, customer, status, line presence, and delivery-note payload shape before delivery-note creation.
- Fixture dry-run passed and resolved one finalized source invoice line and one accepted quote source line.
- Exactly one guarded local execute retry was attempted.
- The execute retry stopped before delivery-note creation on existing partial credit-note allocation state.
- Safe error summary: the marker credit note no longer had enough unapplied amount for a second application attempt under partial marker data.
- Follow-up fixture hardening now reuses decimal-equivalent existing non-reversed credit-note allocations, but execute was not rerun in this sprint.
- No cleanup/delete, seed/reset/delete, manual database mutation after failure, browser walkthrough, PDF generation, email, payment gateway, VAT filing, ZATCA, backup/restore, hosted/beta/customer-data workflow, or accountant review was run.
- No accountant findings are recorded.
- No findings are approved.

The prior delivery/source-line lookup failure and the newly observed credit-note allocation idempotency failure are development fixture issues, not accountant findings and not proven product API bugs.

Development blocker details are recorded in:

- `docs/development/SALES_AR_LOCAL_FIXTURE_SOURCE_LINE_HARDENING_CLOSURE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EVIDENCE.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_ROUTE_STATUS.md`
- `docs/development/SALES_AR_LOCAL_WALKTHROUGH_EXPECTED_RESULTS_STATUS.md`

## Local Fixture Idempotency Execute Completion And Route Metadata Status

Date: 2026-06-05

Execution sprint: Local Sales/AR Fixture Idempotency Execute Completion and Route Metadata Walkthrough Sprint

Status:

- Local Docker, Postgres, Redis, API, web, health, readiness, login route, local login, and `/auth/me` gates passed.
- Inspected env targets classified local-only without printing values.
- The fixture dry-run passed and showed reuse for existing marker payment, credit note, credit-note allocation, refund, and quotes.
- Exactly one guarded local execute attempt was run.
- Execute completed with marker `SALES-AR-WALKTHROUGH-20260604`.
- Metadata-only marker scan found one customer, two items, five sales invoices, one payment, one credit note, one credit-note allocation, one refund, two quotes, one quote conversion, one recurring template, one generated recurring draft invoice, two delivery notes, two collection cases, four collection activities, and zero generated documents.
- Metadata-only route checks returned HTTP `200` for the local web/API routes recorded in the development evidence, except `/documents`, which was not run because generated-document count was `0`.
- No cleanup/delete, seed/reset/delete, manual database mutation outside the fixture, PDF generation, email, payment gateway, payment link, VAT filing, ZATCA call, backup/restore, hosted/beta/customer-data workflow, broad E2E, screenshot capture, or OS shutdown/restart/power command was run.
- No accountant review was performed.
- No accountant findings are recorded.
- No findings are approved.

The fixture idempotency completion is development evidence only. It is not accountant approval and not production/customer-data proof.

## Findings Table

| Finding ID | Date | Reviewer | Workflow area | Route/output | Severity | Finding type | Description | Expected behavior | Actual behavior | Screenshot/sample reference | Recommendation | Owner | Status | Decision needed | Implementation notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Allowed Severity Values

- BLOCKER
- HIGH
- MEDIUM
- LOW
- QUESTION

## Allowed Finding Types

- accounting logic
- wording
- status label
- PDF/document
- VAT/tax
- ZATCA wording
- customer ledger
- customer statement
- AR Aging
- dashboard threshold
- quote
- recurring invoice
- delivery note
- collections
- unsupported claim
- usability

## Recording Rules

- Do not invent findings.
- Do not mark findings approved in this log.
- Use fake sample references only.
- Store screenshots, PDFs, and videos outside the repo unless a separate safe artifact policy approves them.
- Do not include real customer/vendor data, sensitive notes, PDF bodies, base64, auth headers, cookies, tokens, DB URLs, secrets, signed XML, QR payloads, or provider credentials.
- Convert only concrete, bounded, reviewed findings into implementation tasks.
