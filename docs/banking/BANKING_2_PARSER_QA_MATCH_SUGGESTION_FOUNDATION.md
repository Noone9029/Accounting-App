# Banking 2.0 Parser QA And Match Suggestion Foundation

Date: 2026-06-12

Status: controlled-beta foundation. This is parser QA and deterministic suggestion groundwork only; it is not a live bank feed, bank-certified parser program, automatic reconciliation feature, or production banking claim.

## Scope Completed

- Expanded targeted API parser tests for existing manual formats: CSV, JSON, unsupported plain text, OFX, CAMT.053/CAMT.054, and MT940.
- Covered debit/credit column aliases, signed amount columns, decimal comma handling, date-times, balances where already parsed, references, counterparties, multiline MT940 narratives, missing `FITID`, missing CAMT direction, duplicate import candidates, unsupported format errors, malformed JSON, and empty statement text.
- Extracted match candidate scoring into a pure helper at `apps/api/src/bank-statements/bank-statement-match-suggestions.ts`.
- Reused the pure helper in the existing `GET /bank-statement-transactions/:id/match-candidates` path.
- Kept suggestions non-mutating: no match, categorize, ignore, reconcile, post, or journal behavior runs from the suggestion helper.

## Match Suggestion Signals

- Exact amount and opposite bank-line direction.
- Date inside the existing seven-day tolerance window, with stronger ranking for same-day matches.
- Same reference text.
- Normalized counterparty text.
- Invoice, bill, payment, fee, transfer, receipt, and reference-style document numbers in statement or journal descriptions.
- Already reviewed statement rows are excluded by returning no suggestions unless the row is still `UNMATCHED`.

## Safety Boundaries

- No live bank feed was added.
- No external bank API or aggregator was connected.
- No raw bank file body storage was added.
- No database schema or migration was changed.
- No production, beta, or customer data was read or mutated.
- No posted bank ledger math, reconciliation close/void accounting behavior, ZATCA behavior, email, deploy, or infrastructure setting changed.

## Remaining Banking Blockers

- Live bank feeds.
- Certified bank-specific parser coverage from approved sanitized target-bank exports.
- Raw-file archive execution with reviewed storage, access control, audit, and retention.
- Transfer fees and FX handling.
- Hosted/beta/customer-data proof.
- Accountant sign-off on parser import UX, match suggestion wording, reconciliation terminology, and close/void policy.
