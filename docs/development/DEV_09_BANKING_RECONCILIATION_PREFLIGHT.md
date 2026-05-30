# DEV-09 Banking Reconciliation Preflight

Status: completed read-only preflight
Date: 2026-05-30
Latest commit inspected: `23c09f97 Close DEV-08 AP local evidence`

## Scope

This preflight maps the committed banking/reconciliation implementation before any DEV-09 local fixture mutation. It is documentation and code inspection only.

Actions not performed: bank-account creation or edits, statement import or preview execution, transaction match/categorize/ignore, reconciliation create/submit/approve/close/void, browser E2E, smoke, migrations, seed/reset/delete, deploys, environment changes, production/beta/shared-target access, customer data access, real bank files, email, ZATCA, backup/restore, exports, downloads, PDF generation, or raw body printing.

The approved next mutation phrase is:

`I approve DEV-09 Part 2 local-only banking reconciliation fixture mutation under marker DEV09-BANK-20260530T000000. No production, no beta, no customer data.`

## Repository State

- `git fetch origin` completed and `main` matched `origin/main`.
- Latest inspected commit: `23c09f97 Close DEV-08 AP local evidence`.
- Unrelated untracked web/marketing and graphify files were present before this work and left untouched.
- DEV-08Z final closure identifies DEV-09 banking/reconciliation readiness as the next branch.

## Module Map

API banking modules:

- `apps/api/src/bank-accounts/*`
  - Bank account profile list/detail/create/update/archive/reactivate.
  - Opening-balance posting with journal creation and fiscal-period guard.
- `apps/api/src/bank-transfers/*`
  - Bank transfer create and void.
  - Transfer creation posts a journal; void posts/reuses a reversal journal and reverses the original journal status.
- `apps/api/src/bank-statements/*`
  - Manual statement parser, preview/import, import void, statement transaction detail, match candidates, match, categorize, ignore, and reconciliation summary.
  - Parser supports detected CSV, JSON, OFX, CAMT, MT940, and unknown-format warnings.
- `apps/api/src/bank-reconciliations/*`
  - Reconciliation create/list/detail/items/review-events/report-data plus submit, approve, reopen, close, void, CSV, and PDF endpoints.
  - CSV/PDF routes require reconciliation view plus runtime export/download permission.
- `apps/api/src/accounting/*`
  - Journal rules and posting primitives used by opening balances, transfers, and categorization.
- `apps/api/prisma/schema.prisma`
  - Banking models: `BankAccountProfile`, `BankTransfer`, `BankStatementImport`, `BankStatementTransaction`, `BankReconciliation`, `BankReconciliationReviewEvent`, and `BankReconciliationItem`.

Web banking routes:

- `/bank-accounts`
- `/bank-accounts/new`
- `/bank-accounts/[id]`
- `/bank-accounts/[id]/edit`
- `/bank-accounts/[id]/statement-imports`
- `/bank-accounts/[id]/statement-transactions`
- `/bank-accounts/[id]/reconciliation`
- `/bank-accounts/[id]/reconciliations`
- `/bank-accounts/[id]/reconciliations/new`
- `/bank-transfers`
- `/bank-transfers/new`
- `/bank-transfers/[id]`
- `/bank-statement-transactions/[id]`
- `/bank-reconciliations/[id]`

Shared/frontend support:

- `apps/web/src/lib/bank-accounts.ts`
- `apps/web/src/lib/bank-statements.ts`
- `apps/web/src/lib/permissions.ts`
- `packages/shared/src/permissions.ts`
- `tests/e2e/banking-flow.spec.ts` exists but was not run.

## State-Machine Inventory

### Bank Account Profiles

- Statuses: `ACTIVE`, `ARCHIVED`.
- Create requires an active posting asset account and rejects duplicate profile per account.
- Update can change profile metadata and opening-balance fields before the opening balance is posted.
- Archive moves `ACTIVE -> ARCHIVED`.
- Reactivate moves `ARCHIVED -> ACTIVE`.
- Opening-balance post is one-time, requires active profile, non-zero opening balance, opening-balance date, allowed fiscal period, and owner-equity account `310`; it creates a posted journal.
- Permissions:
  - view: `bankAccounts.view`
  - create/update/archive/reactivate: `bankAccounts.manage`
  - transactions: `bankAccounts.transactions.view`
  - opening-balance post: `bankAccounts.openingBalance.post`

### Bank Transfers

