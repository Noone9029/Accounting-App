# Wafeq Banking Foundation Plan

Date: 2026-06-13

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
- deterministic bank rules for manual statement-transaction suggestions
- operational bank deposit batches for grouping receipt-like items and explicitly matching the batch to one imported bank statement credit row
- operational credit/prepaid card settlement records for paydowns, credits/refunds, and prepaid top-ups, with explicit statement-row matching

LedgerByte does not yet have:

- live bank feeds
- WIO, Lean, Tarabut, or other open-banking integrations
- payment initiation
- silent automatic bank-rule application
- cheque lifecycle
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

## Prompt 2 Completed Scope

This prompt adds a Wafeq-style inline statement transaction review workspace on the bank account statement rows page:

- imported statement rows can be reviewed in one table without opening each detail page first
- row status remains explicit for unmatched, matched, categorized, ignored, and needs-review rows
- debit, credit, amount direction, date, description, reference, bank reference, counterparty, and currency are visible inline
- filters now cover all, unmatched, matched, categorized, ignored, needs review, debit, and credit
- search covers description, reference, bank reference, and counterparty
- sorting covers date, amount, and status
- row-level match candidate preview reuses the existing match-candidates endpoint
- row-level match confirmation reuses the existing match endpoint
- row-level categorize and ignore reuse the existing single-row endpoints
- bulk ignore and bulk categorize loop through the existing single-row endpoints and report partial failures without hiding failed rows
- the full statement transaction detail page remains linked for exceptions

No backend endpoint, DTO, schema, posting-state, or reconciliation-state change was required for Prompt 2.

## Prompt 3 Completed Scope

This prompt hardens manual import safety before automation work:

- deterministic statement row identity now uses bank account profile, date, signed amount, currency, normalized description, reference, bank reference, and counterparty
- bank reference is preferred for high-confidence duplicate detection when present
- duplicate rows inside one file are flagged before import
- existing imported statement rows are detected as high-confidence or possible duplicates without adding a schema migration
- full import mode blocks invalid rows, existing duplicates, and closed-reconciliation overlaps
- partial import mode imports safe rows and reports skipped invalid, duplicate, and closed-period rows explicitly
- open reconciliation overlaps warn operators without changing reconciliation workflow states
- currency mismatches against the bank account currency are blocked as invalid rows
- the import page now shows importable rows, duplicate counts, existing duplicate counts, closed/open reconciliation overlap counts, row warning badges, and skipped-row result counts

No schema migration or DB-level unique fingerprint/index was added. A persisted fingerprint column plus unique index remains a future hardening task if import volume or concurrency risk requires database-enforced idempotency.

## Prompt 4 Completed Scope

This prompt adds deterministic bank rules for manual statement transactions. This is LedgerByte operational automation for controlled-beta operators, not a claim that public Wafeq evidence proves generic bank-rule parity.

- persistent organization-scoped rules with optional bank account profile scope
- rule priority, enabled/disabled state, safe condition fields, action type, explicit `autoApply: false`, and created/updated metadata
- condition support for direction, description contains, bounded description regex, reference, bank reference, counterparty, amount equality/range, currency, source format, and date range
- suggestion actions for categorize, ignore, and match-candidate review
- explicit apply endpoints that reuse existing categorize, ignore, and match service behavior
- rule dry-run behavior that evaluates recent unmatched statement rows without mutating transactions
- rule-application audit records for applied or failed explicit rule application
- bank account rules workspace at `/bank-accounts/[id]/rules`
- statement transaction review panel that loads rule suggestions per row and requires an explicit operator click before any row-changing action

The schema migration is additive and limited to bank rule storage plus rule application audit storage. It does not add live feeds, bank API calls, credentials, payment initiation, deposits, cards, cheques, reconciliation-state changes, VAT/ZATCA/report changes, or silent posting/reconciliation/ignore behavior.

## Prompt 5 Completed Scope

