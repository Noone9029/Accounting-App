# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

Date: 2026-06-13

## Current Route

1. Truthful core completed in `main` through PR `#27` dedicated customer and supplier statement routes.
2. Banking 2.0 parser QA and match-suggestion foundation completed in `main` through PR `#28`.
3. VAT return truthfulness and filing-export foundation completed in `main` through PR `#29`.
4. Production trust foundation audit, object-storage proof validation, and backup/restore proof harness completed through PRs `#30`, `#31`, and `#32`.
5. Production-trust proof work is paused after PR `#32`.
6. Current route: Wafeq-style banking feature parity, now on deterministic bank rules after import safety hardening merged.
7. Later only: projects, fixed assets, payroll, mobile, AI/accountant assistant, and marketplace/API ecosystem work.

## Completed In Main

- PR `#27` merged into `main` at `16270562` and added dedicated `/customers/[id]/statement` and `/suppliers/[id]/statement` routes.
- Statement return-path continuity now survives invoice, bill, payment, and aging drill-downs without changing statement math, report math, payment allocation, VAT math, or ZATCA runtime behavior.
- PR `#28` merged into `main` at `848c210d` and added banking parser QA, deterministic non-mutating match suggestions, and scoped verification-gate repair.
- PR `#32` merged into `main` at `0bb4e721` and closed the backup/restore proof harness before the Wafeq banking route started.
- PR `#33` merged into `main` at `342120a9` and added Wafeq-style manual XLSX statement import plus downloadable template UX.
- PR `#34` merged into `main` at `43c428f6` and added Wafeq-style inline statement transaction review.
- PR `#35` merged into `main` at `44ff1d7a` and added manual import duplicate/idempotency/reconciliation safety hardening.

## Current Parity Branch

Branch: `codex/wafeq-banking-bank-rules-engine`

Base after update: `main` at `44ff1d7a` (`Merge pull request #35 from Noone9029/codex/wafeq-banking-import-safety-hardening`)

Scope:

- Wafeq-style manual banking foundation only.
- Deterministic bank rules for imported manual statement transactions.
- Rules are organization-scoped with optional bank account profile scope, priority, enabled/disabled state, explicit `autoApply: false`, safe condition fields, and suggestion actions.
- Dry-run returns suggestions without mutating statement rows.
- Explicit apply reuses existing categorize, ignore, and match behavior and records rule-application audit metadata.
- The bank account rules page and statement review panel make the manual-only, no-live-feed, no-payment-initiation boundary visible.
- Controlled-beta banking docs and tests only. No live feeds, bank APIs, bank credentials, WIO/Lean/Tarabut integration, payment initiation, bank deposits, cheques, card settlements, silent auto-reconciliation, silent auto-ignore, or production claim.

Still not parity:

- No live bank feed, external aggregation, WIO/Lean/Tarabut integration, bank API call, or bank credential handling.
- No certified bank-specific parser coverage, raw-file archive implementation, DB-level unique statement fingerprint/index, automatic matching execution, deposits, cheques, card settlements, transfer fees, or FX flow.
- No production hosting implementation, paid SaaS launch gate, official VAT filing readiness, or ZATCA execution/compliance claim.

## Operating Notes

- Prefer parity work that increases trust in real accounting workflows over cosmetic route churn.
- Reuse existing accounting math and posting behavior unless a future arc explicitly scopes those areas.
- Keep controlled-beta wording explicit. Do not treat parity progress as production-readiness proof.

## Exact Next Recommended Prompt Title

`Wafeq banking treasury: bank deposit batches`
