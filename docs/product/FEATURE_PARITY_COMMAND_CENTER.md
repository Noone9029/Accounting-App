# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

Date: 2026-06-13

## Current Route

1. Truthful core completed in `main` through PR `#27` dedicated customer and supplier statement routes.
2. Banking 2.0 parser QA and match-suggestion foundation completed in `main` through PR `#28`.
3. VAT return truthfulness and filing-export foundation completed in `main` through PR `#29`.
4. Production trust foundation audit, object-storage proof validation, and backup/restore proof harness completed through PRs `#30`, `#31`, and `#32`.
5. Production-trust proof work is paused after PR `#32`.
6. Current route: Wafeq-style manual banking feature parity, now on cheque lifecycle after card settlements merged.
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

## Current Parity Branch

Branch: `codex/wafeq-banking-cheque-lifecycle`

Base after update: `main` at `3b14ed8a` (`Merge pull request #38 from Noone9029/codex/wafeq-banking-card-settlements`)

Scope:

- Wafeq-style manual banking foundation only.
- Manual cheque lifecycle for received and issued cheques.
- Draft, received, issued, deposited, cleared, bounced, and voided cheque statuses with explicit operator actions.
- Received cheques can be explicitly linked to draft bank deposit batches through cheque source lines.
- Cheques can be explicitly matched to one same-account, same-currency, same-amount imported statement row.
- Matching is direction-aware: received cheques match credit rows, while issued cheques match debit rows.
- Closed reconciliation periods block match, unmatch, and linked void changes.
- Journal-backed cheque clearing is deferred until cheque-in-hand, outstanding-cheque, and clearing-account classifications are explicitly designed and tested.
- Controlled-beta banking docs and tests only. No live feeds, bank APIs, bank credentials, WIO/Lean/Tarabut integration, payment initiation, provider abstraction, cheque printing, cheque book inventory, silent auto-reconciliation, silent auto-match, or production claim.

Still not parity:

- No live bank feed, external aggregation, WIO/Lean/Tarabut integration, bank API call, or bank credential handling in the manual clone route.
- No certified bank-specific parser coverage, raw-file archive implementation, DB-level unique statement fingerprint/index, automatic matching execution, journal-backed undeposited-funds clearing for deposits, journal-backed card settlement posting, journal-backed cheque clearing, transfer fees, or FX flow.
- No production hosting implementation, paid SaaS launch gate, official VAT filing readiness, or ZATCA execution/compliance claim.

## Operating Notes

- Prefer parity work that increases trust in real accounting workflows over cosmetic route churn.
- Reuse existing accounting math and posting behavior unless a future arc explicitly scopes those areas.
- Keep controlled-beta wording explicit. Do not treat parity progress as production-readiness proof.

## Exact Next Recommended Prompt Title

`Wafeq manual banking accounting: clearing-account design for deposits cards and cheques`