This prompt adds bank deposit batches as LedgerByte treasury workflow functionality. It is useful for businesses that group multiple receipts, cash items, or future cheque-like sources into one bank statement credit row, but it is not overclaimed as a publicly proven dedicated Wafeq deposit-batch module.

- persistent organization-scoped bank deposit batches and deposit batch lines
- draft, posted, matched, and voided operational statuses
- bank-account and currency validation
- positive line amount validation
- reusable source-identity protection for active batches
- source candidate visibility for existing posted customer payments
- manual line support for cash receipts, receipt references, cheque placeholders, and other clearing items
- explicit post action that moves the batch to posted operational status
- explicit match action that links one posted batch to one same-account, same-currency, same-amount imported credit statement row
- closed-reconciliation protection before matching, unmatching, or voiding a linked statement row
- unmatch behavior that returns the batch to posted status and statement row to unmatched when reconciliation rules allow it
- bank account deposit list and deposit detail workspaces at `/bank-accounts/[id]/deposits`
- on-demand statement transaction review link for candidate deposit batches on unmatched credit rows

The schema migration is additive and limited to `BankDepositBatch` and `BankDepositBatchLine` storage. Because the existing customer payment flow posts directly to the selected paid-through account and no confirmed undeposited-funds/clearing account model exists yet, Prompt 5 does not create journal entries. Journal-backed clearing movement remains deferred until the clearing-account model is explicitly designed and tested. This prompt does not add live feeds, bank API calls, credentials, payment initiation, card settlements, full cheque lifecycle, VAT/ZATCA/report changes, silent posting, silent matching, or automatic reconciliation.

## Prompt 6 Completed Scope

This prompt adds credit and prepaid card settlement workflows as LedgerByte treasury functionality aligned with Wafeq-style card account operations. It helps controlled-beta operators record card paydowns, card credits/refunds, and prepaid card top-ups, then explicitly link those records to imported manual statement rows.

- persistent organization-scoped card settlements
- settlement types for credit card paydown, credit card credit/refund, and prepaid card top-up
- draft, posted, matched, and voided operational statuses
- funding bank account and card/prepaid account validation
- positive amount, same-account, currency, and organization-scope guards
- explicit post and void actions
- explicit match action from one posted settlement to one same-account, same-currency, same-amount imported statement row
- direction-aware matching: paydowns/top-ups use funding-account debit rows, while card credits/refunds use card-account credit rows
- closed-reconciliation protection before matching, unmatching, or voiding linked statement rows
- card settlement list/detail workspaces at `/bank-accounts/[id]/card-settlements`
- on-demand statement transaction review links for candidate card settlements

The schema migration is additive and limited to `CardSettlement` storage. Prompt 6 intentionally does not create journal entries because existing bank account profiles only clearly support bank/cash/wallet/card profile metadata linked to posting accounts, while credit-card liability, prepaid-card asset, and card-clearing account classification needs an explicit accounting design before journal-backed settlement posting is safe. Card settlement posting is therefore operational status posting only. This prompt does not add live feeds, bank API calls, credentials, payment initiation, full credit-card expense management, statement-cycle billing, full cheque lifecycle, VAT/ZATCA/report changes, silent posting, silent matching, or automatic reconciliation.

## Not Included

This route still intentionally does not add:

- live bank feeds
- WIO, Lean, Tarabut, or provider integrations
- bank API calls
- bank credential collection or storage
- payment initiation
- silent automatic bank-rule application
- automatic reconciliation
- cheques
- full credit-card expense management
- credit-card statement-cycle billing
- reconciliation state changes
- journal-backed clearing movement for deposit batches
- journal-backed card settlement posting
- destructive schema migrations
- production or beta data mutation
- DB-level unique fingerprint constraints

## Dependency Decision

The repository did not already contain a statement XLSX parser dependency. The API package now uses `read-excel-file@9.2.0` only on the backend parser path so browser bundle scope stays unchanged. An initial `xlsx` package attempt was rejected after audit reported unpatched high-severity advisories. ExcelJS is dev-only for generated workbook tests.

## Next Prompt

`Wafeq banking treasury: cheque lifecycle`
