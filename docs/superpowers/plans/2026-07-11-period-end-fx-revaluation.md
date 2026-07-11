# Period-End FX Revaluation Implementation Plan

**Goal:** Preview, review, post, and safely reverse period-end revaluation of open foreign customer receivables and supplier payables while keeping posted source documents immutable and making later settlements realize FX against the adjusted carrying basis.

**Accounting method:** LedgerByte treats open foreign AR/AP as monetary items. A selected immutable closing-rate snapshot translates the open transaction balance into base currency. The delta from the current ledger carrying amount is posted to AR/AP and the configured unrealized gain or loss account. The source document's original base open balance is not rewritten. A separate tenant-scoped monetary carrying record becomes the operational basis for later settlement. Settlement clears that adjusted carrying amount, preserves the original source-base reduction separately, and recognizes only the difference between settlement value and the adjusted carrying value as realized FX.

**Safety boundaries:** Initial eligibility is finalized foreign-currency sales invoices and purchase bills only. Foreign bank balances, inventory, fixed assets, revenue, prepaids, live-rate providers, compliance, banking/payment providers, OCR, email, storage, webhooks, and money movement remain excluded. Revaluation reversal is allowed only while every affected carrying record still matches the posted run; downstream settlement or a later revaluation blocks reversal instead of reconstructing policy silently.

## Task 1 - Exact accounting rules and persistence contract

- [x] Add failing exact-decimal tests for receivable/payable gain and loss, partial open balances, mixed currencies, and zero differences.
- [x] Add failing schema/migration tests for tenant-scoped runs, lines, monetary carrying records, composite tenant foreign keys, immutable rate evidence, state/idempotency fields, and additive migration safety.
- [x] Extend settlement arithmetic to distinguish the source document base residual from the adjusted ledger carrying residual without changing unrevalued behavior.
- [x] Create an additive Prisma migration with checks, indexes, and no historical amount rewrite.

## Task 2 - Revaluation preview and review

- [x] Add guarded DTOs and APIs for list, detail, preview, and review.
- [x] Require one manually captured immutable rate snapshot per eligible foreign currency and one active run scope per organization/revaluation date.
- [x] Snapshot every eligible source's transaction open amount, current carrying base, closing rate, revalued base, counterparty, and gain/loss direction.
- [x] Fail closed for missing rates, inconsistent source/carrying state, tenant mismatch, invalid accounts, or non-open fiscal periods.

## Task 3 - Posting and safe reversal

- [x] Post a base-balanced journal to AR/AP and configured unrealized gain/loss accounts with source-level descriptions and immutable closing-rate evidence.
- [x] Atomically establish/update monetary carrying records only after frozen source state is revalidated.
- [x] Make preview/review/post/reverse idempotent and concurrency-safe.
- [x] Reverse the posted journal and restore prior carrying state only when no downstream settlement or later revaluation has changed it.
- [x] Emit explicit audit events for preview, review, post, and reversal.

## Task 4 - Settlement after revaluation

- [x] Make direct and unapplied customer/supplier allocations clear adjusted carrying basis while reducing the source document by its original base residual.
- [x] Persist carrying rate/snapshot, adjusted carrying amount, and source-base amount on every affected allocation.
- [x] Restore both carrying and source residuals exactly on supported allocation/payment reversals.
- [x] Block unsupported foreign balance mutations against an active revalued carrying layer rather than allowing drift.
- [x] Verify later partial/final settlement, rounding residuals, void/unallocation, idempotency, and period locks.

## Task 5 - Finance-first workspace

- [x] Add an FX revaluation workspace linked from Currencies and FX.
- [x] Use a compact exposure table showing source, counterparty, transaction open amount, current carrying base, selected closing rate, revalued base, and gain/loss.
- [x] Add explicit preview, review, post, and reverse controls with permission-aware disabled states, journal links, warnings, exceptions, and no-live-provider wording.
- [x] Cover loading, empty, error, RTL, and view-only states.

## Task 6 - Verification, review, and merge

- [x] Run Prisma generation/validation, focused suites, full API/web suites, workspace typecheck, production build, diff gate, and secret scan.
- [x] Obtain independent accounting/security review with zero Critical or Important findings.
- [x] Commit, push, open a ready PR, wait for green CI, merge, prove origin/main reachability, and clean the Phase 5 branch/worktree safely.
