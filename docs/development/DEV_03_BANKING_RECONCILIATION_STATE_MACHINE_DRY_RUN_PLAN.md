# DEV-03 Banking/Reconciliation State-Machine Dry-Run Plan

## 1. Purpose And Scope

This document converts the Banking/Reconciliation state-machine inventory into a dry-run QA plan. It is planning only: no login, fixture creation, API mutation, import, preview-import execution, reconciliation action, bank transfer, PDF generation, archive creation, download, export, ZATCA action, email action, migration, seed, reset, delete, deploy, or environment change was performed.

Scope is limited to:

- Bank account profile create/edit/archive/reactivate and opening-balance posting behavior.
- Bank transfer create/void behavior.
- Bank statement parse/preview/import/void boundaries.
- Bank statement transaction match/categorize/ignore behavior.
- Bank reconciliation create/submit/approve/reopen/close/void behavior.
- Bank reconciliation report data/CSV/PDF/archive gates as deferred output workflows.
- Visible permissions, audit-log side effects, accounting side effects, reconciliation side effects, and fixture requirements for a later approved local-only mutation run.

Source evidence inspected for this dry-run plan:

- [DEV-03 state-machine QA inventory](DEV_03_STATE_MACHINE_QA_INVENTORY.md)
- [DEV-03 safe fixture/login/audit policy](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md)
- [DEV-03 AR dry-run plan](DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md)
- [DEV-03 AP dry-run plan](DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md)
- `apps/api/prisma/schema.prisma`
- `apps/api/src/bank-accounts/*`
- `apps/api/src/bank-transfers/*`
- `apps/api/src/bank-statements/*`
- `apps/api/src/bank-reconciliations/*`
- `apps/web/src/app/(app)/bank-accounts/*`
- `apps/web/src/app/(app)/bank-transfers/*`
- `apps/web/src/app/(app)/bank-statement-transactions/*`
- `apps/web/src/app/(app)/bank-reconciliations/*`
- `apps/web/src/lib/bank-accounts.ts`
- `apps/web/src/lib/bank-statements.ts`
- `packages/shared/src/permissions.ts`
- `apps/web/src/lib/permissions.ts`
- `tests/e2e/banking-flow.spec.ts` as reference only; it was not run
- `BUG_AUDIT.md`

## 2. Safety Rules For This Banking/Reconciliation Dry-Run Plan

- This plan is local-disposable only by default and does not approve mutation QA by itself.
- Do not use production, beta/user-testing, shared, or customer data.
- Do not login until a future batch explicitly approves login/audit-log writes.
- Do not create fixture records yet.
- Do not run seed/reset/delete, migrations, smoke, E2E, exports, downloads, PDF generation, ZATCA, email, backup/restore, deploys, or environment changes.
- Do not create, edit, import, preview-import, reconcile, submit, approve, close, void, reverse, match, categorize, ignore, transfer, export, download, upload, delete, or migrate anything during this planning part.
- Every future fixture name, display label, memo, note, reference, filename, statement description, or reconciliation note must start with `DEV03-BANK-` where the field accepts a human-readable marker.
- Any future evidence must avoid tokens, cookies, auth headers, DB URLs, request/response bodies containing customer/vendor/bank data, raw statement bodies, attachment bodies, generated PDF bodies, generated CSV bodies, and real account data.
- Preview-import checks must stay separate from import checks. Preview is expected to prove no persistence; import and every downstream status change require explicit mutation approval.
- Reconciliation report CSV/PDF checks are output-producing, and PDF generation archives a generated-document row. Keep those in a later output-approved batch.

## 3. Banking/Reconciliation Workflow Map

### Bank Account Profiles

- Routes: `/bank-accounts`, `/bank-accounts/new`, `/bank-accounts/[id]`, `/bank-accounts/[id]/edit`.
- Related routes: `/bank-accounts/[id]/statement-imports`, `/bank-accounts/[id]/statement-transactions`, `/bank-accounts/[id]/reconciliation`, `/bank-accounts/[id]/reconciliations`, `/bank-accounts/[id]/reconciliations/new`.
- Web surfaces: `apps/web/src/app/(app)/bank-accounts/*`, `apps/web/src/components/forms/bank-account-profile-form.tsx`, and `apps/web/src/lib/bank-accounts.ts`.
- API controller/service: `apps/api/src/bank-accounts/bank-account.controller.ts` and `apps/api/src/bank-accounts/bank-account.service.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /bank-accounts`
  - `PATCH /bank-accounts/:id`
  - `POST /bank-accounts/:id/archive`
  - `POST /bank-accounts/:id/reactivate`
  - `POST /bank-accounts/:id/post-opening-balance`
  - `GET /bank-accounts`, `GET /bank-accounts/:id`, and `GET /bank-accounts/:id/transactions` as assertion endpoints.
- Status/state fields:
  - `BankAccountProfile.status`: `ACTIVE`, `ARCHIVED`.
  - `openingBalance`, `openingBalanceDate`, `openingBalanceJournalEntryId`, and `openingBalancePostedAt`.
