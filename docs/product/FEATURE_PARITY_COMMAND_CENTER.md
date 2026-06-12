# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

Date: 2026-06-12

## Current Route

1. Truthful core completed in `main` through PR `#27` dedicated customer and supplier statement routes.
2. Banking 2.0 parser QA and match-suggestion foundation completed in `main` through PR `#28`.
3. VAT return truthfulness and filing-export foundation on the current open branch.
4. ZATCA signing, clearance, reporting, and custody execution lanes.
5. Production trust, operations, and broader customer exposure only after accounting and compliance depth are credible.

## Completed In Main

- PR `#27` merged into `main` at `16270562` and added dedicated `/customers/[id]/statement` and `/suppliers/[id]/statement` routes.
- Statement return-path continuity now survives invoice, bill, payment, and aging drill-downs without changing statement math, report math, payment allocation, VAT math, or ZATCA runtime behavior.
- PR `#28` merged into `main` at `848c210d` and added banking parser QA, deterministic non-mutating match suggestions, and scoped verification-gate repair.

## Current Open Parity PR

Branch: `codex/vat-return-truthfulness-filing-export-foundation`

Base after update: `main` at `848c210d` (`Merge pull request #28 from codex/banking-parser-qa-match-suggestion-foundation`)

Scope:

- Truthful VAT Return wording that stays draft/internal-review only.
- Safe internal CSV export foundation for VAT Return using existing finalized-document report data only.
- VAT Summary/VAT Return terminology alignment, review guidance, and controlled-beta readiness/docs updates only.

Still not parity:

- No official VAT filing format.
- No tax-authority submission workflow or filing approval workflow.
- No ZATCA filing execution, signing, PDF-A3, or compliance approval.
- No accountant/tax advisor sign-off, hosted/customer-data proof, or broad reports E2E/load proof.

## Operating Notes

- Prefer parity work that increases trust in real accounting workflows over cosmetic route churn.
- Reuse existing accounting math and posting behavior unless a future arc explicitly scopes those areas.
- Keep controlled-beta wording explicit. Do not treat parity progress as production-readiness proof.

## Exact Next Recommended Prompt Title

`Production trust foundation: storage backup monitoring and security gate`
