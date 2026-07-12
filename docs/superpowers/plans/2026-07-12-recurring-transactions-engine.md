# Generalized Recurring Transactions Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize LedgerByte's existing recurring-invoice feature into one tenant-safe recurring engine that produces reviewable sales-invoice, purchase-bill, expense-proposal, and manual-journal drafts without automatic approval or posting.

**Architecture:** Add normalized recurring template, line, and run tables while retaining the legacy recurring-invoice tables during the compatibility period. Backfill legacy templates, lines, and run evidence into the generalized tables with stable IDs, then make legacy routes adapters over the generalized service. A deterministic IANA-timezone schedule module owns occurrence identity; a durable run service claims one occurrence transactionally and dispatches to type-specific draft adapters.

**Tech Stack:** NestJS 11, Prisma 6/PostgreSQL, Jest 30, Next.js/React, TypeScript, LedgerByte shared permissions and UI primitives.

## Global Constraints

- Generated sales invoices, purchase bills, manual journals, and expense proposals remain drafts or review proposals; no recurring path finalizes, posts, approves, pays, emails, uploads, or moves money.
- Cash expenses are immediate-post in the current code, so recurring expenses use `RecurringExpenseProposal` and a separate review action through the normal cash-expense workflow.
- Existing recurring-invoice tables and routes remain available until additive migration and compatibility tests prove safe mapping.
- Schedules use explicit IANA timezones and canonical `scheduledFor` instants; server-local time is never schedule truth.
- Default catch-up is `SKIP_MISSED`; `GENERATE_ALL` is bounded.
- `templateId + scheduledFor` is the database duplicate barrier; manual runs require idempotency keys.
- Tenant scope, permissions, active-reference checks, fiscal-period locks, dimensions, FX evidence, audit history, and request IDs are enforced at authoritative boundaries.
- Existing posted records and historical runs are never rewritten.
- No live rate lookup, bank/provider flow, payment collection, OCR, external email/storage/webhook delivery, ZATCA/UAE compliance, payroll, fixed assets, portals, native mobile, or money movement.

## Source Map and Locked Decisions

- Legacy schema: `apps/api/prisma/schema.prisma` models `RecurringInvoiceTemplate`, `RecurringInvoiceTemplateLine`, and `RecurringInvoiceRun`; originating migration is `20260604140000_recurring_invoices_sprint`.
- Legacy API: `apps/api/src/recurring-invoices/`; sales permissions currently guard all routes.
- Legacy web: `apps/web/src/app/(app)/sales/recurring-invoices/`, `apps/web/src/components/forms/recurring-invoice-form.tsx`, and `apps/web/src/lib/recurring-invoices.ts`.
- Purchase bills have a real `DRAFT` create path in `PurchaseBillService.create`.
- Manual journals have a real `DRAFT` create path in `AccountingService.create` and already carry journal-line cost center/project dimensions.
- Cash expenses create posted journals and posted expenses in one operation; they cannot be used by a recurring scheduler.
- The repository has no general durable queue. The recurring engine therefore uses the database run ledger and transactional claims rather than adding a second queue product.
- Organization timezone already exists; templates copy an explicit timezone so later organization edits cannot alter historical schedule meaning.
- Existing document-rate resolution is reused for base/fixed/snapshot evidence; `REQUIRE_RATE_AT_RUN` creates a blocked run when evidence is absent.

---

### Task 1: Freeze policy contracts and scheduling interface

**Files:**
- Create: `apps/api/src/recurring-transactions/recurring-schedule.ts`
- Test: `apps/api/src/recurring-transactions/recurring-schedule.spec.ts`
- Create: `apps/api/src/recurring-transactions/recurring-policy.contract.spec.ts`

**Interfaces:**
- Produces: `RecurringScheduleInput`, `RecurringOccurrence`, `nextOccurrence(input)`, `dueOccurrences(input, now, limit)`, `assertValidTimeZone(timeZone)`.
- Occurrence identity is `{ localDate: "YYYY-MM-DD", scheduledFor: Date }`.