- Allowed transitions visible from code:
  - Create a profile for one active posting asset account; duplicate profile for the same linked account is rejected.
  - Update profile metadata and opening-balance fields only while the opening balance has not been posted.
  - Archive `ACTIVE -> ARCHIVED`.
  - Reactivate `ARCHIVED -> ACTIVE` after linked account validation.
  - Post opening balance once when profile is active, opening balance is non-zero, opening date exists, fiscal period allows posting, and owner equity account `310` exists.
  - Duplicate opening-balance post and opening-balance edits after posting are rejected.
- Permissions:
  - List/detail: `bankAccounts.view`.
  - Create/update/archive/reactivate: `bankAccounts.manage`.
  - Transactions: `bankAccounts.transactions.view`.
  - Opening-balance posting: `bankAccounts.openingBalance.post`.
- Audit/log side effects: service logs `CREATE`, `UPDATE`, `ARCHIVE`, `REACTIVATE`, and `POST_OPENING_BALANCE` for `BankAccountProfile`.
- Accounting impact:
  - Create/update/archive/reactivate do not post ledger entries.
  - Opening-balance posting creates a posted journal with bank/equity lines and is blocked by fiscal-period rules.
- Bank reconciliation impact:
  - Archived profiles cannot be used for statement import, transfer, or reconciliation creation paths that require active profiles.
  - Opening-balance journals affect ledger closing balance and reconciliation difference.
- Output/document impact:
  - None directly.

### Bank Transfers

- Routes: `/bank-transfers`, `/bank-transfers/new`, `/bank-transfers/[id]`.
- Web surfaces: `apps/web/src/app/(app)/bank-transfers/*` and `apps/web/src/lib/bank-accounts.ts`.
- API controller/service: `apps/api/src/bank-transfers/bank-transfer.controller.ts` and `apps/api/src/bank-transfers/bank-transfer.service.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /bank-transfers`
  - `POST /bank-transfers/:id/void`
  - `GET /bank-transfers` and `GET /bank-transfers/:id` as assertion endpoints.
  - `GET /bank-accounts/:id/transactions` as ledger-movement assertion endpoint.
- Status/state fields:
  - `BankTransfer.status`: `POSTED`, `VOIDED`.
  - `journalEntryId`, `voidReversalJournalEntryId`, `postedAt`, `voidedAt`.
- Allowed transitions visible from code:
  - Create immediately as `POSTED`.
  - Reject same source/destination profile.
  - Reject archived profiles, non-asset or non-posting linked accounts, inactive linked accounts, non-positive amount, currency mismatch, and fiscal-period blocked transfer dates.
  - Void `POSTED -> VOIDED`.
  - Void creates or reuses one reversal journal and marks the original transfer journal `REVERSED`.
  - Repeated void on an already voided transfer returns the existing voided transfer.
- Permissions:
  - List/detail: `bankTransfers.view`.
  - Create: `bankTransfers.create`.
  - Void: `bankTransfers.void`.
- Audit/log side effects: service logs `CREATE` and `VOID` for `BankTransfer`.
- Accounting impact:
  - Create posts debit destination bank account and credit source bank account.
  - Void posts a reversal journal and changes original journal status to `REVERSED`.
- Bank reconciliation impact:
  - Transfer journals can become statement match candidates.
  - Voids change ledger balances and can change open reconciliation differences.
- Output/document impact:
  - None directly.

### Statement Import, Parse, Preview, Import, And Void Boundary

- Routes: `/bank-accounts/[id]/statement-imports`, `/bank-accounts/[id]/statement-transactions`, `/bank-statement-transactions/[id]`.
- Web surfaces: `apps/web/src/app/(app)/bank-accounts/[id]/statement-imports/page.tsx`, `apps/web/src/app/(app)/bank-accounts/[id]/statement-transactions/page.tsx`, `apps/web/src/app/(app)/bank-statement-transactions/[id]/page.tsx`, and `apps/web/src/lib/bank-statements.ts`.
- API controller/service: `apps/api/src/bank-statements/bank-account-statement.controller.ts`, `apps/api/src/bank-statements/bank-statement-import.controller.ts`, `apps/api/src/bank-statements/bank-statement-transaction.controller.ts`, and `apps/api/src/bank-statements/bank-statement.service.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /bank-accounts/:bankAccountProfileId/statement-imports/preview`
  - `POST /bank-accounts/:bankAccountProfileId/statement-imports`
  - `POST /bank-statement-imports/:id/void`
  - `GET /bank-accounts/:bankAccountProfileId/statement-imports`, `GET /bank-statement-imports/:id`, `GET /bank-accounts/:bankAccountProfileId/statement-transactions`, and `GET /bank-statement-transactions/:id` as assertion endpoints.
