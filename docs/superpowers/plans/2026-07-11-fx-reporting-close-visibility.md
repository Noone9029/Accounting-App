# FX Reporting and Close Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LedgerByte's financial reports, exports, party balances, FX activity, exposure, and period-close controls truthful for AED/SAR base organizations and foreign-currency activity.

**Architecture:** Existing official statements remain base-currency reports. A shared report context adds the organization's base currency and explicit filter semantics; only reports with mathematically safe currency slices accept `transactionCurrency`, while unsupported reports reject it. Dedicated read-only FX reports query tenant-scoped allocation, revaluation, rate-snapshot, and monetary-balance evidence. A close-readiness service aggregates unresolved FX exceptions and is reused by fiscal-period close/lock guards.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Decimal.js, Next.js/React, Jest, Playwright, `@ledgerbyte/pdf-core`.

## Global Constraints

- Official accounting totals remain in organization base currency.
- Transaction-currency values are supporting detail and are never aggregated across currencies.
- General Ledger and aging may accept one normalized transaction-currency filter; Trial Balance, P&L, Balance Sheet, VAT, and Cash Flow reject it explicitly.
- Cost-center/project and transaction-currency filters compose only where both are supported; no supplied filter is silently ignored.
- New FX reports require `reports.view`; exports additionally retain the existing report-export permission check.
- A base-only organization has FX close status `NOT_APPLICABLE` and is never blocked by missing FX configuration.
- No live rate provider, compliance, banking, payment, OCR, email, storage, webhook delivery, or money movement is enabled or executed.
- All queries are tenant scoped and all amounts use decimal strings.

---

### Task 1: Base-currency report contract and truthful presentation

**Files:**
- Modify: `apps/api/src/reports/reports.service.ts`
- Modify: `apps/api/src/reports/report-csv.ts`
- Modify: `apps/api/src/reports/reports.service.spec.ts`
- Modify: `apps/api/src/reports/report-csv.spec.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/components/reports/report-pages.tsx`
- Modify: `apps/web/src/components/reports/report-pages.test.tsx`

**Interfaces:**
- Produces: `ReportAccountingContext = { baseCurrency: string; amountBasis: "BASE_CURRENCY" }` on every report JSON response.
- Produces: CSV header rows `Base Currency` and `Amount Basis`.

- [x] Write API and web tests proving AED metadata/formatting and no hard-coded SAR.
- [x] Run focused tests and confirm the new assertions fail because `baseCurrency` is absent and UI uses SAR.
- [x] Load organization base currency once per report response, attach the context, and use it for every money cell.
- [x] Add base-currency and amount-basis CSV headers without changing numeric totals.
- [x] Run focused API/web tests and typechecks.

### Task 2: Explicit currency filters and journal supporting detail

**Files:**
- Modify: `apps/api/src/reports/reports.service.ts`
- Modify: `apps/api/src/reports/report-csv.ts`
- Modify: `apps/api/src/reports/reports.service.spec.ts`
- Modify: `apps/api/src/reports/report-csv.spec.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/components/reports/report-pages.tsx`
- Modify: `apps/web/src/lib/reports.ts`

**Interfaces:**
- Consumes: `ReportAccountingContext` from Task 1.
- Produces: normalized `transactionCurrency?: string` query field.
- Produces: GL line evidence `{ currency, transactionDebit, transactionCredit, exchangeRate, rateSnapshot }`.

- [x] Write failing tests for ISO currency normalization, dimension+currency composition, base-currency totals unchanged, transaction evidence, and explicit rejection on unsupported aggregate reports.
- [x] Run tests and verify failures are caused by the missing query behavior.
- [x] Apply `transactionCurrency` to GL opening/period journal-line reads and return rate evidence.
- [x] Reject the filter on TB, P&L, BS, VAT, Cash Flow, management aggregates, and report-pack items that cannot preserve mathematical meaning.
- [x] Add GL currency filter/detail UI and CSV context; label the slice as base-valued supporting detail, not a balanced financial statement.
- [x] Run focused tests, tenant isolation, and typechecks.

### Task 3: Truthful aging, party statements, and document detail

