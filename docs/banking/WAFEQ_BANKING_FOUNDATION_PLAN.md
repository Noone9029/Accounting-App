# Wafeq Banking Foundation Plan

Date: 2026-06-12

Status: controlled-beta manual banking parity plan. This document does not claim Wafeq equivalence, live bank-feed support, production banking readiness, bank certification, or customer-data readiness.

## Route

The active banking direction is Wafeq-style banking feature parity, starting with smoother manual bank statement import rather than live-feed infrastructure.

Approved route:

1. XLSX statement import plus downloadable bank template UX.
2. Inline statement transaction review workspace.
3. Import duplicate/idempotency/reconciliation safety hardening.
4. Bank rules engine.
5. Bank deposit batches.
6. Credit/prepaid card settlement flows.
7. Cheque lifecycle.
8. Bank-feed provider abstraction.
9. Lean/WIO/Tarabut sandbox integration later.

## Current LedgerByte Baseline

LedgerByte already has:

- bank account profiles, balances, opening balances, and bank transfers
- manual statement imports
- statement transactions
- manual matching, categorization, and ignore actions
- reconciliation draft, submit, approve, close, void, lock, and report behavior
- manual CSV/JSON/text plus limited OFX/CAMT/MT940 parser groundwork
- deterministic non-mutating match suggestions

LedgerByte does not yet have:

- live bank feeds
- WIO, Lean, Tarabut, or other open-banking integrations
- payment initiation
- automatic bank rules
- bank deposit batches
- cheque lifecycle
- card settlement workflows
- certified target-bank parser coverage

## Prompt 1 Completed Scope

This prompt adds Wafeq-style manual import polish:

- downloadable CSV statement template from the bank statement import page
- canonical manual statement columns: `date`, `description`, `reference`, `bankReference`, `debit`, `credit`, `amount`, `balance`, `counterparty`, `currency`
- guidance that users can use either debit/credit columns or signed amount
- guidance for ISO dates such as `YYYY-MM-DD`
- guidance for ISO currencies such as `SAR`, `AED`, and `USD`
- explicit wording that no bank credentials are needed
- explicit wording that this is manual statement import, not a live bank feed
- XLSX upload support through the existing server preview/import path
- first-worksheet parsing with warning when additional sheets are ignored
- empty-row ignore behavior
- safe malformed-workbook warnings
- existing CSV/JSON/OFX/CAMT/MT940 behavior preserved

## Not Included

This prompt intentionally does not add:

- live bank feeds
- WIO, Lean, Tarabut, or provider integrations
- bank API calls
- bank credential collection or storage
- payment initiation
- bank rules
- bank deposits
- cheques
- card settlements
- reconciliation state changes
- accounting posting logic changes
- schema migrations
- production or beta data mutation

## Dependency Decision

The repository did not already contain a statement XLSX parser dependency. The API package now uses `read-excel-file@9.2.0` only on the backend parser path so browser bundle scope stays unchanged. An initial `xlsx` package attempt was rejected after audit reported unpatched high-severity advisories. ExcelJS is dev-only for generated workbook tests.

## Next Prompt

`Wafeq banking foundation: inline statement transaction review workspace`