- Status/state fields:
  - `BankStatementImport.status`: `IMPORTED`, `PARTIALLY_RECONCILED`, `RECONCILED`, `VOIDED`.
  - `BankStatementTransaction.status`: `UNMATCHED`, `MATCHED`, `CATEGORIZED`, `IGNORED`, `VOIDED`.
  - `BankStatementTransaction.type`: `DEBIT`, `CREDIT`.
  - `BankStatementTransaction.matchType`: `JOURNAL_LINE`, `MANUAL_JOURNAL`, `CASH_EXPENSE`, `CUSTOMER_PAYMENT`, `SUPPLIER_PAYMENT`, `CUSTOMER_REFUND`, `SUPPLIER_REFUND`, `BANK_TRANSFER`, `OTHER`.
- Allowed transitions visible from code:
  - Preview parses CSV/JSON/OFX/CAMT/MT940-style input, validates rows, reports invalid rows/warnings, and is expected not to create database rows.
  - Import creates a `BankStatementImport` as `IMPORTED` and creates valid statement rows as `UNMATCHED`.
  - Import rejects invalid rows unless `allowPartial` is set, rejects zero valid rows, rejects rows inside closed reconciliation periods, and requires an active bank account profile.
  - Import status refreshes from transaction statuses: all unmatched or no rows means `IMPORTED`; mixed unmatched and reconciled states means `PARTIALLY_RECONCILED`; no unmatched rows means `RECONCILED`.
  - Void import marks non-voided rows as `VOIDED` and import as `VOIDED`.
  - Void import rejects rows inside closed reconciliation periods and rejects imports after any transaction is `MATCHED` or `CATEGORIZED`.
- Permissions:
  - Statement import/transaction list/detail/summary: `bankStatements.view`.
  - Preview: `bankStatements.previewImport`.
  - Import: `bankStatements.import`.
  - Import void: `bankStatements.manage`.
- Audit/log side effects:
  - Preview has no visible audit-log write.
  - Import logs `IMPORT` for `BankStatementImport`.
  - Import void logs `VOID` for `BankStatementImport`.
- Accounting impact:
  - Preview and import do not create ledger journals.
  - Import persists statement rows only.
  - Import void does not reverse ledger entries; it voids statement import/transaction rows.
- Bank reconciliation impact:
  - Imported rows become inputs for match/categorize/ignore and reconciliation close.
  - Rows inside closed reconciliation periods are blocked for import and void.
- Output/document impact:
  - Raw statement file bodies are not archived by this flow; BUG_AUDIT notes raw statement archive implementation remains intentionally unimplemented and no live bank feeds exist.

### Statement Transaction Match, Categorize, And Ignore

- Routes: `/bank-accounts/[id]/statement-transactions`, `/bank-statement-transactions/[id]`.
- Web surfaces: `apps/web/src/app/(app)/bank-accounts/[id]/statement-transactions/page.tsx`, `apps/web/src/app/(app)/bank-statement-transactions/[id]/page.tsx`, and `apps/web/src/lib/bank-statements.ts`.
- API controller/service: `apps/api/src/bank-statements/bank-statement-transaction.controller.ts` and `apps/api/src/bank-statements/bank-statement.service.ts`.
- API endpoints in scope for later approved mutation QA:
  - `GET /bank-statement-transactions/:id/match-candidates`
  - `POST /bank-statement-transactions/:id/match`
  - `POST /bank-statement-transactions/:id/categorize`
  - `POST /bank-statement-transactions/:id/ignore`
  - `GET /bank-statement-transactions/:id` and reconciliation summary endpoints as assertions.
- Status/state fields:
  - `BankStatementTransaction.status`: `UNMATCHED`, `MATCHED`, `CATEGORIZED`, `IGNORED`, `VOIDED`.
  - `matchedJournalLineId`, `matchedJournalEntryId`, `matchType`, `categorizedAccountId`, `createdJournalEntryId`, `ignoredReason`.
- Allowed transitions visible from code:
  - Match candidates read posted ledger lines for the same organization, same linked bank account, matching amount/direction, and a +/- 7 day date window.
  - Match changes `UNMATCHED -> MATCHED`, sets journal-line/journal-entry references, and sets `matchType` to `JOURNAL_LINE`.
  - Categorize changes `UNMATCHED -> CATEGORIZED`, creates a posted manual journal, sets `categorizedAccountId`, `createdJournalEntryId`, and `matchType` to `MANUAL_JOURNAL`.
  - Ignore changes `UNMATCHED -> IGNORED` and stores `ignoredReason`.
  - Match/categorize/ignore reject closed reconciliation periods.
  - Match/categorize/ignore reject non-unmatched rows.
  - Categorize rejects inactive or non-posting categorization accounts and honors fiscal-period posting rules.
- Permissions:
  - Detail: `bankStatements.view`.
  - Match candidates, match, categorize, and ignore: `bankStatements.reconcile`.
- Audit/log side effects: service logs `MATCH`, `CATEGORIZE`, and `IGNORE` for `BankStatementTransaction`.
- Accounting impact:
  - Match does not create a journal; it links to an existing posted journal line.
  - Categorize creates a posted journal that debits or credits the bank account according to statement direction and posts the opposite side to the selected account.
  - Ignore does not create a journal.
