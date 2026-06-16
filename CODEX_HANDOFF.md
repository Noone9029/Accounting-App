# LedgerByte Codex Handoff

## Latest Commit Inspected

- Branch: `feature/ui-stitch-frontend-foundation-hardening`.
- Base: fresh `origin/main` at `90d617697a94aa34f7d6c20bb6d3b0b738d816ee` after PR `#53` payment workflow shadcn migration was merged.
- Original ZATCA request-body stash remains preserved in `stash@{0}` and was not restored, dropped, overwritten, or mixed into this branch.
- `codex/purchase-bill-seeded-uuid-validation` remains untouched except for existence reporting.

## Current Development Objective

- Current lane: frontend-only LedgerByte UI/UX modernization.
- Product posture remains controlled beta/user-testing only.
- This branch reconciles the Stitch/MCP frontend foundation pass with the merged shadcn shell, transaction, and payment workflow migrations.
- It keeps backend APIs, Prisma schema, migrations, UAE PINT-AE behavior, ZATCA behavior, provider adapters, Vercel/Supabase, infrastructure, hosted/customer-data mutation, and production compliance claims unchanged.

## UI Stitch Frontend Foundation Hardening Summary

- PR `#53` (`Continue shadcn migration for payment workflows`) was merged into `main` with merge commit `90d617697a94aa34f7d6c20bb6d3b0b738d816ee` before this branch began.
- The Stitch/MCP frontend foundation pass was found as uncommitted local work in the original checkout, protected with `stitch-frontend-pass-safety.patch`, and reconciled into this fresh branch from updated `origin/main`.
- The reconciliation preserved the split `apps/web/src/components/ui-ledger/*` wrapper system from the shadcn migration instead of keeping a duplicate single-file `ui-ledger.tsx`.
- Added the split `ComplianceReadinessPanel`, tightened the dark grouped app shell, controlled-beta topbar/sidebar language, organization/search/create affordances, dashboard readiness panels, and AED-first invoice/bill form presentation.
- Real Three.js remains present through `FinancialFlowScene` on the dashboard only; `three` and `@types/three` are already wired in `apps/web/package.json` and the dashboard scene keeps reduced-motion, no-WebGL, cleanup, and jsdom fallback behavior.
- Browser route checks were run against the local dev server at desktop/tablet/mobile sizes and confirmed HTTP `200` plus no horizontal overflow on the selected routes. Full authenticated visual review remains limited because the local browser session reached the access gate without a seeded auth/API fixture.
- No backend API, Prisma schema, migration, UAE PINT-AE logic, ZATCA behavior, provider integration, hosted/customer-data mutation, Vercel/Supabase command, production infrastructure command, fake automation, fake bank feed, fake AI, or production compliance claim was added.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: authenticated visual QA with a safe local fixture, credit/debit note forms, reports, documents, compliance/settings surfaces, and route-by-route adoption of the hardened wrappers.

## UI Shadcn Transaction Workflows Summary

- PR `#51` (`Refresh LedgerByte UI shell and dashboard with shadcn`) was merged into `main` with merge commit `c19d69eba23eb01519ab70ece0bdaff960e2a223` before this branch began.
- Before this branch, the PR `#51` beta deployment evidence was observed:
  - API project `ledgerbyte-api-test`, deployment `dpl_3CZzo2Xm5DYXwG5MdDyKibnjnJde`, URL `https://ledgerbyte-api-test.vercel.app`.
  - API `/health` returned `200` with `status: ok`; API `/readiness` returned `200` with database `ok`.
  - Web project `ledgerbyte-web-test`, deployment `dpl_GY1hpGmEzkpMiMKxHrEpUQZKb2Mb`, URL `https://ledgerbyte-web-test.vercel.app`.
  - Web root returned `200` and served the login app shell.
