# DEV-03 Final State-Machine QA Triage

## 1. Purpose And Scope

DEV-03 is completed as state-machine QA planning and triage only. It consolidated the high-risk workflow inventory, safe local fixture/login/audit policy, and dry-run plans for AR, AP, banking/reconciliation, inventory, and journals/reports/documents output gates.

This final triage does not approve runtime mutation QA. No login, fixture creation, API mutation, browser E2E, smoke, export, download, PDF generation, generated-document archive creation, ZATCA action, email action, backup/restore action, deployment, migration, seed/reset/delete, environment change, production-hosting research, production check, beta check, or customer-data check was performed.

## 2. DEV-03 Work Completed

- Part 1 inventory: [DEV_03_STATE_MACHINE_QA_INVENTORY.md](DEV_03_STATE_MACHINE_QA_INVENTORY.md) mapped high-risk workflows, state fields, controllers/services, routes, accounting impact, audit impact, current coverage, and missing coverage.
- Part 2 policy: [DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md](DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md) defined local-disposable-only fixture, login, audit-log, mutation, cleanup, and evidence boundaries.
- Part 3 AR plan: [DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_AR_STATE_MACHINE_DRY_RUN_PLAN.md) planned sales invoice, customer payment, customer refund, credit note, and AR output-gate QA.
- Part 4 AP plan: [DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md) planned purchase order, purchase bill, supplier payment, supplier refund, purchase debit note, cash expense, and AP output-gate QA.
- Part 5 banking/reconciliation plan: [DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_BANKING_RECONCILIATION_STATE_MACHINE_DRY_RUN_PLAN.md) planned bank profile, bank transfer, statement import, statement transaction, reconciliation, and reconciliation report output-gate QA.
- Part 6 inventory plan: [DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md](DEV_03_INVENTORY_STATE_MACHINE_DRY_RUN_PLAN.md) planned item/warehouse, movement, adjustment, transfer, receipt, stock issue, report/settings, clearing, and variance proposal QA.
- Part 7 journals/reports/documents plan: [DEV_03_JOURNALS_REPORTS_DOCUMENTS_OUTPUT_GATE_DRY_RUN_PLAN.md](DEV_03_JOURNALS_REPORTS_DOCUMENTS_OUTPUT_GATE_DRY_RUN_PLAN.md) planned manual journals, fiscal periods, accounts/taxes/number sequences, reports, generated documents, audit, storage, and document readiness output gates.

## 3. Consolidated Highest-Risk Transitions By Severity

### Blocker

- Runtime state-machine QA remains blocked until DEV-04 defines and approves a local disposable fixture execution path.
- Login-dependent QA remains blocked until a future prompt explicitly approves login and audit-log writes against fake local fixture users and organizations.
- Output-producing QA remains blocked until export/download/PDF/generated-document archive evidence rules are approved.
- Seed/reset/delete, production, beta/user-testing, and customer-data use remain forbidden by default, so mutation QA cannot proceed against shared or unknown data.

### High

- AR: sales invoice finalize/void, customer payment allocation/reversal/void, customer refund source claim/void, credit note finalize/apply/reverse/void, and AR PDF/archive gates.
- AP: purchase order approve/close/void/convert-to-bill, purchase bill finalize/void, supplier payment allocation/reversal/void, supplier refund source claim/void, purchase debit note finalize/apply/reverse/void, cash expense post/void, and AP PDF/archive gates.
- Banking/reconciliation: bank opening-balance post, bank transfer create/void, statement import persistence/void, statement transaction match/categorize/ignore, reconciliation submit/approve/reopen/close/void, and reconciliation CSV/PDF/archive gates.
- Inventory: adjustment approve/void, warehouse transfer create/void, purchase receipt create/void and asset post/reverse, sales stock issue create/void and COGS post/reverse, inventory settings/accounting readiness, clearing report output, and variance proposal create/submit/approve/post/reverse/void.
- Journals/fiscal periods: manual journal create/post/reverse and fiscal period close/reopen/lock posting guards.
- Reports/documents/audit: report CSV/PDF export, generated-document archive/download, audit CSV export, retention settings, document settings, number sequences, storage readiness, and backup-evidence metadata gates.