- Bank reconciliation impact:
  - Match/categorize/ignore remove transactions from the unmatched bucket and can allow submit/close when difference is zero.
  - Categorization can change ledger balance, so it can also change reconciliation difference.
- Output/document impact:
  - None directly.

### Bank Reconciliation Lifecycle

- Routes: `/bank-accounts/[id]/reconciliation`, `/bank-accounts/[id]/reconciliations`, `/bank-accounts/[id]/reconciliations/new`, `/bank-reconciliations/[id]`.
- Web surfaces: `apps/web/src/app/(app)/bank-accounts/[id]/reconciliation/page.tsx`, `apps/web/src/app/(app)/bank-accounts/[id]/reconciliations/*`, `apps/web/src/app/(app)/bank-reconciliations/[id]/page.tsx`, and `apps/web/src/lib/bank-statements.ts`.
- API controller/service: `apps/api/src/bank-reconciliations/bank-account-reconciliation.controller.ts`, `apps/api/src/bank-reconciliations/bank-reconciliation.controller.ts`, and `apps/api/src/bank-reconciliations/bank-reconciliation.service.ts`.
- API endpoints in scope for later approved mutation QA:
  - `POST /bank-accounts/:bankAccountProfileId/reconciliations`
  - `POST /bank-reconciliations/:id/submit`
  - `POST /bank-reconciliations/:id/approve`
  - `POST /bank-reconciliations/:id/reopen`
  - `POST /bank-reconciliations/:id/close`
  - `POST /bank-reconciliations/:id/void`
  - `GET /bank-accounts/:bankAccountProfileId/reconciliations`, `GET /bank-reconciliations/:id`, `GET /bank-reconciliations/:id/items`, `GET /bank-reconciliations/:id/review-events`, and `GET /bank-accounts/:bankAccountProfileId/reconciliation-summary` as assertion endpoints.
- Output endpoints to keep deferred:
  - `GET /bank-reconciliations/:id/report-data`
  - `GET /bank-reconciliations/:id/report.csv`
  - `GET /bank-reconciliations/:id/report.pdf`
- Status/state fields:
  - `BankReconciliation.status`: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `CLOSED`, `VOIDED`.
  - `statementOpeningBalance`, `statementClosingBalance`, `ledgerClosingBalance`, `difference`.
  - `submittedById`, `approvedById`, `reopenedById`, `closedById`, `voidedById`, and matching timestamps.
  - `BankReconciliationReviewEvent.action`: `SUBMIT`, `APPROVE`, `REOPEN`, `CLOSE`, `VOID`.
  - `BankReconciliationItem.statusAtClose`, `amount`, `type`.
- Allowed transitions visible from code:
  - Create reconciliation as `DRAFT` for an active bank account profile and non-overlapping period.
  - Create computes ledger closing balance and difference from statement closing balance.
  - Submit `DRAFT -> PENDING_APPROVAL`.
  - Submit rejects non-zero difference, unmatched statement transactions in the period, and overlap with another closed reconciliation.
  - Approve `PENDING_APPROVAL -> APPROVED`.
  - Approve rejects self-approval unless the request role has full access.
  - Reopen `PENDING_APPROVAL|APPROVED -> DRAFT`, clearing submitted/approved fields and storing optional reopen reason.
  - Close `APPROVED -> CLOSED`.
  - Close recomputes ledger closing balance and difference, rejects non-zero difference, rejects unmatched statement transactions, blocks overlap with closed periods, snapshots matched/categorized/ignored statement transactions into reconciliation items, and writes a review event.
  - Void any non-voided reconciliation to `VOIDED`.
  - Void does not reverse categorized journals; BUG_AUDIT identifies voiding reconciliation as administrative only.
- Permissions:
  - List/detail/items/review-events/report-data: `bankReconciliations.view`.
  - Create: `bankReconciliations.create`.
  - Submit: currently `bankReconciliations.close` in the controller.
  - Approve: `bankReconciliations.approve`.
  - Reopen: `bankReconciliations.reopen`.
  - Close: `bankReconciliations.close`.
  - Void: `bankReconciliations.void`.
  - CSV/PDF endpoints have route metadata for `bankReconciliations.view` and an additional runtime guard requiring `reports.export` or `generatedDocuments.download`.
- Audit/log side effects: service logs `CREATE`, `SUBMIT`, `APPROVE`, `REOPEN`, `CLOSE`, and `VOID` for `BankReconciliation`; review-event rows are also created for lifecycle review actions.
- Accounting impact:
  - Create/submit/approve/reopen/close/void do not directly create ledger journals.
  - Close snapshots statement transaction status rather than mutating journals.
  - Categorized statement transactions created before reconciliation can already have posted journals.
- Bank reconciliation impact:
  - Closed reconciliations lock statement transaction changes and import void/status changes in their date range.
  - Voiding a closed reconciliation unlocks the period administratively without journal reversal.
- Output/document impact:
  - Report data is a read path.
  - CSV output is a download/export gate.
  - PDF output renders a bank reconciliation report and archives a generated document.

## 4. Proposed Local Disposable Fixtures

