# Fixed Assets MVP Implementation Map

## Existing seams

- `apps/api/prisma/schema.prisma` owns tenant-scoped accounting, dimensions, purchase bills, journals, fiscal periods, imports, and close persistence.
- `AccountingService.createDraftInTransaction` validates balanced lines, account/dimension ownership, base-currency posting context, and audit evidence. Fixed-asset posting will use the same journal line shape and number sequence inside the authoritative transaction; it will not introduce a second journal model.
- `FiscalPeriodGuardService.assertPostingDateAllowed` is the posting-period gate and will be called with the transaction executor for acquisitions, depreciation, and disposals.
- `PurchaseBillLine` stores exact base `taxableAmount` and transaction amounts. `buildPurchaseBillJournalLines` proves the posted line debit and separates recoverable tax; capitalization will link to the posted bill journal and reclassify only the selected line's proven base amount.
- `AuditLogService.log` is the existing tenant-scoped audit path. Fixed-asset mutations will write safe IDs and accounting evidence in the same transaction.
- `PERMISSIONS` in `packages/shared/src/permissions.ts`, `RequirePermissions`, and the existing controller guards provide the permission surface. Fixed-asset permissions will be added to the shared catalog and default role matrices.
- `MigrationToolkitModule` provides reviewed import jobs, row validation, commit-time revalidation, and bounded exports; fixed-asset imports will adapt to that toolkit rather than create another importer.
- `AccountingCloseService` / `close-readiness.ts` persist tenant-scoped readiness snapshots and task items. Fixed-asset readiness will be one module of the same orchestrator.
- `apps/web/src/components/ui-ledger/*` and existing app-route patterns provide the finance-first UI primitives; the fixed-asset workspace will reuse them and the active-organization remount boundary.

## Dependency order

1. Add additive Prisma enums/models and migration contract tests.
2. Add deterministic straight-line schedule and disposal arithmetic helpers with focused tests.
3. Add category/register/acquisition/capitalization/opening-balance service and authenticated routes.
4. Add depreciation preview/review/post/reverse and disposal/write-off using the journal and period services.
5. Add reports/reconciliation, close readiness, imports/exports, permissions, audit event contracts, and API tests.
6. Add web routes/forms/workspaces, responsive/RTL tests, and documentation.
7. Run bounded full gates, independent review gates, merge from clean main, and only then perform approved burner rollout/evidence.

## Fixed policy boundary

Cost model only; straight-line monthly depreciation; `START_NEXT_MONTH`; exact decimal arithmetic with four-decimal residual consumption; full bill-line capitalization only; no impairment, revaluation, tax books, partial line capitalization, cash-expense capitalization, provider calls, compliance submission, or money movement.

## Safety invariants

- Every query and mutation is organization-scoped and uses composite ownership checks for accounts and dimensions.
- Posted acquisition, depreciation, and disposal history is immutable; corrections use existing journal reversal semantics.
- Draft/reviewed states never silently post. Posting locks the asset/source/run evidence, rechecks the open period and source amounts, and is idempotent.
- No source purchase document is modified; source line/journal evidence remains linked permanently.
- The protected root checkout and `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` are outside this worktree and are never touched.