### Medium

- Permission-policy questions remain for update/void actions that reuse create/manage permissions, generated-document download versus document view permissions, storage/backup evidence permissions, and email-outbox administration permissions.
- Browser-runtime authenticated QA remains deferred because the in-app Browser local URL policy blocked local route visits in earlier DEV-01 runs and login writes audit logs.
- Smoke/E2E assets exist but are not yet decomposed into a safe local disposable state-machine execution model.
- Report/export access logging policy is unresolved for some output-only reads versus audit-relevant downloads.

### Low

- Placeholder/future-module UX decisions remain separate from state-machine QA.
- Some report/output wording and evidence formats still need accountant/product review before paid production.
- Graph/dependency outputs used earlier are helpful planning aids but should be refreshed before future blast-radius claims.

## 4. Highest-Risk Transitions By Area

### Sales/AR

- Sales invoice `DRAFT -> FINALIZED`, `DRAFT -> VOIDED`, and `FINALIZED -> VOIDED`, including reversal journal idempotency and blockers from active payments, unapplied allocations, and credit-note allocations.
- Customer payment direct allocation, unapplied application, unapplied reversal, refund blocker, and `POSTED -> VOIDED`.
- Customer refund creation from payment or credit-note sources and `POSTED -> VOIDED` source restoration.
- Credit note `DRAFT -> FINALIZED`, apply/reverse allocation, refund blocker, and `FINALIZED -> VOIDED`.
- Sales invoice, payment receipt, refund, and credit-note PDF/archive endpoints that can create generated-document records.

### Purchases/AP

- Purchase order `DRAFT -> APPROVED`, `APPROVED -> SENT`, close, void, and convert-to-bill.
- Purchase bill `DRAFT -> FINALIZED` and `FINALIZED -> VOIDED`, including inventory-clearing readiness and supplier payment/debit-note allocation blockers.
- Supplier payment allocation, unapplied application, reversal, refund blocker, and `POSTED -> VOIDED`.
- Supplier refund creation from supplier payment or debit-note sources and `POSTED -> VOIDED` restoration.
- Purchase debit note finalization, application, allocation reversal, refund blocker, and void behavior.
- Cash expense immediate posting and void reversal.

### Banking/Reconciliation

- Bank account archive/reactivate and one-time opening-balance posting.
- Bank transfer immediate posting and `POSTED -> VOIDED` reversal across two bank accounts.
- Statement import preview versus persisted import, import void blockers, and raw statement evidence boundaries.
- Statement transaction match, categorize, ignore, and closed-reconciliation blocking.
- Reconciliation create/submit/approve/reopen/close/void lifecycle and report output gates.

### Inventory

- Item inventory-tracking and warehouse archive/reactivate gates.
- Opening-balance stock movement boundary.
- Inventory adjustment approve/void with no-negative-stock checks.
- Warehouse transfer create/void with paired transfer movement reversals.
- Purchase receipt create/void plus explicit inventory asset post/reverse.
- Sales stock issue create/void plus explicit COGS post/reverse.
- Inventory settings/accounting readiness and report output boundaries.
- Variance proposal create/submit/approve/post/reverse/void.

### Journals/Fiscal Periods

- Manual journal create/update, post, and reverse with duplicate reversal protection.
- Fiscal period create, close, reopen, lock, and posting-date guard behavior.
- Account, tax-rate, and number-sequence changes that affect future postings and documents.

### Reports/Documents Output Gates

- Report JSON reads, CSV exports, PDF exports, and generated-document archive side effects.
- Generated-document list/detail/download access and content evidence rules.
- PDF/download actions for AR/AP source documents and statements.
- Audit CSV export, retention preview/dry-run, and retention settings mutation.