- Before this branch, the Supabase gate evidence was observed for project `xynelbjqcmbgtscfmmzv`: already-merged PR `#49` migration `prisma_20260614100000_compliance_core_uae_readiness` was applied and recorded remotely as version `20260616000212`; migrations were verified afterward; Edge Functions list was empty, so no functions were deployed.
- The stray Vercel CLI project `ui-shadcn-shell-dashboard-refresh` had already been removed and confirmed `404`.
- This branch adds `LineItemsTable` and `TransactionSummaryCard` LedgerByte wrappers, migrates sales invoice and purchase bill creation forms to the shadcn/LedgerByte transaction layout, and modernizes the shared customer/supplier detail workspace with `PageHeader`, KPI cards, tabs, data tables, and status badges.
- Customer/supplier payment screens were not migrated in this branch; they remain follow-up scope.
- No backend API, Prisma schema, migration, UAE PINT-AE logic, ZATCA behavior, provider integration, Vercel/Supabase configuration, hosted/customer-data mutation, production infrastructure command, or production compliance/readiness claim was added.

## UI Shadcn Shell Dashboard Refresh Summary

- PR `#49` was already merged into `main` on 2026-06-15 with merge commit `2d99e42be0ab2d6d2f45fd36091bb9f3f0bece6c`; it was not re-merged.
- Created `feature/ui-shadcn-shell-dashboard-refresh` from updated `origin/main`.
- Initialized shadcn/ui in `apps/web`, added the requested primitives, and added LedgerByte wrapper components for page headers, KPI cards, data tables, filters, status badges, empty states, action grids, and panel sections.
- Reworked the app shell with a dark grouped sidebar, polished topbar, shadcn sheet mobile navigation, existing organization switcher/search/create-menu contracts, existing route links, and existing permission filtering.
- Redesigned `/dashboard` using existing dashboard data only, with KPI cards, P&L/Cash Flow tabs, read-only attention panels, onboarding progress, quick actions, and the single restrained Three.js financial-flow background.
- Migrated the sales invoices list, purchase bills list, and the sales invoice workflow guidance/detail surface to the new shadcn/LedgerByte pattern without changing accounting, finalization, payment, tax, or compliance behavior.
- Remaining UI migration scope: broader route-by-route adoption, deeper form modernization, visual QA across more authenticated states, and design-system consolidation after this first shell/dashboard/list pass.

## UAE PINT-AE Scenario Fixture Validation QA Summary

- PR `#48` was merged into `main` with merge commit `363ee49a80737796a6f15ec606b7b7d99d9afdb1` before this branch began.
- Added `docs/uae-peppol/UAE_PINT_AE_SCENARIO_FIXTURE_COVERAGE.md` and `docs/development/UAE_PINT_AE_SCENARIO_FIXTURES_VALIDATION_QA_SPRINT_CLOSURE.md`.
- Expanded package fixtures for standard tax invoice, commercial invoice `380`, tax credit note with reason/original reference, export receiver not registered in Peppol `9900000099`, deemed supply `9900000097`, buyer not subject `9900000098`, and multi-line invoice values.
- Added negative fixtures for missing buyer endpoint, invalid TIN/TRN, credit-note missing reason/reference, and unsupported legacy transaction flags.
- Added blocked fixture definitions for reverse charge, discount/allowance invoice, and provider-specific payload contract instead of inventing unsupported fields or values.
- Added package helpers `validateUaePintAeFixture()`, `runUaePintAeFixtureSuite()`, and `summarizeUaePintAeFixtureResults()`.
- The local QA summary is not certification, not legal compliance evidence, not provider validation, not FTA reporting, and not production Peppol evidence.
- Still no provider sandbox docs, provider credentials, provider response, commercial terms, provider-specific adapter, real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, hosted/customer-data mutation, Vercel/Supabase change, ZATCA production behavior, or production UAE compliance claim.
- API/UI integration was intentionally skipped for this slice because the objective is package/dev-only local fixture QA.
- Next recommended arc: collect provider sandbox evidence before any provider adapter.

## UAE PINT-AE Official-Code TODO Review Summary