- [ ] Write failing schedule tests for daily/weekly/monthly 28-31/quarterly/yearly, leap years, IANA validation, DST forward/back, end dates, and bounded catch-up.
- [ ] Run `corepack pnpm --filter @ledgerbyte/api test -- --runTestsByPath src/recurring-transactions/recurring-schedule.spec.ts --runInBand` and confirm failures are caused by the missing module.
- [ ] Implement deterministic date-component arithmetic and explicit timezone-to-instant conversion; reject invalid intervals, dates, limits, and timezones.
- [ ] Rerun the focused tests and keep the existing recurring-invoice schedule tests green.
- [ ] Commit only the policy/schedule slice.

### Task 2: Add normalized recurring schema and legacy backfill

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260712110000_generalize_recurring_transactions/migration.sql`
- Create: `apps/api/src/recurring-transactions/recurring-schema-contract.spec.ts`
- Create: `apps/api/src/recurring-transactions/recurring-migration-contract.spec.ts`

**Interfaces:**
- Produces: Prisma enums `RecurringTransactionType`, `RecurringTransactionStatus`, `RecurringFrequency`, `RecurringCatchUpPolicy`, `RecurringGenerationMode`, `RecurringExchangeRatePolicy`, `RecurringRunStatus`, and `RecurringRunTrigger`.
- Produces: `RecurringTransactionTemplate`, `RecurringTransactionTemplateLine`, `RecurringTransactionRun`, and `RecurringExpenseProposal` with tenant-scoped relations.

- [ ] Write failing schema and SQL contract tests covering additive ordering, indexes, tenant FKs, non-cascading run evidence, unique occurrence/idempotency barriers, legacy backfill, and invalid-legacy aborts.
- [ ] Run the focused contract tests and confirm the expected missing-model/migration failures.
- [ ] Add normalized tables and optional source-link fields on generated documents; retain legacy tables and fields.
- [ ] Backfill legacy templates/lines/runs as `SALES_INVOICE`, preserving IDs, schedule dates, statuses, line order, generated invoice links, and base-currency policy without fabricating missing data.
- [ ] Run Prisma format/generate/validate plus contract tests and inspect SQL for destructive statements.
- [ ] Commit schema/migration separately.

### Task 3: Build template validation, versions, permissions, and audit catalog

**Files:**
- Create: `apps/api/src/recurring-transactions/dto/create-recurring-transaction.dto.ts`
- Create: `apps/api/src/recurring-transactions/dto/update-recurring-transaction.dto.ts`
- Create: `apps/api/src/recurring-transactions/dto/recurring-transaction-line.dto.ts`
- Create: `apps/api/src/recurring-transactions/recurring-template.service.ts`
- Test: `apps/api/src/recurring-transactions/recurring-template.service.spec.ts`
- Modify: `packages/shared/src/permissions.ts`
- Modify: `apps/api/src/audit-log/audit-events.ts`
- Test: `apps/api/src/audit-log/audit-events.spec.ts`

**Interfaces:**
- Produces: `create`, `get`, `list`, `update`, `activate`, `pause`, `resume`, and `archive` methods scoped by `organizationId`.
- Updates use optimistic version checks; accounting-content or schedule changes increment `templateVersion` only for future runs.

- [ ] Write failing tests for discriminated type validation, tenant references, active dimensions, balanced journals, FX policies, unchanged updates, future-only versions, archived history, permissions, and audit-event catalog entries.
- [ ] Run focused tests and confirm missing service/constants failures.
- [ ] Implement boundary DTO validation, template persistence, role defaults, and same-transaction audit records.
- [ ] Rerun focused tests, shared permission tests, and API typecheck.
- [ ] Commit the template-management slice.

### Task 4: Implement durable claim, run-now, retry, and catch-up engine

**Files:**
- Create: `apps/api/src/recurring-transactions/recurring-run.service.ts`
- Create: `apps/api/src/recurring-transactions/recurring-run.errors.ts`
- Test: `apps/api/src/recurring-transactions/recurring-run.service.spec.ts`
- Test: `apps/api/src/recurring-transactions/recurring-run.concurrency.spec.ts`

**Interfaces:**
- Produces: `processDue({ now, limit, workerClaimId })`, `runNow({ templateId, idempotencyKey, actorUserId })`, and `retry({ runId, idempotencyKey, actorUserId })`.
- Adapter contract: `generate(context: RecurringGenerationContext): Promise<GeneratedTarget>`; adapters never post.

- [ ] Write failing tests for duplicate workers, unique occurrence conflict, manual idempotency, `P2034` mapping/retry, failed-attempt history, safe codes, locked periods, pause/archive, and bounded backlog.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement serializable claim transactions, unique-conflict recovery, safe retry classification, atomic next-run advancement, and same-transaction run audit events.
- [ ] Rerun focused tests repeatedly to expose race-sensitive assumptions.
- [ ] Commit the durable-run slice.

### Task 5: Migrate recurring sales invoices onto the generalized adapter

**Files:**
- Create: `apps/api/src/recurring-transactions/adapters/recurring-sales-invoice.adapter.ts`
- Test: `apps/api/src/recurring-transactions/adapters/recurring-sales-invoice.adapter.spec.ts`
- Modify: `apps/api/src/recurring-invoices/recurring-invoice.service.ts`
- Test: `apps/api/src/recurring-invoices/recurring-invoice-rules.spec.ts`
- Modify: `apps/api/src/recurring-invoices/recurring-invoice.controller.ts`

**Interfaces:**
- Legacy routes translate legacy DTOs/responses to the generalized service while retaining route paths and observable draft behavior.
- Generated sales invoices link both generalized template/run IDs and legacy IDs where a legacy row exists.

- [ ] Write failing compatibility and adapter tests for legacy CRUD/generate, DRAFT-only output, numbering, terms, tax, dimensions, base/fixed/snapshot FX, missing-rate blockers, inactive references, period locks, and version snapshots.
- [ ] Run the focused tests and confirm generalized behavior is absent.
- [ ] Implement the sales adapter and legacy compatibility mapping without deleting old tables or rewriting generated invoices.
- [ ] Rerun all existing recurring-invoice tests plus sales-invoice/FX/dimension focused tests.
- [ ] Commit the compatibility slice.

### Task 6: Add line dimensions to draft document workflows

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260712120000_add_document_line_dimensions/migration.sql`
- Modify: sales-invoice, purchase-bill, and cash-expense line DTO/service files under `apps/api/src/`
- Test: affected rules/spec files under those modules