- Statuses: `POSTED`, `VOIDED`.
- Create immediately posts a transfer journal.
- Create rejects same source/destination, archived profiles, invalid linked accounts, currency mismatch, non-positive amount, and fiscal-period-blocked dates.
- Void moves `POSTED -> VOIDED`, posts/reuses one reversal journal, and marks the original journal `REVERSED`.
- Repeated void returns the existing voided transfer.
- Permissions:
  - view: `bankTransfers.view`
  - create: `bankTransfers.create`
  - void: `bankTransfers.void`

### Statement Import And Transactions

- Import statuses: `IMPORTED`, `PARTIALLY_RECONCILED`, `RECONCILED`, `VOIDED`.
- Transaction statuses: `UNMATCHED`, `MATCHED`, `CATEGORIZED`, `IGNORED`, `VOIDED`.
- Transaction types: `DEBIT`, `CREDIT`.
- Match types include `JOURNAL_LINE`, `MANUAL_JOURNAL`, `CASH_EXPENSE`, `CUSTOMER_PAYMENT`, `SUPPLIER_PAYMENT`, `CUSTOMER_REFUND`, `SUPPLIER_REFUND`, `BANK_TRANSFER`, and `OTHER`.
- Preview parses provided synthetic text/rows and is expected not to persist rows.
- Import creates an import row and valid statement transaction rows; invalid rows require partial-import behavior if allowed.
- Import rejects rows in closed reconciliation periods and requires an active bank profile.
- Import void marks non-voided transactions and the import as `VOIDED`; it rejects matched/categorized rows and closed periods.
- Match changes `UNMATCHED -> MATCHED` and links an existing posted journal line.
- Categorize changes `UNMATCHED -> CATEGORIZED`, posts a manual journal, sets categorization fields, and honors fiscal-period guards.
- Ignore changes `UNMATCHED -> IGNORED` and stores an ignored reason.
- Match/categorize/ignore reject non-unmatched rows and closed periods.
- Permissions:
  - view/list/detail/summary: `bankStatements.view`
  - preview: `bankStatements.previewImport`
  - import: `bankStatements.import`
  - manage/import void: `bankStatements.manage`
  - reconcile actions: `bankStatements.reconcile`

### Bank Reconciliation

- Statuses: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `CLOSED`, `VOIDED`.
- Create creates a non-overlapping draft for an active profile and computes ledger closing balance/difference.
- Submit moves `DRAFT -> PENDING_APPROVAL`; it rejects non-zero differences, unmatched rows, and closed-period overlap. The controller currently uses `bankReconciliations.close`.
- Approve moves `PENDING_APPROVAL -> APPROVED`; self-approval is blocked unless the role has full access.
- Reopen moves `PENDING_APPROVAL|APPROVED -> DRAFT`.
- Close moves `APPROVED -> CLOSED`; it recomputes ledger/difference, rejects non-zero difference or unmatched rows, blocks closed overlap, snapshots matched/categorized/ignored rows into reconciliation items, and creates review events.
- Void moves any non-voided reconciliation to `VOIDED`; it is administrative and does not reverse categorized journals.
- Permissions:
  - view/list/items/review-events/report-data: `bankReconciliations.view`
  - create: `bankReconciliations.create`
  - submit/close: `bankReconciliations.close`
  - approve: `bankReconciliations.approve`
  - reopen: `bankReconciliations.reopen`
  - void: `bankReconciliations.void`
  - CSV/PDF output: runtime `reports.export` or `generatedDocuments.download`

## Existing Coverage

API coverage exists for:

- Bank account profile validation, duplicate rejection, transaction running balances, archive/reactivate, tenant isolation, opening-balance posting, and duplicate/edit blockers.
- Bank transfer posting, invalid profile/currency/amount/fiscal blockers, and idempotent void/reversal.
- Statement parser CSV, JSON, OFX, CAMT, MT940, unsafe-format warning behavior, and no raw-body echo behavior.
- Statement import, preview no-persistence, partial import, closed-period import rejection, match candidates, manual match, categorization journal, fiscal guard, ignore, import void lock, summary totals, and tenant isolation.
- Reconciliation draft creation, overlap rejection, submit, blockers, approve/self-approval blocker, close blockers and snapshots, reopen, void, review events, tenant isolation, report data, PDF archive, controller permissions, and export guard.

Web coverage exists for helper formatting and banking route guidance pages, including bank account detail, statement import, statement transaction detail, reconciliation summary/detail, and bank transfer detail.

E2E readiness exists only as a reference file:

