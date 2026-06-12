# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

Date: 2026-06-12

## Current Route

1. Truthful core completed in `main` through PR `#27` dedicated customer and supplier statement routes.
2. Banking 2.0 parser QA and match-suggestion foundation in open PR `#28`.
3. VAT return truthfulness and filing-export foundation.
4. ZATCA signing, clearance, reporting, and custody execution lanes.
5. Production trust, operations, and broader customer exposure only after accounting and compliance depth are credible.

## Completed In Main

- PR `#27` merged into `main` at `16270562` and added dedicated `/customers/[id]/statement` and `/suppliers/[id]/statement` routes.
- Statement return-path continuity now survives invoice, bill, payment, and aging drill-downs without changing statement math, report math, payment allocation, VAT math, or ZATCA runtime behavior.

## Current Open Parity PR

Branch: `codex/banking-parser-qa-match-suggestion-foundation`

Base after update: `main` at `16270562` (`Merge pull request #27 from codex/dedicated-customer-supplier-statement-routes`)

Scope:

- Manual bank parser QA for CSV, JSON, OFX, CAMT.053/CAMT.054, MT940, and unsupported/plain-text safety.
- Deterministic, non-mutating bank statement match suggestions based on amount/direction, date tolerance, reference, counterparty text, and document-number signals.
- Controlled-beta readiness/docs updates only.

Still not parity:

- No live bank feeds, external bank APIs, Plaid, Salt Edge, Tarabut, Lean, or bank-provider calls.
- No raw customer bank-file archive execution.
- No automatic posting, matching, reconciliation, categorization, or journal creation.
- No certified bank-specific parser coverage, FX handling, transfer-fee handling, hosted/customer-data proof, or accountant sign-off.

## Operating Notes

- Prefer parity work that increases trust in real accounting workflows over cosmetic route churn.
- Reuse existing accounting math and posting behavior unless a future arc explicitly scopes those areas.
- Keep controlled-beta wording explicit. Do not treat parity progress as production-readiness proof.

## Exact Next Recommended Prompt Title

`VAT return truthfulness and filing-export foundation`