### Admin/Audit Side Effects

- Login audit events.
- Role/team/invite changes that can grant access to state-machine actions.
- Document settings and number-sequence changes that affect future output.
- Storage readiness and backup-evidence metadata gates.
- Email, ZATCA, backup/restore, provider, and production controls remain blocked unless separately approved.

## 5. Workflows That Affect Ledger Balances

- Sales invoice finalization and finalized invoice voiding.
- Customer payment creation/allocation/reversal/void and customer refund creation/void.
- Credit note finalization, allocation/reversal, refund interaction, and void.
- Purchase bill finalization/voiding.
- Supplier payment allocation/reversal/void and supplier refund creation/void.
- Purchase debit note finalization, allocation/reversal, refund interaction, and void.
- Cash expense creation/voiding.
- Bank opening-balance posting and bank transfer create/void.
- Statement transaction categorization when it posts a journal.
- Purchase receipt inventory asset post/reverse.
- Sales stock issue COGS post/reverse.
- Inventory variance proposal post/reverse.
- Manual journal post/reverse.
- Fiscal period close/reopen/lock because it gates posting eligibility.

## 6. Workflows That Affect Inventory Quantities/Costs

- Item inventory-tracking changes and warehouse active/archive state.
- Opening-balance stock movements.
- Inventory adjustment approve/void.
- Warehouse transfer create/void.
- Purchase receipt create/void and inventory asset post/reverse.
- Sales stock issue create/void and COGS post/reverse.
- Inventory settings and accounting readiness changes.
- Stock valuation, movement, low-stock, clearing reconciliation, and clearing variance reports.
- Variance proposal create/submit/approve/post/reverse/void.

## 7. Workflows That Affect Bank Reconciliation Status

- Bank account archive/reactivate and opening-balance posting.
- Bank transfer create/void.
- Statement import, import void, and statement transaction status changes.
- Statement transaction match/categorize/ignore.
- Reconciliation create/submit/approve/reopen/close/void.
- Reconciliation report CSV/PDF/archive output gates.

## 8. Workflows That Generate Output, Downloads, PDFs, Or Archive Records

- Sales invoice, customer payment receipt, customer refund, credit note, purchase order, purchase bill, supplier payment receipt, supplier refund, purchase debit note, customer statement, and supplier statement PDF/archive endpoints.
- Core accounting reports, VAT summary, aging reports, bank reconciliation reports, and inventory reports when CSV/PDF/download behavior is requested.
- Generated-document archive creation and archived PDF downloads.
- Audit CSV export and report/document CSV exports.
- Document settings and number-sequence changes that affect future output.
- Storage readiness, migration-plan, and backup-readiness evidence endpoints when they expose operational metadata.

## 9. Workflows That Write Audit Logs Or Require Login/Audit Approval

- Login itself writes audit logs and remains blocked until explicitly approved.
- Most create/update/delete/finalize/approve/close/void/reverse/post/import/match/categorize/ignore/transfer/receive/issue/settings actions write or are expected to write audit events.
- Generated-document archive creation writes generated-document audit evidence.
- Audit retention settings update writes audit evidence.
- Document settings, number sequences, account/tax changes, roles, members, and backup-evidence metadata mutations are audit-sensitive.
- Future QA evidence must record sanitized action names, entity types, counts, fixture markers, and status transitions only.

## 10. Required Fixture Families And Marker Prefixes

- Sales/AR: `DEV03-AR-` for fixture organization, user, customer, accounts, tax rate, item/service, invoices, payments, refunds, credit notes, allocations, and output labels.
- Purchases/AP: `DEV03-AP-` for fixture organization, user, supplier, accounts, tax rate, item/service, purchase orders, bills, payments, refunds, debit notes, cash expenses, and output labels.
- Banking/Reconciliation: `DEV03-BANK-` for fixture organization, user, bank/cash accounts, statement imports, statement transactions, transfers, reconciliations, and report labels.
- Inventory: `DEV03-INV-` for fixture organization, user, item, warehouse, stock movement, adjustment, transfer, purchase receipt, sales stock issue, variance proposal, account, and report labels.
- Journals/Reports/Documents: `DEV03-JRD-` for fixture organization, user, accounts, tax rates, journals, fiscal periods, report runs, generated documents, audit/export labels, document settings, and storage/backup evidence metadata.