**Interfaces:**
- Optional `costCenterId` and `projectId` are additive line fields, tenant-validated and active at create/update; existing rows remain null.

- [ ] Write failing DTO/service/schema tests for valid dimensions, archived dimensions, cross-tenant IDs, and null compatibility.
- [ ] Run focused tests and confirm missing-field failures.
- [ ] Add additive columns/FKs/indexes and propagate validated fields through normal draft/document line creation.
- [ ] Rerun focused accounting and tenant-isolation tests.
- [ ] Commit the dimension propagation slice.

### Task 7: Add purchase-bill, expense-proposal, and journal adapters

**Files:**
- Create: `apps/api/src/recurring-transactions/adapters/recurring-purchase-bill.adapter.ts`
- Create: `apps/api/src/recurring-transactions/adapters/recurring-expense-proposal.adapter.ts`
- Create: `apps/api/src/recurring-transactions/adapters/recurring-manual-journal.adapter.ts`
- Test: matching `*.spec.ts` files
- Modify: `apps/api/src/purchase-bills/purchase-bill.service.ts`
- Modify: `apps/api/src/accounting/accounting.service.ts`

**Interfaces:**
- Purchase and journal draft factories accept a transaction executor/source evidence so target creation and run linkage are atomic.
- Expense generation creates only `RecurringExpenseProposal`; `reviewAndCreate` revalidates and calls the normal cash-expense workflow with its own idempotency key.

