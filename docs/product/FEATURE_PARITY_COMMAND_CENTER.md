# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

Date: 2026-06-12

## Current Route

1. Truthful core completed in `main` through PR `#27` dedicated customer and supplier statement routes.
2. Banking 2.0 parser QA and match-suggestion foundation completed in `main` through PR `#28`.
3. VAT return truthfulness and filing-export foundation completed in `main` through PR `#29`.
4. Production trust foundation audit and non-mutating readiness gate completed in `main` through PR `#30`.
5. Object storage proof validation is the current production-trust implementation branch.
6. Later only: projects, fixed assets, payroll, mobile, AI/accountant assistant, and marketplace/API ecosystem work.

## Completed In Main

- PR `#27` merged into `main` at `16270562` and added dedicated `/customers/[id]/statement` and `/suppliers/[id]/statement` routes.
- Statement return-path continuity now survives invoice, bill, payment, and aging drill-downs without changing statement math, report math, payment allocation, VAT math, or ZATCA runtime behavior.
- PR `#28` merged into `main` at `848c210d` and added banking parser QA, deterministic non-mutating match suggestions, and scoped verification-gate repair.

## Current Parity Branch

Branch: `codex/object-storage-proof-safe-nonproduction-validation`

Base after update: `main` at `4411634c` (`Merge pull request #30 from codex/production-trust-foundation-storage-backup-monitoring-security`)

Scope:

- Safe object-storage proof validation only.
- Local/mock upload-read-delete proof for synthetic attachment and generated-document payloads.
- No-network S3-compatible configuration-name validation only.
- Controlled-beta readiness/docs updates only. No provider mutation, bucket creation, real upload/download/delete, backup/restore execution, monitoring setup, or production claim.

Still not parity:

- No real non-production bucket proof, hosted backup/PITR proof, hosted restore drill proof, or object-storage restore proof.
- No production monitoring/alerting, runtime DB role proof, MFA/session hardening, immutable audit store, or SaaS billing/legal/support ownership.
- No production hosting implementation, paid SaaS launch gate, official VAT filing readiness, or ZATCA execution/compliance claim.

## Operating Notes

- Prefer parity work that increases trust in real accounting workflows over cosmetic route churn.
- Reuse existing accounting math and posting behavior unless a future arc explicitly scopes those areas.
- Keep controlled-beta wording explicit. Do not treat parity progress as production-readiness proof.

## Exact Next Recommended Prompt Title

`Production trust implementation ticket 2: backup and restore proof harness`
