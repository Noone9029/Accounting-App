# Multi-Currency FX Import, API, Audit, and Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 7 of LedgerByte's approved multi-currency arc with reviewed FX-aware imports, authenticated compatible API contracts, explicit audit evidence, and accountant-facing documentation.

**Architecture:** Preserve the existing migration toolkit's master-data boundary and extend only its monetary `PRODUCTS_SERVICES` rows with an optional FX tuple whose reviewed base equivalent becomes the catalog price. Add read-only `/public-api/v1` currency and rate resources through explicit mappers over the tenant-scoped FX service. Emit focused FX audit records inside the same transactions as document, settlement, and revaluation mutations; rate snapshots remain append-only.

**Tech Stack:** NestJS, Prisma/PostgreSQL, TypeScript, decimal.js through `@ledgerbyte/accounting-core`, Next.js, Jest, Playwright.

## Global Constraints

- Existing imports without FX columns remain byte-contract compatible and use the organization base currency at rate `1`.
- Rate direction is always `base amount = transaction amount × captured rate`.
- Rates are positive plain decimals with at most eight fractional digits; money is rounded half-up to four fractional digits by the accounting core.
- Import creates a preview first, returns row-level errors, and never commits until `confirmReviewed: true`.
- Import commit is transactional and concurrency-claimed; no partial or duplicate commit may survive.
- Currency-rate snapshots are append-only. Corrections create a new snapshot; no rate-update endpoint is added.
- Public v1 FX resources are authenticated, tenant-scoped, read-only, permission-guarded, explicitly mapped, and never return raw Prisma records, organization IDs, actor IDs, request hashes, or idempotency keys.
- Existing internal API field names remain additive and unchanged: `currency`, `baseCurrency`, `exchangeRate`, `rateDate`, `rateSource`, and `rateSnapshotId`.
- Refund combinations that remain base-only are documented honestly and are not advertised as foreign-currency mutations.
- No live rate provider, unauthenticated financial API, compliance behavior, hosted mutation, provider call, or money movement is enabled by this phase.

---

### Task 1: Atomic FX-aware product and service import

**Files:**
- Modify: `apps/api/src/migration-toolkit/migration-toolkit.service.spec.ts`
- Modify: `apps/api/src/migration-toolkit/migration-toolkit.service.ts`
- Modify: `docs/migration-toolkit/LOCAL_CSV_IMPORT_EXPORT.md`

**Interfaces:**
- `PRODUCTS_SERVICES` adds optional headers `currency`, `exchangeRate`, `rateDate`, `rateSource`, and `rateSnapshotId`; all existing required headers remain unchanged.
- A normalized monetary row retains `transactionSellingPrice`, `baseSellingPrice`, `currency`, `baseCurrency`, `exchangeRate`, `rateDate`, `rateSource`, and `rateSnapshotId`. The existing `sellingPrice` normalized field remains the base amount committed to `Item.sellingPrice`.
- Inline foreign rates use `IMPORT`; referenced snapshots must belong to the tenant and exactly match currency, base currency, rate, and rate date.

- [x] Add failing service tests proving legacy rows normalize and commit unchanged at tenant base/rate 1, foreign rows preview exact base equivalents, same-currency non-1 rates fail, incomplete/malformed FX tuples fail row-by-row, unsupported currencies fail, and cross-tenant/mismatched snapshots fail.
- [x] Run `corepack pnpm --filter @ledgerbyte/api test --runInBand src/migration-toolkit/migration-toolkit.service.spec.ts` and confirm the new assertions fail for missing FX normalization.
- [x] Implement FX normalization using shared currency normalization plus `convertTransactionToBaseAmount`; load only tenant-scoped organization/rate evidence into validation context.
- [x] Add failing tests for a single serializable transaction, atomic rollback, and two concurrent commit attempts where only one claim succeeds.
- [x] Run the focused suite and confirm those tests fail because commit currently loops outside a transaction.
- [x] Move the status claim, record creation, row updates, final job update, and audit record into one Prisma transaction. Claim `READY_FOR_REVIEW -> VALIDATING` with `updateMany`; rollback restores review state, while a losing concurrent request returns a conflict and creates nothing.
- [x] Run the focused suite and confirm all migration-toolkit tests pass.
- [x] Update the local import document with the optional columns, exact rate direction, preview/base-price semantics, append-only snapshot policy, and explicit unsupported accounting-document imports.
- [x] Commit as `feat: add reviewed FX import previews`.

