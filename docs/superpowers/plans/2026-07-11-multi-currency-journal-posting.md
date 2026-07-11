# Multi-Currency Journal Posting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Post supported foreign-currency operating documents into balanced base-currency journals while preserving their immutable transaction amounts, captured rate, dimensions, and reversal evidence.

**Architecture:** `JournalEntry.currency`, `totalDebit`, `totalCredit`, and each line's existing `debit`/`credit` remain base-currency accounting truth. `JournalLine.currency` and `exchangeRate` identify the transaction context; additive `transactionDebit`, `transactionCredit`, tenant-scoped `rateSnapshotId`, and bounded source-component rounding evidence preserve the source calculation. Immutable journal-creation provenance permits only the initial nested line insert into a newly posted journal. Document builders emit both sides explicitly, and payment/refund/manual-journal posting stays blocked until their dedicated accounting phases.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Decimal.js, Jest, Next.js.

## Global Constraints

- Base amount equals transaction amount multiplied by the captured rate, using Decimal arithmetic and four-place half-up rounding.
- Existing posted journals and document accounting amounts are never rewritten.
- Existing dimensions survive posting and reversal.
- Payments/refunds, live providers, compliance, banking providers, OCR, email, storage, webhooks, and money movement remain disabled or untouched.
- All schema changes are additive; same-currency compatibility uses rate `1`.

---

### Task 1: Journal FX persistence and core invariants

**Files:**
- Create: `apps/api/prisma/migrations/20260711130000_add_journal_line_fx_amounts/migration.sql`
- Create: `apps/api/src/accounting/journal-fx-persistence-schema.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/accounting-core/src/index.ts`
- Modify: `apps/api/src/accounting/journal-rules.spec.ts`

**Interfaces:**
- Produces: `JournalLineInput.transactionDebit`, `transactionCredit`, and `rateSnapshotId`.
- Produces: reversal behavior that swaps base and transaction debit/credit while preserving currency, rate, snapshot, tax, cost center, and project.
- Produces: database guards that derive omitted same-currency transaction amounts and reject incomplete or inconsistent foreign context.

- [x] Add failing schema tests for additive columns, tenant-scoped snapshot FK/index, same-currency backfill, no historical debit/credit rewrite, and replacement journal guards.
- [x] Add failing core tests for transaction/base reversal preservation and transaction-context validation.
- [x] Add the Prisma fields and additive migration, backfilling historical lines from existing base amounts at rate `1` without touching existing debit/credit.
- [x] Extend accounting-core line contracts and reversal logic.
- [x] Run `corepack pnpm --filter @ledgerbyte/api test -- --runInBand src/accounting/journal-fx-persistence-schema.spec.ts src/accounting/journal-rules.spec.ts` and `corepack pnpm --filter @ledgerbyte/api db:generate`.

### Task 2: Supported document posting builders

**Files:**
- Modify and test: `apps/api/src/sales-invoices/sales-invoice-accounting.ts`, `sales-invoice-rules.spec.ts`
- Modify and test: `apps/api/src/purchase-bills/purchase-bill-accounting.ts`, `purchase-bill-rules.spec.ts`
- Modify and test: `apps/api/src/credit-notes/credit-note-accounting.ts`, `credit-note-rules.spec.ts`
- Modify and test: `apps/api/src/purchase-debit-notes/purchase-debit-note-accounting.ts`, `purchase-debit-note-rules.spec.ts`
- Modify and test: `apps/api/src/cash-expenses/cash-expense-accounting.ts`, `cash-expense-rules.spec.ts`

**Interfaces:**
- Consumes: base and transaction document line totals plus captured FX context.
- Produces: base-balanced and transaction-balanced journal lines with no second conversion.

- [x] Add failing AED-base USD invoice and SAR-base USD bill builder assertions, including tax and captured snapshot context.
- [x] Add failing credit-note, debit-note, cash-expense, same-currency, and rounding assertions.
- [x] Update builders to emit base `debit/credit` plus transaction `transactionDebit/transactionCredit`, currency, rate, snapshot, and dimensions.
- [x] Verify each builder with its focused Jest suite.

### Task 3: Posting, persistence, and reversals

**Files:**
- Modify: `apps/api/src/sales-invoices/sales-invoice.service.ts`
- Modify: `apps/api/src/purchase-bills/purchase-bill.service.ts`
- Modify: `apps/api/src/credit-notes/credit-note.service.ts`
- Modify: `apps/api/src/purchase-debit-notes/purchase-debit-note.service.ts`
- Modify: `apps/api/src/cash-expenses/cash-expense.service.ts`
- Modify: `apps/api/src/accounting/accounting.service.ts`
- Add focused service tests beside the affected modules.

**Interfaces:**
- Consumes: Task 2 journal lines.
- Produces: posted journal headers denominated in organization base currency and lines carrying transaction context.

- [x] Add failing service tests proving foreign document finalization writes a base header, immutable transaction lines, and snapshot linkage.
- [x] Remove the base-only guard only from the five supported document paths; retain it for payments, refunds, opening balances, and manual unsupported paths.
- [x] Persist transaction fields and snapshot links in all supported journal create/reversal helpers.
- [x] Assert period locks before posting and preserve idempotent/concurrency claims.
- [x] Run focused API service and accounting suites plus API typecheck.

### Task 4: Finance-first posting UI

**Files:**
- Modify and test: `apps/web/src/app/(app)/sales/invoices/[id]/page.tsx`
- Modify and test: `apps/web/src/app/(app)/purchases/bills/[id]/page.tsx`
- Modify and test: `apps/web/src/app/(app)/sales/credit-notes/[id]/page.tsx`
- Modify and test: `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.tsx`
- Modify: `apps/web/src/lib/document-fx.ts`

**Interfaces:**
- Consumes: Phase 3 posting readiness.
- Produces: enabled finalize actions for complete foreign drafts while retaining transaction/base context and clear frozen-rate messaging.

- [x] Replace prior fail-closed posting tests with enabled-finalization tests for complete foreign drafts.
- [x] Remove the Phase 2 posting blocker from the four supported detail workflows without changing provider/compliance messaging.
- [x] Run the four page suites, document FX tests, and web typecheck.

### Task 5: Verification, independent review, and merge

**Files:**
- Restore generated-only `apps/web/next-env.d.ts` churn if present.

- [x] Run Prisma generation, focused package tests, full API/web suites, workspace typecheck, production build, diff checks, and secret scans.
- [x] Obtain independent accounting/security review covering base balance, transaction evidence, rounding, reversal, tenant isolation, migration safety, period locks, dimensions, and scope boundaries.
- [x] Fix only evidenced findings and repeat affected/full gates.
- [ ] Commit, push, open a ready PR, wait for all CI checks, merge only when green, and refresh `origin/main` before Phase 4.