- [ ] Write failing adapter tests for valid generation, inactive/cross-tenant references, dimensions, rate policies, locks, duplicate occurrences, template edits, balanced journals, and absence of posted journals.
- [ ] Write failing expense tests proving generation cannot create a cash expense or journal and incomplete data cannot be reviewed.
- [ ] Implement the minimal transaction-aware draft factories and adapters without weakening existing posting/FX guards.
- [ ] Rerun adapter tests and existing purchase-bill, cash-expense, and journal rule suites.
- [ ] Commit the adapter slice.

### Task 8: Expose bounded tenant-safe REST API and readiness

**Files:**
- Create: `apps/api/src/recurring-transactions/recurring-transaction.controller.ts`
- Create: `apps/api/src/recurring-transactions/recurring-transaction.module.ts`
- Create: `apps/api/src/recurring-transactions/recurring-readiness.service.ts`
- Test: controller, HTTP tenant-isolation, permission, serialization, and readiness specs
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Routes: list/create/get/update/activate/pause/resume/archive/run, bounded template runs, run detail, and readiness under `/recurring-transactions`.
- List response uses `{ data, pagination }`; mutations accept idempotency/version headers or typed fields consistent with current API conventions.

- [ ] Write failing controller metadata and HTTP tests for authentication, permission denial, cross-tenant IDs, pagination bounds, safe serialization, and route ordering (`readiness` before `:id`).
- [ ] Run focused tests and confirm missing controller/service failures.
- [ ] Implement explicit response mappers, filters, bounded pagination, and readiness counts/states.
- [ ] Rerun focused tests, API route audits, and API typecheck.
- [ ] Commit the API/readiness slice.

### Task 9: Extend migration toolkit import/export safely

**Files:**
- Modify: `apps/api/src/migration-toolkit/dto/migration-toolkit.dto.ts`
- Modify: `apps/api/src/migration-toolkit/migration-toolkit.service.ts`
- Test: `apps/api/src/migration-toolkit/migration-toolkit.service.spec.ts`

**Interfaces:**
- Preview supports the four recurring types with row-level validation and duplicate keys.
- Commit serializably revalidates the preview token and creates DRAFT templates unless activation is explicitly authorized.

- [ ] Write failing tests for schedule/timezone/FX/reference errors, CSV injection, duplicates, stale preview, concurrent commit, type-safe rows, and bounded exports.
- [ ] Run focused tests and confirm missing recurring dataset support.
- [ ] Implement preview, reviewed commit, and safe template/run exports using the generalized service.
- [ ] Rerun migration-toolkit and tenant-isolation tests.
- [ ] Commit the import/export slice.

### Task 10: Build the finance-first recurring web workspace

**Files:**
- Create: `apps/web/src/app/(app)/recurring-transactions/page.tsx`
- Create: `apps/web/src/app/(app)/recurring-transactions/new/page.tsx`
- Create: `apps/web/src/app/(app)/recurring-transactions/[id]/page.tsx`
- Create: `apps/web/src/app/(app)/recurring-transactions/[id]/runs/page.tsx`
- Create: `apps/web/src/components/recurring-transactions/recurring-template-form.tsx`
- Create: `apps/web/src/lib/recurring-transactions.ts`
- Test: colocated page/form/lib tests
- Modify: route, navigation, global create/search, permission, i18n, and type registries under `apps/web/src/`

**Interfaces:**
- Dense list supports type/status/date/party/currency/blocker filters, pause/resume/run/archive actions, and generated-target links.
- Editor is discriminated by transaction type and always states that generation creates drafts/proposals without posting.