- Merged PR `#47` into `main` with merge commit `869d78ee02f603679ff0f462d2bd16d3a45fd481` before starting this branch.
- Added `docs/uae-peppol/UAE_PINT_AE_OFFICIAL_CODE_TODO_REVIEW.md` and `docs/development/UAE_PINT_AE_OFFICIAL_CODE_TODO_REVIEW_SPRINT_CLOSURE.md`.
- Reviewed UAE MoF Electronic Invoicing Guidelines, UAE MoF mandatory fields, UAE MoF pre-approved provider list, OpenPeppol PINT-AE v1.0.1, OpenPeppol BIS Billing 3.0, and UAE 2025-Q2 specs for continuity.
- Resolved commercial invoice type code as `380`.
- Resolved predefined endpoint participant identifications as `9900000097` for deemed supply, `9900000099` for exports when the receiver is not registered in Peppol, and `9900000098` for buyers not subject to UAE eInvoicing regulations.
- Resolved the official 8-position transaction type flags and now serialize them in `cbc:ProfileExecutionID`.
- Unknown or legacy transaction flags still produce structured `official-doc-required` validation results.
- Provider-specific payload contracts remain blocked on real provider sandbox docs, credentials, provider responses, and commercial terms.
- Still no real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, provider adapter, provider credentials, hosted/customer-data mutation, Vercel/Supabase change, ZATCA production behavior, or production UAE compliance claim.
- Next recommended arc: collect and review provider sandbox evidence before any real provider adapter work.

## UAE PINT-AE Official Serializer Rule Pack Summary

- Added official local PINT-AE constants and exports for `urn:peppol:pint:billing-1@ae-1`, `urn:peppol:bis:billing`, endpoint scheme `0235`, and TIN-derived endpoint IDs.
- Added `packages/uae-peppol-pint-ae/src/pint-ae/*` for official serializer types, rule results, validation helpers, XML serializers, and golden fixtures.
- Kept existing readiness XML output and LedgerByte readiness CustomizationID separate from official serializer output.
- Added structured rule results with `code`, `severity`, `message`, `fieldPath`, and `source` values.
- Added local official XML serialization for invoices and credit notes with endpoint IDs, seller/buyer data, line data, tax totals, document totals, and credit-note reason/original-reference enforcement.
- Added guards so unknown official mappings are not silently guessed; the follow-up official-code TODO review resolved the source-backed commercial invoice, predefined endpoint, and transaction flag values.
- Updated compliance-core local validation to use the official local serializer and metadata-only archive hash path while recording that ASP validation is not connected.
- Updated the UAE readiness panel wording to distinguish local readiness, official local PINT-AE XML generation, and absent ASP validation.
- Still no real ASP validation, real ASP submission, FTA reporting, real Peppol transmission, provider adapter, provider credentials, hosted/customer-data mutation, Vercel/Supabase change, ZATCA production behavior, or production UAE compliance claim.
- Next recommended arc: collect provider sandbox payload evidence before any provider adapter.

## UAE ASP Outreach Execution Pack Summary

- Added `docs/uae-peppol/provider-outreach/README.md` with the outreach purpose, provider-backed strategy, response evaluation rules, evidence hygiene rules, and safety boundaries.
- Added `docs/uae-peppol/provider-outreach/PROVIDER_OUTREACH_TRACKER.md` seeded for Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, and OpenText.
- Added provider-specific outreach email drafts for Complyance, ClearTax, Taxilla, EDICOM, and Comarch.
- Added `docs/uae-peppol/provider-outreach/PROVIDER_RESPONSE_EVALUATION_RUBRIC.md` to score provider responses before any sandbox adapter work.
- Added `docs/development/UAE_ASP_OUTREACH_EXECUTION_PACK_SPRINT_CLOSURE.md`.
- No real provider was selected. No real ASP adapter, credential, executable provider base URL, provider call, FTA reporting, Peppol transmission, real email, Vercel/Supabase change, hosted/customer-data mutation, or production infrastructure command was added.
- Next recommended arc: collect provider responses, keep confidential evidence outside git, score non-confidential evidence, and only then decide whether a provider-specific sandbox contract test branch is justified.

## UAE ASP Provider Selection Plan Summary