**Files:**
- Modify: `apps/api/src/reports/reports.service.ts`
- Modify: `apps/api/src/reports/report-csv.ts`
- Modify: `apps/api/src/contacts/contact-ledger.service.ts`
- Modify: `apps/api/src/contacts/contact-ledger-rules.spec.ts`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/components/reports/report-pages.tsx`
- Modify: `apps/web/src/components/parties/party-statement-page.tsx`
- Modify: `apps/web/src/app/(app)/sales/invoices/[id]/page.tsx`
- Modify: `apps/web/src/app/(app)/purchases/bills/[id]/page.tsx`

**Interfaces:**
- Produces aging rows with `currency`, `transactionTotal`, `openTransactionAmount`, `sourceBaseOpenAmount`, `carryingBaseAmount`, `carryingRate`, and revaluation evidence.
- Produces aging `transactionTotalsByCurrency`, never one cross-currency total.
- Produces party-statement `baseCurrency` plus row-level currency/rate/transaction metadata where the source supports it.

- [x] Write failing tests for unrevalued/revalued/partially settled AR and AP, currency filtering, grouped transaction totals, and AED statement/detail labels.
- [x] Run tests and confirm the carrying and transaction assertions fail.
- [x] Join `FxMonetaryBalance` for current carrying truth while retaining source document residuals.
- [x] Extend statement source selections and row metadata without changing official base ledger balances.
- [x] Correct invoice/bill detail to show `transactionBalanceDue` in transaction currency and current carrying amount separately.
- [x] Update CSV/UI/PDF labels and archived identity for currency context.
- [x] Run focused service, renderer, UI, and tenant tests.

### Task 4: Four read-only FX reports and exports

**Files:**
- Create: `apps/api/src/reports/fx-reporting.service.ts`
- Create: `apps/api/src/reports/fx-reporting.service.spec.ts`
- Modify: `apps/api/src/reports/reports.module.ts`
- Modify: `apps/api/src/reports/reports.controller.ts`
- Modify: `apps/api/src/reports/reports.controller.spec.ts`
- Modify: `apps/api/src/reports/report-csv.ts`
- Modify: `apps/api/src/reports/report-csv.spec.ts`
- Create: `apps/web/src/app/(app)/reports/fx-activity/page.tsx`
- Create: `apps/web/src/app/(app)/reports/fx-activity/page.test.tsx`
- Modify: `apps/web/src/lib/app-routes.ts`
- Modify: `apps/web/src/lib/reports.ts`
- Modify: `apps/web/src/lib/types.ts`

**Interfaces:**
- Produces endpoints `/reports/fx/realized-activity`, `/reports/fx/unrealized-activity`, `/reports/fx/rate-snapshots`, and `/reports/fx/open-exposure`.
- Each endpoint returns base-currency totals, row evidence, filters, notes, and CSV; unsupported PDF requests return an explicit 400.

- [x] Write failing service/controller tests for gain/loss, reversal net effect, missing realized journal exceptions, snapshot usage, exposure grouping, date/currency filters, CSV injection, permissions, and cross-tenant denial.
- [x] Run tests and confirm the endpoints/services are missing.
- [x] Implement tenant-scoped queries over all four allocation families, revaluation runs/lines, snapshots, and open monetary documents.
- [x] Preserve gross and reversed activity separately; never double-count or sum transaction currencies together.
- [x] Add CSV serializers and the dense accountant-first activity/exposure workspace.
- [x] Run focused API/web/browser tests and typechecks.

### Task 5: FX close readiness and fiscal-period guard

**Files:**
- Create: `apps/api/src/foreign-exchange/fx-close-readiness.service.ts`
- Create: `apps/api/src/foreign-exchange/fx-close-readiness.service.spec.ts`
- Modify: `apps/api/src/foreign-exchange/foreign-exchange.module.ts`
- Modify: `apps/api/src/foreign-exchange/foreign-exchange.controller.ts`
- Modify: `apps/api/src/fiscal-periods/fiscal-period.service.ts`
- Modify: `apps/api/src/fiscal-periods/fiscal-period.service.spec.ts`
- Create: `apps/web/src/app/(app)/fx-close/page.tsx`
- Create: `apps/web/src/app/(app)/fx-close/page.test.tsx`
- Modify: `apps/web/src/lib/app-routes.ts`

**Interfaces:**
- Produces `FxCloseReadiness = { status: "NOT_APPLICABLE" | "READY" | "BLOCKED"; asOf; blockers; counts; actions }`.
- Produces `assertReadyForPeriodClose(organizationId, endsOn)` used before both close and lock mutations.

- [x] Write failing tests for base-only non-applicability and each blocker: missing closing rate, draft/manual-rate document review, unreviewed/unposted revaluation, missing accounts, and realized FX without a journal.
- [x] Run tests and confirm no close service/guard exists.
- [x] Implement tenant-scoped readiness queries and fail-closed close/lock guards only when foreign activity exists.
- [x] Add a compact action-queue workspace with blocker counts, direct routes, RTL, mobile containment, and view-only behavior.
- [x] Run fiscal-period, readiness, permission, tenant, and browser tests.

### Task 6: Export/archive/report-pack identity and Phase 6 completion

**Files:**
- Modify: `apps/api/src/reports/reports.service.ts`
- Modify: `apps/api/src/reports/report-pack-manifest.ts`
- Modify: `apps/api/src/reports/report-pack-manifest.spec.ts`
- Modify: `apps/api/src/generated-documents/generated-document.service.spec.ts`
- Modify: `docs/accounting/PERIOD_END_FX_REVALUATION.md`
- Create: `docs/accounting/FX_REPORTING_AND_CLOSE.md`
- Modify: `docs/superpowers/plans/2026-07-11-period-end-fx-revaluation.md`

**Interfaces:**
- Produces canonical report identity containing base currency, transaction-currency filter, rate source/snapshot scope, revaluation status/run scope, dimensions, and dates.
- Report-pack manifests preserve supported FX scope and keep archive/download disabled until existing storage gates pass.

- [x] Write failing identity/byte-stability tests for reordered query input, archived accounting context, unsupported scopes, and tenant separation.
- [x] Run tests and confirm FX identity fields are missing.
- [x] Implement canonical identity and manifest context without enabling storage or pack download.
- [x] Document supported/unsupported filters, base-vs-transaction amounts, carrying values, reversal effects, close gates, and no-provider/compliance limits.
- [x] Run Prisma generation/validation, full API/web suites, workspace typecheck, production build, Playwright desktop/mobile/RTL, diff check, and secret scan.
- [x] Obtain independent accounting/security review with zero Critical or Important findings.
- [ ] Commit, push, open a ready PR, wait for green CI, merge, prove origin/main reachability, and clean the worktree safely.