All fixture labels must use a single run id, for example `DEV03-BANK-20260523-001`. Actual fixture creation is not approved by this document.

- Organization marker: `DEV03-BANK-ORG-<runId>`.
- User marker: `dev03.bank.<runId>@ledgerbyte.local.test` with display name `DEV03-BANK-USER-<runId>`.
- Role marker: `DEV03-BANK-ROLE-<runId>` with only the needed banking/reconciliation permissions for the specific approved batch.
- Chart/account markers:
  - `DEV03-BANK-CASH-ACCOUNT-<runId>` as an active posting asset account.
  - `DEV03-BANK-CLEARING-ACCOUNT-<runId>` or expense/income account only if categorization is approved.
  - Owner equity account `310` must exist or a local fixture equivalent must be approved before opening-balance posting.
- Bank/cash account profile markers:
  - `DEV03-BANK-PRIMARY-<runId>`.
  - `DEV03-BANK-SECONDARY-<runId>`.
  - Optional `DEV03-BANK-ARCHIVED-<runId>` only if archive/reactivate testing is approved.
- Statement import marker:
  - Filename `DEV03-BANK-STATEMENT-<runId>.csv`.
  - Statement rows with descriptions and references beginning `DEV03-BANK-ROW-<runId>-NN`.
  - Use tiny fake amounts such as `10.0000` and `15.0000`; no real bank descriptions, account numbers, IBANs, or raw customer/vendor data.
- Statement transaction marker:
  - Matched row `DEV03-BANK-MATCH-<runId>`.
  - Categorized row `DEV03-BANK-CATEGORIZE-<runId>`.
  - Ignored row `DEV03-BANK-IGNORE-<runId>`.
- Transfer marker:
  - Description `DEV03-BANK-TRANSFER-<runId>`.
  - Use same-currency source/destination profiles.
- Reconciliation marker:
  - Notes `DEV03-BANK-RECON-<runId>`.
  - Period should be narrow and avoid known real activity; do not overlap any closed non-fixture reconciliation.
- Output marker:
  - Reconciliation report output, if later approved, must contain only fixture data and should not record PDF/CSV bodies in docs.

## 5. Dry-Run Test Matrix