- Added `docs/uae-peppol/UAE_ASP_PROVIDER_SELECTION_MATRIX.md` with official-source links, provider shortlist, weighted scoring, risks, unknowns, and recommended first outreach order.
- Added `docs/uae-peppol/UAE_ASP_SANDBOX_CONTRACT_PLAN.md` with required sandbox artifacts, contract terms, provider adapter acceptance criteria, and production go-live blockers.
- Added `docs/uae-peppol/UAE_ASP_PROVIDER_OUTREACH_TEMPLATE.md` with a conservative provider email template and response checklist.
- Added `docs/development/UAE_ASP_PROVIDER_SELECTION_PLAN_SPRINT_CLOSURE.md` documenting the docs-only scope and safety boundary.
- Recommended first outreach order: Complyance, ClearTax, Taxilla, EDICOM, Pagero / Thomson Reuters, Comarch, TronStride / Aigentrix, Storecove, Sovos, OpenText.
- Storecove, Sovos, and OpenText remain comparator providers only unless current UAE MoF status or an authorized UAE ASP partnership is confirmed.
- Final recommendation: start outreach with the most API-friendly MoF-listed providers first; do not implement a real provider until sandbox docs and commercial terms are reviewed.

## UAE Disabled ASP Connector Contract Summary

- Added provider-neutral ASP adapter types, normalized provider keys, capability flags, status values, redaction helpers, and a factory in `@ledgerbyte/uae-peppol-pint-ae`.
- Added `DisabledAspProviderAdapter`, `MockAspProviderAdapter`, and safe future-provider placeholders for `FUTURE_COMPLYANCE`, `FUTURE_CLEARTAX`, `FUTURE_EDICOM`, and `FUTURE_GENERIC_ASP`.
- Disabled provider behavior blocks submission, returns disabled/not-configured status, rejects webhooks, returns no evidence, and never emits sent/reported/delivered statuses.
- Mock provider behavior is deterministic, local-only, test-only, and can simulate validation success/failure plus accepted/rejected mock submissions only when explicit mock mode is enabled.
- Added compliance-core API/service routes for provider readiness summary, redacted test config, transmission preview, explicit mock submission, and provider status timeline.
- Existing compliance document tenant scoping is reused before any preview/status/mock-submission action.
- Mock submission records a local `ComplianceTransmission` and event log only for local contract testing; it does not update accounting finalization or compliance document status.

## UAE Data-Entry And Validation Panel Summary

- Extended the Compliance settings page with editable legal name, trade license, TRN/TIN, VAT status, UAE address/emirate, business activity, Peppol participant ID, ASP selection, and ASP onboarding status fields.
- Added organization readiness checks for TIN/TRN, participant ID presence or derivation, UAE address completeness, VAT status, ASP selection, and ASP onboarding status.
- Added UAE eInvoicing fields to contact creation, shared contact detail/edit, and customer/supplier detail surfaces without blocking normal bookkeeping contact creation.
- Added local UAE eInvoicing/PINT-AE readiness panels to finalized sales invoice and sales credit-note detail pages.
- Added read-only API readiness endpoints for sales invoices and credit notes plus explicit prepare/validate actions that reuse compliance-core document, validation result, event, and archive metadata.
- The local validation path stores status, hashes, warnings/errors, and metadata only; PDFs are not treated as UAE compliance artifacts.

## UI shadcn payment workflows handoff - 2026-06-16

- PR `#52` (`feature/ui-shadcn-transaction-workflows`) was reverified green and merged into `main` with merge commit `25cb9ef9a0ef3225cde03dcfa935703743601762` before this branch began.
- Current branch: `feature/ui-shadcn-payment-workflows`, created fresh from updated `origin/main`.
- Completed frontend-only shadcn/LedgerByte migration for the real payment workflow routes:
  - `/sales/customer-payments`
  - `/sales/customer-payments/new`
  - `/sales/customer-payments/[id]`
  - `/purchases/supplier-payments`
  - `/purchases/supplier-payments/new`
  - `/purchases/supplier-payments/[id]`
