# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

Date: 2026-06-13

## Current Route

1. Truthful core completed in `main` through PR `#27` dedicated customer and supplier statement routes.
2. Banking 2.0 parser QA and match-suggestion foundation completed in `main` through PR `#28`.
3. VAT return truthfulness and filing-export foundation completed in `main` through PR `#29`.
4. Production trust foundation audit, object-storage proof validation, and backup/restore proof harness completed through PRs `#30`, `#31`, and `#32`.
5. Production-trust proof work is paused after PR `#32`.
6. Current route: Wafeq-style manual banking feature parity, now on clearing-account accounting after cheque lifecycle merged.
7. Later only: projects, fixed assets, payroll, mobile, AI/accountant assistant, and marketplace/API ecosystem work.

## Completed In Main

- PR `#27` merged into `main` at `16270562` and added dedicated `/customers/[id]/statement` and `/suppliers/[id]/statement` routes.
- Statement return-path continuity now survives invoice, bill, payment, and aging drill-downs without changing statement math, report math, payment allocation, VAT math, or ZATCA runtime behavior.
- PR `#28` merged into `main` at `848c210d` and added banking parser QA, deterministic non-mutating match suggestions, and scoped verification-gate repair.
- PR `#32` merged into `main` at `0bb4e721` and closed the backup/restore proof harness before the Wafeq banking route started.
- PR `#33` merged into `main` at `342120a9` and added Wafeq-style manual XLSX statement import plus downloadable template UX.
- PR `#34` merged into `main` at `43c428f6` and added Wafeq-style inline statement transaction review.
- PR `#35` merged into `main` at `44ff1d7a` and added manual import duplicate/idempotency/reconciliation safety hardening.
- PR `#36` merged into `main` at `dcf8a3d1` and added deterministic bank rules for manual statement transaction suggestions.
- PR `#37` merged into `main` at `d86c9394` and added operational bank deposit batches with explicit statement-credit matching.
- PR `#38` merged into `main` at `3b14ed8a` and added operational credit/prepaid card settlements with explicit direction-aware statement-row matching.
- PR `#39` merged into `main` at `4fb018b8` and added operational received/issued cheque lifecycle with deposit-batch links and direction-aware statement-row matching.

## Current Parity Branch

Branch: `codex/wafeq-banking-clearing-account-accounting`

Base after update: `main` at `4fb018b8` (`Merge pull request #39 from Noone9029/codex/wafeq-banking-cheque-lifecycle`)

Scope:

- Wafeq-style manual banking foundation only.
- Clearing-account configuration for existing chart-account selections.
- Accounting preflight for bank deposit batches, card settlements, and cheques.
- Explicit journal posting for safe configured deposit and card settlement cases only.
- Deposit posting moves safe configured sources into the bank account without duplicating revenue or mutating AR/AP allocation.
- Credit-card paydown posting moves from credit-card liability to funding bank; prepaid-card top-up posting moves from funding bank to prepaid asset.
- Direct cheque journal posting remains conservative and operational-only until source receivable/payable/payment policy is explicit.
- Card credits/refunds remain operational-only until an explicit offset account policy exists.
- Controlled-beta banking docs and tests only. No live feeds, bank APIs, bank credentials, WIO/Lean/Tarabut integration, payment initiation, provider abstraction, provider callbacks, silent auto-posting, silent auto-reconciliation, silent auto-match, or production claim.

Still not parity:

- No live bank feed, external aggregation, WIO/Lean/Tarabut integration, bank API call, or bank credential handling in the manual clone route.
- No certified bank-specific parser coverage, raw-file archive implementation, DB-level unique statement fingerprint/index, automatic matching execution, automatic journal posting, direct cheque source accounting, card credit/refund offset posting, transfer fees, or FX flow.
- No production hosting implementation, paid SaaS launch gate, official VAT filing readiness, or ZATCA execution/compliance claim.

## Operating Notes

- Prefer parity work that increases trust in real accounting workflows over cosmetic route churn.
- Reuse existing accounting math and posting behavior unless a future arc explicitly scopes those areas.
- Keep controlled-beta wording explicit. Do not treat parity progress as production-readiness proof.

## Exact Next Recommended Prompt Title

`Wafeq manual banking polish: reconciliation reports and audit trail`