- `tests/e2e/banking-flow.spec.ts` logs in, reads `/bank-accounts`, skips detail smoke if no seeded account exists, and visits account detail, statement imports, reconciliation summary, and reconciliations list.
- `tests/e2e/global-setup.ts` can seed demo workflows when configured, so it is not safe for this preflight.
- E2E was intentionally skipped because it requires login/audit-writing and can seed local demo workflows.

## E2E Readiness

Current readiness:

- Route surfaces exist for the banking workflow.
- API and web unit coverage already exercises most state machines.
- DEV-01 route QA previously listed all 14 banking/reconciliation routes and found shell route-load coverage, but not authenticated browser-runtime proof.
- Parser groundwork has sanitized fixture coverage and fixture governance.

Gaps before safe browser E2E:

- A marker-scoped local fixture set is needed for bank profiles, statement imports/transactions, match/categorize/ignore candidates, and reconciliation lifecycle.
- E2E must avoid real bank files and should use synthetic inline data only.
- Login/audit-writing and seeded workflow setup need explicit local-only approval and count-based evidence.
- The existing E2E global setup can seed workflows; future E2E runs need a narrow, documented configuration.
- No production, beta, shared target, or customer-data E2E should be inferred from local fixture evidence.

## Production Gap Register

- Real bank feeds: no live bank-feed integration, external bank aggregation API, OAuth bank connection, webhook ingestion, or background sync is implemented.
- Parser robustness: CSV/JSON/OFX/CAMT/MT940 support is manual and fixture-based; target-bank certification and broad sanitized sample coverage remain open.
- Duplicate import/idempotency: duplicate detection behavior exists in parser/import checks but needs marker-scoped evidence and product policy for production repeats.
- Raw-file handling: raw statement-file archive policy remains design-only; no production raw-file object-storage archive workflow is proven.
- Auto-match: only manual match candidates/actions are proven by code/tests; no automatic matching or bank-feed reconciliation claim should be made.
- Reconciliation locking: closed-period guards exist, but production concurrency/load and multi-user race behavior are not proven.
- Audit trails: services log key actions, but a full restricted-role and audit-log review matrix is still needed.
- Permission edges: submit currently reuses close permission; report output has a dual route/runtime gate; restricted-role browser proof remains open.
- Fiscal/accounting locks: posting paths use fiscal guards, but production-period, year-end, and concurrency certification remain open.
- Transfer policy: transfer fees, FX transfers, and multi-currency conversion are not implemented/proven.
- Cleanup policy: marker-scoped local evidence should be preserved by default; no destructive cleanup is approved in DEV-09.
- Customer-data handling: no production, beta, hosted/shared, or customer bank data has been inspected or used.
- Output workflows: reconciliation CSV/PDF/download/archive behavior remains output-producing and should stay behind separate approval unless explicitly included later.

## Recommended Part 2 Fixture Scope

Use marker `DEV09-BANK-20260530T000000` and local-only DB target proof before any write:

- Create/select one fake local organization and user context if needed.
- Create two synthetic posting asset accounts only if existing safe accounts are not enough.
- Create one or two fake active bank account profiles with masked/test account values only.
- Create one synthetic statement import with several transactions:
  - one candidate for match,
  - one candidate for categorization,
  - one candidate for ignore,
  - one reconciliation-ready row.
- Create a compatible posted journal only if needed for match candidates.
- Do not import real files.
- Do not match, categorize, ignore, submit, approve, close, void, run E2E, or produce output in Part 2.
- Record counts, safe prefixes, statuses, journal/audit counts, and temp-script cleanup only.

## Part 2 Outcome Note

Part 2 completed under exact approval using marker `DEV09-BANK-20260530T000000`. Evidence is recorded in [DEV_09_BANKING_RECONCILIATION_FIXTURE_MUTATION_EVIDENCE.md](DEV_09_BANKING_RECONCILIATION_FIXTURE_MUTATION_EVIDENCE.md).

The local-only fixture mutation created one fake organization/user/role, two synthetic posting accounts, one fake active bank profile, one synthetic statement import, three unmatched synthetic statement transactions, and one posted synthetic journal entry for a future match candidate. It did not create reconciliations and did not run match/categorize/ignore or reconciliation workflows.

## Verification Plan

Required for this part:

- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check` if anything is staged

Skipped by design:

- E2E, smoke, full tests, full build, browser login, API service startup, database migrations, seed/reset/delete, statement import execution, reconciliation mutations, report exports/downloads/PDFs, production/beta/customer-data checks, real email, ZATCA, backup/restore, and deploys.