### Task 2: Finance-first FX import preview UI

**Files:**
- Modify: `apps/web/src/app/(app)/settings/import-export/page.test.tsx`
- Modify: `apps/web/src/app/(app)/settings/import-export/page.tsx`
- Modify: `apps/web/src/lib/types.ts` only if a named normalized-row interface materially improves safety.

**Interfaces:**
- For product/service previews, render compact row evidence for transaction price/currency, rate/date/source, and base price/base currency from `normalizedJson`.
- Existing import types and legacy preview/commit behavior remain unchanged.

- [x] Use Lazyweb evidence for accountant import-review tables before changing the screen; retain LedgerByte's existing dense design primitives.
- [x] Add failing UI tests for foreign base-equivalent evidence, legacy rate-1 evidence, row errors, commit disabled until review, and no implicit commit.
- [x] Run `corepack pnpm --filter @ledgerbyte/web test --runInBand -- 'src/app/\\(app\\)/settings/import-export/page.test.tsx'` and confirm the evidence assertions fail.
- [x] Add a compact horizontally scrollable normalized-row review table and update the page copy from master-data-only price input to reviewed base-equivalent catalog import.
- [x] Run the focused web suite and confirm it passes.
- [x] Commit as `feat: show FX import review evidence`.

### Task 3: Authenticated public v1 currency and rate reads

**Files:**
- Create: `apps/api/src/public-api/dto/public-fx-read.dto.ts`
- Modify: `apps/api/src/public-api/public-api.controller.spec.ts`
- Modify: `apps/api/src/public-api/public-api.controller.ts`
- Modify: `apps/api/src/public-api/public-api.service.spec.ts`
- Modify: `apps/api/src/public-api/public-api.service.ts`
- Modify: `docs/api/PUBLIC_API_V1_READINESS.md`
- Modify: `docs/API_CATALOG.md`

**Interfaces:**
- `GET /public-api/v1/currencies` requires `currencies.read` and returns `{ baseCurrency, items, liveRateProviderEnabled: false }` with supported code/name/decimals and `isBaseCurrency`.
- `GET /public-api/v1/fx-rates?page&pageSize&transactionCurrency&rateDate` requires `fxRates.read` and returns explicit decimal/date strings plus standard `{ items, meta }` pagination. Maximum `pageSize` is `100`.
- Response mappers expose only `id`, `transactionCurrency`, `baseCurrency`, `rate`, `rateDate`, `source`, `sourceReference`, and `capturedAt` for a rate.

- [x] Add failing controller tests for all three class guards and the exact permissions on both new endpoints.
- [x] Add failing service tests for explicit mapping, decimal/date serialization, pagination metadata, tenant forwarding, optional filters, and absence of forbidden persistence fields.
- [x] Run `corepack pnpm --filter @ledgerbyte/api test --runInBand src/public-api/public-api.controller.spec.ts src/public-api/public-api.service.spec.ts` and confirm failure for the missing contract.
- [x] Implement the DTO/mappers, controller endpoints, and service delegation to `ForeignExchangeService`; keep all existing proof routes compatible.
- [x] Add/extend tenant-isolation HTTP coverage for organization A/B rate visibility and permission denial.
- [x] Run the public API and tenant-isolation focused suites and confirm they pass.
- [x] Update the API documents to state authenticated read-only FX scope, disabled API keys/OAuth/provider behavior, and no financial mutation surface.
- [x] Commit as `feat: expose authenticated FX read contracts`.

### Task 4: Standardized transactional FX audit evidence

**Files:**
- Modify: `apps/api/src/audit-log/audit-events.ts`
- Modify: `apps/api/src/audit-log/audit-log.service.spec.ts`
- Modify: `apps/api/src/foreign-exchange/fx-revaluation.service.spec.ts`
- Modify: `apps/api/src/foreign-exchange/fx-revaluation.service.ts`
- Modify: `apps/api/src/customer-payments/customer-payment-rules.spec.ts`
- Modify: `apps/api/src/customer-payments/customer-payment.service.ts`
- Modify: `apps/api/src/supplier-payments/supplier-payment-rules.spec.ts`
- Modify: `apps/api/src/supplier-payments/supplier-payment.service.ts`
- Modify the existing draft-update/finalize service specs and services for `sales-invoices`, `credit-notes`, `purchase-bills`, `purchase-debit-notes`, and `cash-expenses` only where each workflow supports draft FX context.
- Modify: `docs/AUDIT_LOG_COVERAGE_REVIEW.md`