## 11. What Was Not Executed

- No login.
- No fixture creation.
- No runtime mutation.
- No browser E2E.
- No smoke.
- No exports, downloads, PDF generation, or generated-document archive creation.
- No journal/report/document mutation.
- No inventory, banking, AR, AP, settings, role, storage, email, ZATCA, backup, or restore mutation.
- No migrations, seed/reset/delete, deployment, environment changes, Vercel/Supabase setting changes, production-hosting research, production checks, beta checks, or customer-data checks.

## 12. Proposed Next Execution Sequence

1. DEV-04 Part 1: local disposable fixture implementation plan.
2. Define the approved local database/session/audit evidence approach before any login or fixture creation.
3. AR approved mutation QA with `DEV03-AR-` fixtures.
4. AP approved mutation QA with `DEV03-AP-` fixtures.
5. Banking/Reconciliation approved mutation QA with `DEV03-BANK-` fixtures.
6. Inventory approved mutation QA with `DEV03-INV-` fixtures.
7. Journals/Reports/Documents output-gate approved QA with `DEV03-JRD-` fixtures and separate output approval.
8. Final regression/verification pass using DEV-02 gates plus any approved targeted state-machine tests.

## 13. Required Approvals Before Any Mutation QA

- Local disposable database approval, including how the target is identified and how non-disposable targets are rejected.
- Login/audit-write approval for fake fixture users and organizations.
- Fixture creation approval, including marker format, scope, and allowed setup paths.
- Cleanup/retention approval, including whether fixture records remain as audit evidence or are cleaned by normal application reversals/voids.
- Explicit no-production/no-beta/no-customer-data boundary.
- Per-batch mutation approval for exact transitions to execute.
- Separate output approval for exports, downloads, PDF generation, generated-document archive creation, audit CSV export, and report/document evidence.

## 14. Verification Gate Impact

- DEV-02 `verify:diff` remains the default safe docs/check gate.
- DEV-02 `verify:local:web` and `verify:local:api` can support targeted non-mutating typecheck/tests for future code changes.
- DEV-02 `verify:repo` and PR CI remain non-mutating but do not prove authenticated state-machine behavior.
- Runtime state-machine QA, login/audit-writing flows, fixture creation, exports/downloads/PDF/archive generation, smoke, E2E, and cleanup evidence remain manual-only until explicitly approved.
- DEV-02 does not yet cover real authenticated browser sessions, local disposable fixture lifecycle, state-machine mutation assertions, output body validation, or production/beta checks.

## 15. Remaining Blockers

- No approved local disposable fixture implementation plan exists yet.
- No approved login/audit-write execution policy has been applied to an actual run.
- Browser-runtime authenticated QA remains blocked/deferred from DEV-01.
- Output-producing QA needs explicit evidence rules and fixture-only data boundaries.
- Mutation batches need per-area approval and cleanup evidence.
- Permission-policy questions remain for several update/void/export/download/admin actions.
- E2E/smoke service-container design remains outside the default gate.
- Accountant/product review is still needed for report, VAT, statement, inventory valuation, and output wording confidence.

## 16. Recommended Next Development Ticket

Run `DEV-04 Part 1: local disposable fixture implementation plan` next.

DEV-04 should design the exact local-only fixture creation path, login/audit evidence handling, target-safety checks, non-destructive cleanup strategy, and batch approval checklist before any DEV-03 mutation plan is executed.

## 17. Exact Next Prompt Title

`DEV-04 Part 1: local disposable fixture implementation plan`
