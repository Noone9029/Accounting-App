# Feature Parity Command Center

Status: controlled-beta feature-parity tracker. This document does not claim production parity with Xero, Wafeq, banks, ZATCA, or any certified integration.

## Banking 2.0 Foundation - 2026-06-12

Branch: `codex/banking-parser-qa-match-suggestion-foundation`

Base: `main` at `b0f312fc` (`Merge pull request #26 from codex/controlled-beta-statement-workspace-polish`)

### Shipped In This Arc

- PR `#26` was already merged into `main`; no additional merge action was needed before this branch was cut.
- Manual bank parser QA was expanded for CSV, JSON, plain text unsupported handling, OFX, CAMT.053/CAMT.054, and MT940.
- Parser coverage now includes debit/credit column variants, signed amount columns, decimal comma amounts, date-times, balance fields where already supported, reference/counterparty extraction, multiline narratives, missing reference warnings, duplicate candidate warnings, unsupported-format safety, empty-file handling, and ambiguous direction handling.
- Deterministic match-suggestion scoring was extracted into a pure non-mutating API helper and reused by the existing match-candidates endpoint.
- Match suggestions now rank exact amount/opposite bank-line direction, date tolerance, reference matches, normalized counterparty text, and document-number matches in descriptions.
- Already reviewed statement rows such as matched, categorized, ignored, and voided rows return no suggestions.

### Still Not Parity

- No live bank feeds were added.
- No external bank API or aggregator was connected.
- No Plaid, Salt Edge, Tarabut, Lean, or bank-provider call exists in this arc.
- No raw customer bank file archive execution was added.
- No automatic posting, matching, reconciliation, categorization, or journal creation was added.
- No certified bank-specific parser coverage is claimed.
- Transfer fees, FX handling, hosted/customer-data proof, and accountant sign-off remain blockers.

### Next Feature-Parity Priority

`VAT return truthfulness and filing-export foundation`
