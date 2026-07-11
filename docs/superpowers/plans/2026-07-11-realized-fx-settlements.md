# Realized FX Settlements Implementation Plan

**Goal:** Settle foreign customer and supplier documents at captured payment rates, recognize reproducible realized gains/losses for full and partial allocations, and reverse every accounting effect safely.

**Architecture:** Existing document/payment totals, open balances, journal headers, and journal `debit`/`credit` remain organization-base-currency truth. Add transaction open/unapplied balances and immutable allocation snapshots for transaction amount, document carrying base, settlement base, recognition/settlement rates, and realized gain/loss. Direct allocations post inside the payment journal; later unapplied allocations create a dedicated reversible FX adjustment journal. Same-currency behavior stays rate-one compatible.

**Boundaries:** Payment and document transaction currencies must match. Manual journals, opening balances, live rates, banking/payment providers, compliance, OCR, email, storage, webhooks, and money movement remain untouched. Phase 5 revaluation carrying-basis policy is not invented here.

## Task 1 — Persistence, backfill, and exact settlement arithmetic

- [x] Add failing schema tests for transaction open/unapplied balances, allocation evidence, tenant FKs, reversal links, and safe backfill preflights.
- [x] Add exact Decimal tests for customer/supplier gains, losses, same-rate, partial/final residual allocation, and missing configuration.
- [x] Add an additive migration that backfills only provable compatibility states and stops on historical foreign settlements needing review.
- [x] Implement shared carrying/settlement allocation arithmetic with no floating point.

## Task 2 — Customer direct payments

- [x] Add failing service tests for AED-base USD gain/loss, partial settlement, same-rate/no-FX, concurrency, period lock, tenant denial, and missing FX accounts.
- [x] Resolve/freeze payment FX context and compute transaction/base/unapplied amounts.
- [x] Atomically decrement invoice base and transaction balances and persist allocation snapshots.
- [x] Post base-balanced cash, AR, and realized gain/loss lines with transaction evidence.
- [x] Preserve all evidence through payment void/reversal.

## Task 3 — Supplier direct payments

- [x] Mirror the customer assertions for SAR-base USD bills and supplier gain/loss direction.
- [x] Atomically decrement bill base/transaction balances and persist snapshots.
- [x] Post AP, cash, and realized gain/loss lines and preserve reversal evidence.

## Task 4 — Unapplied allocation and correction

- [x] Apply transaction-currency unapplied credit using immutable payment/document carrying values.
- [x] Create at most one FX adjustment journal per allocation and make retries/concurrency fail closed or replay safely.
- [x] Reverse the adjustment journal and restore both transaction/base balances exactly once.
- [x] Add audit evidence for settlement calculation, FX posting, and reversal through immutable before/after allocation snapshots.

## Task 5 — Existing refund workflows

- [x] Enable only refund paths whose source payment/note and correction model can preserve the same FX evidence.
- [x] Keep unsupported combinations fail-closed with honest messages.
- [x] Verify refund/void reversals do not duplicate realized FX.

## Task 6 — Finance-first UI

- [x] Use Lazyweb evidence before changing payment forms/details.
- [x] Add payment currency/rate/date/source, exact base preview, realized gain/loss preview, and frozen journal evidence.
- [x] Show transaction and base open/unapplied balances without misleading aggregation.
- [x] Keep incomplete rate/configuration and unsupported currency combinations disabled.

## Task 7 — Verification, review, and merge

- [x] Run Prisma generation, focused suites, full API/web suites, workspace typecheck, production build, diff gate, and secret scan.
- [x] Obtain independent accounting/security review with zero Critical/Important findings.
- [ ] Commit, push, open a ready PR, wait for green CI, merge, prove origin/main reachability, and clean safely.