| Workflow | Preconditions | Action to test in a later approved mutation run | Expected state before | Expected state after | Expected ledger/accounting effect | Expected reconciliation effect | Expected audit effect | Expected document/output effect | Rollback/cleanup expectation | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bank account profile create | Local disposable org, user, active posting asset account, no existing profile for account | Create `DEV03-BANK-PRIMARY-<runId>` profile | No profile for linked account | Profile `ACTIVE` | No journal | Profile available for transfer/import/reconciliation | `BankAccountProfile` `CREATE` log | None | Leave marked profile or archive/reactivate in approved cleanup | Planned only |
| Bank account profile edit | Existing marked active profile without posted opening balance | Edit display name/metadata/opening balance fields | Profile `ACTIVE`, `openingBalanceJournalEntryId` null | Metadata updated | No journal | No reconciliation status change | `UPDATE` log | None | Restore metadata through normal update if approved | Planned only |
| Bank account archive/reactivate | Existing marked profile | Archive, then reactivate | `ACTIVE` | `ARCHIVED`, then `ACTIVE` | No journal | Archived profile blocked for active-only workflows | `ARCHIVE` and `REACTIVATE` logs | None | End in `ACTIVE` or documented terminal state | Planned only |
| Opening-balance posting | Active marked profile with non-zero opening balance/date, allowed fiscal period, equity account available | Post opening balance once, then try duplicate post | `openingBalanceJournalEntryId` null | Posted journal id recorded; duplicate rejected | Posted bank/equity journal; period guard enforced | Ledger closing balance changes for future reconciliation | `POST_OPENING_BALANCE` log | None | Keep posted fixture as evidence; do not delete journal | Planned only |
| Bank transfer create | Two active same-currency marked profiles | Create transfer from primary to secondary | No transfer | Transfer `POSTED` with journal | Debit destination bank, credit source bank | Transfer journal can become match candidate | `BankTransfer` `CREATE` log | None | Void via normal app workflow if approved | Planned only |
| Bank transfer create rejection | Same source/destination, archived profile, currency mismatch, non-positive amount, or closed posting date | Attempt invalid transfer | No valid transfer | Rejected | No journal | No reconciliation change | Error only; no mutation expected | None | No cleanup if no row created | Planned only |
| Bank transfer void | Posted marked transfer | Void transfer twice | Transfer `POSTED`, original journal posted | Transfer `VOIDED`, one reversal journal linked; repeated void idempotent | Reversal journal posted; original journal `REVERSED` | Open reconciliation difference may change | `BankTransfer` `VOID` log on first void | None | End in `VOIDED` terminal state | Planned only |
| Statement import preview | Active marked profile, fake statement rows | Preview valid/invalid CSV/JSON rows | No import rows for marker | Preview summary only | No journal and no persistence expected | Warnings for closed-period rows; no status change | No visible audit log expected | None; raw body not archived | Prove no import/transaction count changed by marker | Planned only |
| Statement import | Active marked profile, valid rows outside closed reconciliation period | Import rows with `allowPartial` false and then true in separate approved cases | No import | Import `IMPORTED`; rows `UNMATCHED` | No journal | Rows appear in unmatched count | `BankStatementImport` `IMPORT` log | None; raw body not archived | Later void only if rows remain unmatched/ignored and period open | Planned only |
| Statement import void | Marked import with only unmatched or ignored rows and no closed-period overlap | Void import | Import `IMPORTED` or `PARTIALLY_RECONCILED` without matched/categorized rows | Import `VOIDED`; rows `VOIDED` | No journal reversal | Rows removed from active reconciliation counts | `BankStatementImport` `VOID` log | None | End in `VOIDED`; preserve audit evidence | Planned only |
| Statement import void rejection | Marked import with matched/categorized rows or row inside closed reconciliation period | Attempt void import | Import not voided | Rejected | No new journal | Closed-period lock preserved | Error only; no mutation expected | None | Leave fixture state documented | Planned only |
| Match candidates | Marked unmatched row and existing compatible posted bank journal line | Fetch candidates | Row `UNMATCHED` | Candidate list returned | No journal | No status change | No visible audit log expected | None | No cleanup | Planned only |
| Statement transaction match | Unmatched marked row and compatible posted journal line | Match row to journal line | Row `UNMATCHED` | Row `MATCHED`; matched line/entry recorded; import status refreshed | No new journal | Unmatched count decreases | `BankStatementTransaction` `MATCH` log | None | Leave matched row for reconciliation or documented fixture | Planned only |
| Statement transaction categorize | Unmatched marked row, active posting categorization account, allowed fiscal period | Categorize row | Row `UNMATCHED` | Row `CATEGORIZED`; created journal recorded; import status refreshed | Posted manual journal | Unmatched count decreases; ledger balance may change | `BankStatementTransaction` `CATEGORIZE` log | None | Do not delete journal; reconcile/void only through approved workflows | Planned only |
| Statement transaction ignore | Unmatched marked row with reason | Ignore row | Row `UNMATCHED` | Row `IGNORED`; reason stored; import status refreshed | No journal | Unmatched count decreases | `BankStatementTransaction` `IGNORE` log | None | Leave ignored row or void import if allowed | Planned only |
| Closed-period statement lock | Closed marked reconciliation covering row date | Try match, categorize, ignore, import, or import void inside period | Row/import inside closed period | Rejected | No new journal | Closed lock preserved | Error only; no mutation expected | None | No cleanup if no mutation | Planned only |
| Reconciliation create | Active profile, statement closing balance, non-overlapping period | Create draft reconciliation | No overlapping closed reconciliation | Reconciliation `DRAFT`; ledger balance/difference calculated | No journal | Open draft exists | `BankReconciliation` `CREATE` log | None | Reopen/void path only if approved | Planned only |
| Reconciliation submit rejection | Draft with non-zero difference or unmatched rows | Submit | `DRAFT` | Rejected; refreshed ledger/difference if non-zero | No journal | Draft remains open | Error only; no lifecycle transition log expected if rejected | None | Fix via approved match/categorize/ignore or statement balance adjustment in a new fixture | Planned only |
| Reconciliation submit | Draft with zero difference and no unmatched rows | Submit | `DRAFT` | `PENDING_APPROVAL`; submitted fields set | No journal | Ready for approval | `SUBMIT` audit log and review event | None | Reopen or approve in same approved batch | Planned only |
| Reconciliation approve | Pending approval created by another allowed actor or full-access actor | Approve | `PENDING_APPROVAL` | `APPROVED`; approved fields set | No journal | Ready to close | `APPROVE` audit log and review event | None | Reopen or close in same approved batch | Planned only |
| Reconciliation self-approval rejection | Pending approval submitted by same non-full-access actor | Attempt approve | `PENDING_APPROVAL` | Rejected | No journal | Approval separation preserved | Error only; no mutation expected | None | Use second marked approver if approved | Planned only |
| Reconciliation reopen | Pending or approved reconciliation | Reopen with reason | `PENDING_APPROVAL` or `APPROVED` | `DRAFT`; submitted/approved fields cleared | No journal | Review state reset | `REOPEN` audit log and review event | None | Continue lifecycle or void if approved | Planned only |
| Reconciliation close | Approved zero-difference reconciliation with no unmatched rows | Close | `APPROVED` | `CLOSED`; closed fields set; items snapshotted | No journal | Period locked; matched/categorized/ignored rows snapshotted | `CLOSE` audit log and review event | None | Void only if administrative unlock is approved | Planned only |
| Reconciliation close rejection | Approved reconciliation with non-zero difference or unmatched rows | Close | `APPROVED` | Rejected; ledger/difference refreshed when applicable | No journal | No closed period | Error only; no close event expected | None | Resolve fixture mismatch before retry | Planned only |
| Reconciliation void | Draft, pending, approved, or closed marked reconciliation | Void | Non-voided reconciliation | `VOIDED`; voided fields set | No journal reversal | Closed period unlocks administratively if it was closed | `VOID` audit log and review event | None | End in `VOIDED`; document that categorized journals remain | Planned only |
| Reconciliation report data | Existing marked reconciliation | Read report data | Any reconciliation status | Report JSON returned | No journal | No status change | No visible audit log expected | Data only, no download | No cleanup | Planned only |
| Reconciliation CSV/PDF output | Existing marked reconciliation and explicit output approval | Download CSV/PDF | Existing reconciliation | CSV streamed or PDF streamed; PDF may archive generated document | No journal | No status change | Generated-document archive log for PDF path if archive occurs | CSV/PDF output produced; PDF archived | Do not record file body; assert metadata only | Planned only |

