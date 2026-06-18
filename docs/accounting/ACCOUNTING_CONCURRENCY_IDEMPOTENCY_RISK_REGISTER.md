# Accounting Concurrency Idempotency Risk Register

Date: 2026-06-18

Scope: local-only API/service accounting mutation review. This register does not represent hosted or production behavior evidence.

| Area | Current local control | Regression evidence | Remaining gap |
| --- | --- | --- | --- |
| Sales invoice finalization | Conditional `DRAFT` and `journalEntryId: null` claim before journal creation | New duplicate-finalize regression plus existing sales invoice rules | No client idempotency key; no hosted multi-process run |
| Sales invoice voiding | Conditional status claim and reversal journal reuse path | Existing invoice void tests | More direct duplicate-void stress coverage could be added |
| Customer payment direct allocation | Conditional invoice balance decrement before payment/journal creation | New duplicate-payment allocation regression plus existing rollback tests | No external request identity/idempotency key |
| Customer payment unapplied allocation | Conditional payment and invoice balance claims | Existing customer payment rules | No request idempotency key |
| Credit note application | Conditional credit-note unapplied and invoice balance claims | Existing credit note rules | No request idempotency key |
| Purchase bill finalization | Conditional `DRAFT` and `journalEntryId: null` claim before journal creation | Existing purchase bill rules | No hosted multi-process run |
| Supplier payment direct allocation | Transaction rollback around payment/journal creation before bill balance claim | Existing supplier payment rules | Claim happens after journal/payment creation inside transaction; needs database-backed stress proof |
| Supplier payment unapplied allocation | Conditional payment and bill balance claims | Existing supplier payment rules | No request idempotency key |
| Purchase debit note application | Conditional debit-note unapplied and bill balance claims | Existing purchase debit note rules | No request idempotency key |
| Bank statement manual match | Conditional `UNMATCHED` claim added in this pass | New stale bank-match regression | No unique constraint preventing one journal line from being matched by multiple statement transactions |
| Bank statement categorization | Conditional unmatched claim inside transaction | Existing bank statement tests | Need broader duplicate categorize/ignore stress coverage |
| Bank reconciliation workflow | Status transition and closed-period checks | Existing reconciliation service tests | Needs duplicate close/reopen/void stress coverage |
| Journal posting/reversal | Status checks and reversal linkage | Existing journal rules | Needs dedicated duplicate post/reverse local regression |
| Attachments/generated documents | Tenant and permission checks from prior coverage | Tenant-isolation metadata tests | No new concurrency coverage in this pass |

## Design Follow-Ups

- Add a first-class idempotency-key contract for retryable accounting POST actions.
- Decide whether critical source-action uniqueness belongs in schema constraints, a transaction-lock helper, optimistic versioning, or a combination.
- Add staging/proof database stress tests only after approved staging credentials and synthetic tenant data exist.
- Keep schema/migration work blocked until explicitly approved.