- Added shared UI wrappers for payment allocation tables, payment summaries, and payment status badges under `apps/web/src/components/ui-ledger/`.
- Safety boundaries held: no backend, API, Prisma schema, migration, seed/reset/delete, payment posting/allocation logic, AR/AP state machine, UAE PINT-AE, ZATCA, provider integration, hosted data, Vercel, Supabase, production infrastructure, or production compliance claim changed.
- Provider evidence remains unavailable: no sandbox docs, credentials, provider response, or commercial terms.
- Remaining UI migration scope: deeper generated-document/archive detail surfaces, refund workflows, bank/reconciliation review screens, reports/settings tables, and any remaining legacy table/form surfaces.

## Current Safety Boundaries

- Controlled beta/user-testing only.
- UAE eInvoicing readiness and Peppol/PINT-AE readiness only.
- Local validation/readiness, disabled/mock ASP connector contracts, and provider-selection planning only.
- No real ASP calls, no real ASP submission, no FTA reporting, no buyer delivery, and no production Peppol or UAE compliance claim.
- LedgerByte is not claiming FTA certification, Peppol certification, official UAE provider status, or accredited ASP status.
- No ZATCA production behavior, real ZATCA network call, OTP, CSID, signing, clearance/reporting, or PDF-A3 behavior was enabled.
- No hosted/customer-data mutation, Vercel/Supabase change, production infrastructure command, database migration, seed/reset/delete, smoke, or E2E was run.
- Accounting finalization remains separate from compliance delivery state; invoice/credit-note posting, settlement, allocation, VAT math, and report math were not changed.

## Verification Notes For This Branch

- This branch is docs/planning only and should preserve the disabled/mock adapter behavior from PR `#44`.
- Required verification should include package tests/typechecks, API/web targeted tests, `verify:diff`, `verify:ci:local`, `git diff --check`, and staged diff whitespace checks.

## Previous Compliance Core Snapshot

- PR `#42` was fixed, green, merged, and cleaned up before this branch began.
- Compliance core introduced the neutral compliance lifecycle, UAE readiness fields, local PINT-AE helper package, metadata-only archive behavior, settings readiness dashboard, and `compliance.*` permissions.
- Previous PR `#41` was reverified green/safe and merged into `main` with merge commit `7d4b9fa7fab9d971594940e8206d6cc1bc470436`.

## PR #41 Merge Status

- PR `#41` `Wafeq banking reconciliation reports and audit trail polish` was open, non-draft, mergeable clean, and still at expected head `369d2f1c64619d3f8ed709978835fdeaaa8597c7`.
- GitHub check runs were successful: Vercel Preview Comments, Non-mutating verification, and GitGuardian Security Checks.
- Commit statuses were successful for Vercel `ledgerbyte-web-test` and `ledgerbyte-api-test`.
- PR `#41` was merged by merge commit before this branch was rebased onto fresh `origin/main`.

## Compliance Core Files Added Or Updated

- Added Prisma compliance-core schema and migration:
  - `ComplianceProfile`
  - `ComplianceProvider`
  - `ComplianceDocument`
  - `ComplianceTransmission`
  - `ComplianceValidationResult`
  - `ComplianceEventLog`
  - `DocumentArchiveRecord`
- Added nullable UAE readiness fields on organization and contact records:
  - trade license, TRN, TIN, VAT status, UAE address/emirate/business activity, Peppol participant ID, ASP selection/onboarding, buyer endpoint/delivery metadata.
- Added `packages/uae-peppol-pint-ae` with local TIN/TRN validation, Peppol participant derivation, readiness checks, and PINT-AE-like invoice/credit-note XML generation.
- Added API module `apps/api/src/compliance-core/*` for readiness, document preparation, local validation, timeline events, validation result storage, and XML/evidence archive metadata.
- Added frontend settings route `apps/web/src/app/(app)/settings/compliance/*`.
- Updated permissions, route permission mapping, sidebar navigation, and permission matrix for `compliance.*`.
- Updated docs:
  - `CODEX_HANDOFF.md`
  - `BUG_AUDIT.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/REMAINING_ROADMAP.md`
  - `docs/PRODUCT_READINESS_SCORECARD.md`
  - `docs/development/COMPLIANCE_CORE_UAE_PEPPOL_FOUNDATION_SPRINT_CLOSURE.md`
  - `docs/uae-peppol/README.md`

## Implementation Summary