- [ ] Use Lazyweb reference research before UI implementation and record only applicable interaction patterns.
- [ ] Write failing page/form/lib tests for all types, schedule preview, timezone/catch-up/FX/dimensions, permissions, blockers, run history, tenant switch remount, RTL, keyboard labels, loading/error/empty, and mobile overflow containment.
- [ ] Run focused tests and confirm missing workspace failures.
- [ ] Implement with existing LedgerByte primitives; keep legacy recurring-invoice routes working and link them into the generalized workspace.
- [ ] Rerun focused web tests, web typecheck, and browser desktop/mobile/Arabic RTL journeys.
- [ ] Commit the web slice.

### Task 11: Add readiness card, docs, and contract guards

**Files:**
- Create: `docs/accounting/RECURRING_TRANSACTIONS_ENGINE.md`
- Create: `docs/accounting/RECURRING_SCHEDULE_AND_TIMEZONE_POLICY.md`
- Create: `docs/accounting/RECURRING_DOCUMENT_ACCOUNTING_BOUNDARIES.md`
- Create: `docs/product/WAFEQ_COMPETITOR_RECURRING_TRANSACTIONS.md`
- Create: `docs/migration/RECURRING_TEMPLATE_MIGRATION.md`
- Update: API/route/status/readiness catalogs already present under `docs/`
- Create: `scripts/recurring-transactions-policy-guard.cjs`
- Test: `scripts/recurring-transactions-policy-guard.test.cjs`

**Interfaces:**
- Readiness card consumes only the recurring readiness API and does not globally block close.
- Documentation guard requires draft-only, timezone, catch-up, idempotency, migration, FX, dimension, lock, and prohibited-provider statements.

- [ ] Write failing documentation-guard tests first.
- [ ] Run the guard test and confirm missing policy documents/sections.
- [ ] Write evidence-based docs and wire the recurring attention card into the existing readiness/settings surface.
- [ ] Rerun guard, affected page tests, and route catalog checks.
- [ ] Commit docs/readiness.

### Task 12: Independent reviews and complete local verification

**Files:**
- Modify only files justified by failing tests for Critical or Important findings.

- [ ] Dispatch read-only independent reviews covering all 13 axes in the supplied specification.
- [ ] For each Critical/Important finding, first add a reproducing failing test, then implement the smallest fix and rerun the review surface.
- [ ] Run Prisma generate/validate, full API and web suites, package tests, API/web/workspace typechecks, production build, diff checks, secret scan, and browser desktop/mobile/RTL verification.
- [ ] Record exact suite/test counts and restore only known `apps/web/next-env.d.ts` build churn.

### Task 13: Publish, merge, and roll out to the approved burner

**Files:**
- Create: `docs/deployment/USER_TESTING_RECURRING_TRANSACTIONS_ROLLOUT_20260712.md`

- [ ] Split at the dependency boundaries into up to three ready PRs; push exact reviewed commits and wait for GitGuardian and repository verification.
- [ ] Merge only green PRs, prove heads reachable from `origin/main`, and leave unrelated worktrees/branches untouched.
- [ ] Load approved database/DPAPI secrets process-only without printing; validate project ref and non-local URLs; clear variables after use.
- [ ] Create outside-repo schema/data backups and hashes, compare hosted/local migrations, stop on unexpected migrations, apply only expected recurring migrations, and verify status.
- [ ] Deploy API first, smoke root/health/readiness and roll back on failure; then deploy/smoke web if changed.
- [ ] Run authenticated safe-test-org recurring smoke for four types, lifecycle, concurrency, locks, FX, versioning, archive/history, import, and desktop/mobile/RTL without provider/compliance/money movement.
- [ ] Write and merge the evidence PR only when CI is green; clean only merged recurring worktrees/branches and provide the exact closeout.

## Self-Review

- Spec coverage: all phases 0-20 map to Tasks 1-13; cash-expense proposal policy and legacy migration are explicit.
- Placeholder scan: no implementation placeholder weakens a required behavior; focused files and commands are named.
- Type consistency: schedule occurrence, adapter, run, template-version, and REST pagination contracts are defined once and consumed by later tasks.