## 6. Commands That May Be Needed Later But Must Not Be Run Now

Potential future commands for an approved local-disposable mutation batch:

```powershell
corepack pnpm --filter @ledgerbyte/api test -- bank-account
corepack pnpm --filter @ledgerbyte/api test -- bank-transfer
corepack pnpm --filter @ledgerbyte/api test -- bank-statement
corepack pnpm --filter @ledgerbyte/api test -- bank-reconciliation
corepack pnpm --filter @ledgerbyte/web test -- bank-accounts
corepack pnpm --filter @ledgerbyte/web test -- bank-statements
```

Potential future runtime checks, only after explicit login, fixture, mutation, and audit approval:

```powershell
# Placeholder examples only. Do not run without a future approved batch.
Invoke-RestMethod http://localhost:4000/health
Invoke-RestMethod http://localhost:4000/readiness
# Authenticated local API calls using fixture-only credentials and redacted evidence.
```

Still forbidden in this planning pass:

```powershell
corepack pnpm verify:repo
corepack pnpm verify:ci:local
corepack pnpm e2e
corepack pnpm smoke:accounting
corepack pnpm smoke:accounting:banking
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm demo:seed-workflows
```

Also forbidden: migrations, seed/reset/delete, raw SQL cleanup, Docker volume reset/removal, deployments, env changes, Vercel/Supabase mutations, login, fixture creation, statement upload/import/preview execution, transfer/reconciliation mutations, report exports/downloads/PDFs, ZATCA, email, backup/restore, and production-hosting research.

## 7. Existing Coverage Found

API coverage found:

- `apps/api/src/bank-accounts/bank-account.service.spec.ts`: profile create validation, duplicate profile rejection, posted transaction running balances/source metadata, archive/reactivate, tenant isolation, opening-balance posting, duplicate posting, and opening-balance edit rejection.
- `apps/api/src/bank-accounts/bank-account.controller.spec.ts`: list/detail, metadata change, opening-balance post, and transaction visibility permissions.
- `apps/api/src/bank-transfers/bank-transfer.service.spec.ts`: posted transfer journal, same-profile rejection, archived profile and currency mismatch rejection, non-positive amount and fiscal-period rejection, idempotent void/reversal.
- `apps/api/src/bank-transfers/bank-transfer.controller.spec.ts`: transfer view/create/void permissions.
- `apps/api/src/bank-statements/bank-statement-import-parser.spec.ts`: CSV, JSON, OFX, CAMT, MT940, unsafe-format warning, common variants, and no raw-body echo behavior.
- `apps/api/src/bank-statements/bank-statement.service.spec.ts`: import without journal posting, preview without persistence, partial import, closed reconciliation import rejection, match candidates, manual match, categorization with balanced journal, fiscal guard behavior, ignore, import void lock, summary totals, and tenant isolation.
- `apps/api/src/bank-statements/bank-statement.controller.spec.ts`: statement view/import/preview/reconcile/manage permissions.
- `apps/api/src/bank-reconciliations/bank-reconciliation.service.spec.ts`: draft creation, closed-overlap rejection, submit, submit blockers, approve and self-approval blocker, close blockers, close snapshots, reopen, void, review events, tenant isolation, report data, and PDF archive.
- `apps/api/src/bank-reconciliations/bank-reconciliation.controller.spec.ts`: reconciliation view/create/close/approve/reopen/void permissions and reconciliation report download runtime export guard.

Web coverage found:

- `apps/web/src/lib/bank-accounts.test.ts`: profile status labels, archive/reactivate helpers, bank-profile dropdown labels, running balance, transfer status/validation, opening-balance state, and transaction source labels.
- `apps/web/src/lib/bank-statements.test.ts`: status/type/candidate labels, CSV/JSON/OFX/CAMT/MT940 parsing helpers, safe unsupported-format errors, validation, file size/type validation, reconciliation status/actions, locked warnings, and review timeline helpers.
- `apps/web/src/app/(app)/bank-accounts/[id]/page.test.tsx`: bank ledger movement guidance, next-action links, and transfer link permission hiding.
- `apps/web/src/app/(app)/bank-accounts/[id]/reconciliation/page.test.tsx`: zero-difference/unmatched requirements and action link permission hiding.
- `apps/web/src/app/(app)/bank-accounts/[id]/statement-imports/page.test.tsx`: manual import/no-live-bank wording, parser preview counts/warnings, mobile-safe table, and import-result next actions.
- `apps/web/src/app/(app)/bank-statement-transactions/[id]/page.test.tsx`: unmatched row guidance, manual matching actions, and locked-period warning copy.
- `apps/web/src/app/(app)/bank-reconciliations/[id]/page.test.tsx`: closed reconciliation lock guidance and review-surface links.
- `apps/web/src/app/(app)/bank-transfers/[id]/page.test.tsx`: transfer success guidance, account drill-down links, and voided transfer copy.