**Interfaces:**
- Add standardized events: `DOCUMENT_FX_CONTEXT_CHANGED`, `DOCUMENT_FX_RATE_FROZEN`, `REALIZED_FX_POSTED`, `REALIZED_FX_REVERSED`, `FX_REVALUATION_PREVIEWED`, `FX_REVALUATION_REVIEWED`, `FX_REVALUATION_POSTED`, `FX_REVALUATION_REVERSED`, and `FX_REVALUATION_SUPERSEDED`.
- Add entity types `FxRevaluationRun` and `RealizedFxSettlement`; focused events supplement rather than replace existing general document/payment/journal events.
- Emit draft-change only when the normalized currency/rate tuple changes, freeze only when foreign evidence becomes posted/finalized, and realized events only when a non-zero FX journal effect exists.

- [x] Add failing audit-map tests for every new entity/action mapping and verify existing mappings remain stable.
- [x] Add failing workflow tests proving each focused event uses the same Prisma transaction executor and is absent for same-currency/rate-unchanged/no-FX paths.
- [x] Run the affected audit/document/payment/revaluation suites and confirm failures for missing focused evidence.
- [x] Implement the event catalogue and transactional emissions without adding an update-rate API.
- [x] Run every affected focused suite and confirm all pass.
- [x] Update the audit coverage document with exact event conditions, append-only rate correction behavior, and payload redaction limits.
- [x] Commit as `feat: standardize FX audit evidence`.

### Task 5: Complete FX accounting and product documentation

**Files:**
- Create: `docs/accounting/MULTI_CURRENCY_AND_FX_ACCOUNTING.md`
- Create: `docs/accounting/FX_RATE_DIRECTION_AND_ROUNDING.md`
- Create: `docs/accounting/REALIZED_FX_SETTLEMENTS.md`
- Modify: `docs/accounting/PERIOD_END_FX_REVALUATION.md`
- Create: `docs/product/WAFEQ_COMPETITOR_MULTI_CURRENCY_FOUNDATION.md`

**Interfaces:**
- Documents describe only behavior proven by merged Phases 1–7 and cross-link the exact detailed policies.

- [x] Write the accounting overview covering base versus transaction currency, supported documents, immutable evidence, base-balanced journals, reports, reversals, additive backfill, and explicit unsupported workflows.
- [x] Write the rate/rounding policy with `base = transaction × rate`, eight-place rate input, four-place half-up money rounding, tax/discount conversion order, and worked AED/SAR examples.
- [x] Write realized settlement policy with full and partial customer/supplier examples, carrying basis after revaluation, idempotency, correction/reversal, and missing-account fail-closed behavior.
- [x] Add a numeric revaluation-then-partial-settlement example and explicit non-compliance wording to the existing revaluation document.
- [x] Write the Wafeq-competitor product document around proven LedgerByte capabilities and limitations; do not make uncited current-market claims.
- [x] Add a documentation contract test or deterministic content scan asserting all required paths and mandatory policy phrases.
- [x] Run the documentation contract and `git diff --check`.
- [x] Commit as `docs: complete multi-currency accounting guidance`.

### Task 6: Phase 7 integration gate and publication

**Files:**
- Modify this plan's checkboxes as evidence becomes true.

- [x] Run Prisma generate/validate, full API/web/package tests, API/web/workspace typechecks, full build, focused browser import review, diff check, and high-risk secret scan.
- [ ] Request an independent whole-Phase-7 accounting/security/API review and resolve every Critical or Important finding test-first.
- [ ] Push `codex/multi-currency-fx-import-api-audit`, open a ready PR, wait for all CI, merge only while green and mergeable, fetch `origin/main`, and prove the Phase 7 head reachable.
- [ ] Preserve the clean worktree until hosted rollout evidence is complete; remove only merged worktrees/branches with proven reachability.