- Compliance delivery state is separate from accounting finalization state. Finalized invoices/credit notes can be prepared as compliance documents without changing journal posting, AR/AP allocation, VAT math, report math, PDF behavior, or source document finalization.
- Compliance statuses added: `DRAFT`, `READY_FOR_VALIDATION`, `VALIDATION_FAILED`, `READY_FOR_ASP`, `SUBMITTED_TO_ASP`, `ACCEPTED_BY_ASP`, `REJECTED_BY_ASP`, `REPORTED_TO_FTA`, `DELIVERED_TO_BUYER`, `FAILED`, `CANCELLED`, and `ARCHIVED`.
- UAE readiness uses official-source positioning: UAE eInvoicing-ready / Peppol PINT-AE-ready data preparation with disabled ASP connectivity.
- The settings page shows readiness checks, buyer endpoint coverage, official source links, rollout dates, and prohibited claims.
- XML archive behavior is metadata-only in this lane: hash, size, filename, artifact type, source link, and body-stored=false metadata are recorded by the code path. PDF archive behavior remains separate.
- PR `#41` banking/audit documentation is preserved in implementation status and roadmap docs after reconciliation.

## Safety Boundaries

- No migration was applied to any database.
- No seed, reset, delete, cleanup, deployed check, smoke, E2E, hosted data mutation, Vercel/Supabase change, real email, real ASP call, or real ZATCA action was run.
- No OTP, CSID, request body, response body, private key, certificate, signing, clearance/reporting, PDF-A3, or production compliance behavior was enabled.
- ZATCA remains parked as blocked-by-default future KSA work.
- LedgerByte is not described as accredited, certified, production-ready, or an official UAE eInvoicing provider.

## Checks Run

- `git status --short --branch`
- `git log -1 --oneline`
- `git branch --show-current`
- `git worktree list`
- `git branch -vv`
- `git remote -v`
- `git stash list --max-count=5`
- `git fetch --prune origin`
- GitHub PR `#41` metadata/check/status verification through GitHub REST and connector.
- PR `#41` merge via connector with expected head SHA.
- `git -C E:\Worktrees\Accounting-App\main merge --ff-only origin/main`
- `git rebase origin/main`
- `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae test`
- `corepack pnpm --filter @ledgerbyte/uae-peppol-pint-ae typecheck`
- `corepack pnpm --filter @ledgerbyte/api db:generate`
- `corepack pnpm --filter @ledgerbyte/api test -- compliance-core.service.spec.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- compliance.test.ts`
- `corepack pnpm --filter @ledgerbyte/web test -- settings/compliance/page.test.tsx`
- `corepack pnpm --filter @ledgerbyte/api typecheck`
- `corepack pnpm --filter @ledgerbyte/web typecheck`
- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check`

## Reconciliation Notes

- Rebase conflict files:
  - `CODEX_HANDOFF.md`
  - `docs/IMPLEMENTATION_STATUS.md`
  - `docs/REMAINING_ROADMAP.md`
- Resolution kept PR `#41` banking/audit closure and compliance-core/UAE Peppol readiness notes.
- No source-code conflict required behavior changes.

## Skipped Commands And Why

- `corepack pnpm db:migrate`, seed/reset/delete, smoke, E2E, deployed checks, real login flows, hosted database checks, Vercel/Supabase changes, real ASP calls, real ZATCA calls, real email, backup/restore, and production infrastructure commands were skipped because this lane is local code/test only and the standing repo instructions forbid those actions without explicit approval.

## Remaining Blockers

- Real ASP connectivity is still absent and must wait for commercial provider selection, API documentation review, explicit approval, sandbox credentials, redaction rules, retry policy, and provider-specific payload validation.
- PINT-AE XML generation is readiness-oriented and fixture-tested; it is not official certification and must be checked against final ASP/provider contracts before real submission.
- Retention periods, audit export format, and legal guarantees must be re-verified against current UAE rules and counsel/accountant review before production claims.
- KSA ZATCA should be wrapped behind the same lifecycle later without weakening current no-production/no-network gates.

## Exact Next Recommended Prompt Title

`UAE ASP first-provider outreach evidence and sandbox docs review`