Other coverage and references:

- `tests/e2e/banking-flow.spec.ts` exists as reference only; it was not run.
- `BUG_AUDIT.md` records banking/reconciliation groundwork, manual parser support, no live bank feeds, no external banking APIs, no automatic matching claims, no transfer fees, no multi-currency FX transfers, and no raw statement-file archive implementation.

## 8. Missing Coverage

- No approved runtime login/audit-writing evidence for banking mutation QA.
- No disposable `DEV03-BANK-...` fixture implementation has been approved or created.
- No browser-runtime authenticated banking flow proof in DEV-03 due the existing browser/local URL and login/audit blockers.
- No future local API mutation run has proven marker-filtered create/edit/archive/reactivate/opening-balance workflows.
- No future local API mutation run has proven bank transfer create/void against disposable fixture ledgers.
- No future local API mutation run has proven preview no-persistence with marker-filtered counts before and after execution.
- No future local API mutation run has proven statement import, partial import, import void, match, categorize, ignore, and closed-period blockers against disposable fixture data.
- No future local API mutation run has proven reconciliation submit/approve/reopen/close/void lifecycle with two marked users or an approved full-access self-approval scenario.
- No approved output run has proven bank reconciliation CSV/PDF/download/archive metadata with fixture-only data.
- No dedicated proof yet that UI permission gating and backend permission guards stay aligned for submit using `bankReconciliations.close`.

## 9. Risks And Blockers

- Blocker: any real banking/reconciliation mutation requires explicit future login, fixture creation, audit-log, and cleanup approval.
- Blocker: statement import execution, even with fake rows, persists statement import and transaction rows, so it cannot be tested in this planning pass.
- Blocker: categorization posts a journal and affects ledger balances, so it must only run in a disposable local fixture batch.
- Blocker: reconciliation PDF generation archives a generated document and must remain deferred until output approval exists.
- High risk: bank transfer void posts a reversal journal and marks the original journal `REVERSED`.
- High risk: opening-balance posting is one-time and posts to bank/equity accounts.
- High risk: reconciliation close creates item snapshots and locks statement transaction changes for that period.
- High risk: voiding a reconciliation is administrative and does not reverse categorized journals; this must be explicit in QA expectations.
- Medium risk: statement preview should be no-persistence, but a future run must prove marker-filtered counts before and after preview.
- Medium risk: parser support is limited to sanitized fixtures/common variants and is not certified target-bank support.
- Medium risk: no live bank feeds, external banking APIs, automatic matching, transfer fees, or multi-currency FX transfer handling should be implied by QA wording.
- Permission policy question: reconciliation submit currently requires `bankReconciliations.close`; confirm whether a dedicated submit/review permission is desired later.
- Permission policy question: reconciliation report routes declare `bankReconciliations.view` and then enforce `reports.export` or `generatedDocuments.download` at runtime; keep this dual gate in future permission QA.

## 10. Proposed Next Step

Proceed with `DEV-03 Part 6: Inventory state-machine QA dry-run plan`.

Part 6 should stay dry-run planning by default and should convert Inventory workflows into fixture markers, endpoint/action matrices, accounting/stock effects, audit evidence, rollback expectations, and stop rules before any local disposable inventory mutation is approved.

## 11. Open Questions

- Should reconciliation submit receive its own permission, or should it continue to reuse `bankReconciliations.close`?
- Should a future banking mutation batch use direct API integration tests first, before any browser-runtime flow?
- Should opening-balance posting be included in banking mutation QA or deferred to the journals/fiscal-period batch because it creates a journal?
- Should reconciliation void be allowed in the same batch as close, given that it unlocks the period administratively without reversing categorized journals?
- Should reconciliation CSV/PDF output be tested with banking workflows or deferred to the DEV-03 output gate batch?
- What is the approved method for proving preview no-persistence: marker-filtered DB counts, API mocks in unit tests, or both?
- Are two fixture users required for approval separation, or may a full-access fixture user approve its own reconciliation in one narrow test?
- Should parser bank-specific validation stay outside DEV-03 until sanitized target-bank sample collection is approved?

## 12. Recommended Next Step

Run `DEV-03 Part 6: Inventory state-machine QA dry-run plan` next. Do not execute any banking mutation, login, fixture creation, output generation, smoke, E2E, migration, seed/reset/delete, deploy, env change, ZATCA, email, backup/restore, or production-hosting research from this plan without a future prompt that explicitly approves that narrower scope.
