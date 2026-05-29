# DEV-08L AP Fiscal Permission Edge Preflight

## Purpose And Scope

- Task: `DEV-08L Part 1: AP fiscal-period and permission edge preflight`.
- Latest commit inspected: `c8547f7a Close DEV-08K AP email evidence`.
- Local `HEAD` matched `origin/main`: yes.
- Marker: `DEV08L-AP-20260529T000000`.
- Runtime mutation performed: no.
- Fixture, fiscal period, AP record, email, output, ZATCA, login, browser, migration, seed/reset/delete, deploy, env, provider, backup, or production action performed: no.

This was a read-only code and documentation preflight. It did not create fixtures, lock periods, close periods, reopen periods, mutate AP records, call AP output/email endpoints, generate or download documents, run real email, run real ZATCA, or inspect body/base64 payloads.

## Inputs Read

- `CODEX_HANDOFF.md`
- `docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_CLOSURE.md`
- `docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md`
- `docs/development/DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md`
- `docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md`
- `docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md`
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`
- `BUG_AUDIT.md`
- `README.md`
- AP fiscal, permission, generated-document, email, and controller/service source files under `apps/api/src/*`, `apps/web/src/lib/permissions.ts`, and `packages/shared/src/permissions.ts`.

## Fiscal Period Guard Baseline

- `FiscalPeriodGuardService.assertPostingDateAllowed(...)` allows posting when an organization has no fiscal periods.
- When fiscal periods exist, the posting date must fall inside a period whose status is `OPEN`.
- A matching `CLOSED` period throws `Posting date falls in a closed fiscal period.`
- A matching `LOCKED` period throws `Posting date falls in a locked fiscal period.`
- A date outside all periods throws `Posting date does not fall in an open fiscal period.`
- AP services call the guard inside the same Prisma transaction used for the later journal/write path when a posting/reversal journal is involved.

## AP Fiscal Guard Inventory

| Family | Guarded actions | Guard date | Unguarded or non-posting actions |
| --- | --- | --- | --- |
| Purchase bills | `finalize`, finalized `void` | `bill.billDate`, current reversal date | draft `void` has no journal guard; create/update/remove are draft-only operational actions |
| Supplier payments | `create`, `void` | `paymentDate`, current reversal date | `applyUnapplied` and `reverseUnappliedAllocation` are matching/balance restoration only and do not call the fiscal guard |
| Supplier refunds | `create`, `void` | `refundDate`, current reversal date | remove is draft-only and blocked for posted refunds |
| Purchase debit notes | `finalize`, finalized `void` | `issueDate`, current reversal date | `apply` and `reverseAllocation` are matching/balance restoration only and do not call the fiscal guard; draft `void` has no journal guard |
| Cash expenses | `create`, `void` | `expenseDate`, current reversal date | remove is draft-only and blocked for posted cash expenses |
| Purchase receipts | `postInventoryAsset`, `reverseInventoryAsset` | `receipt.receiptDate`, current reversal date | `create` posts stock movements but no fiscal guard; `void` creates reversing stock movements with no fiscal guard |
| Purchase orders | none found | none | create/update/approve/mark-sent/close/void/convert-to-bill are operational; convert-to-bill creates a draft purchase bill but does not post a journal |

## Fiscal Test Selection

- Part 2 should create only marker-scoped local disposable fixtures after rechecking the local DB target and current fiscal period landscape.
- Use a closed fiscal period fixture to test document-date blockers for purchase bill finalize, supplier payment create, supplier refund create, purchase debit note finalize, cash expense create, and purchase receipt asset posting.
- Use an open control period to create the valid source states needed before negative checks.
- For void/reversal blockers, note that the services use `new Date()` as the reversal date. Part 2 must decide, after inspecting local fiscal periods, whether to create a marker-scoped closed period covering the execution date in a disposable fixture organization or to defer current-date reversal blockers as unsafe to mutate in the shared seed organization.
- Purchase order fiscal-period checks should be documented as not applicable unless later code adds fiscal guards. The meaningful purchase order fiscal edge is the converted draft bill's later finalization, covered under purchase bill checks.
- PDN apply/reverse and supplier payment unapplied apply/reverse should be treated as state-integrity checks, not fiscal-period posting blockers, because they do not create journals or call `assertPostingDateAllowed`.
- Purchase receipt create/void lacking fiscal guards should be recorded as an inventory operational edge. Part 11 can verify whether the absence of a guard is intentional by checking no journal is posted and documenting the no-fiscal-guard behavior.

## Permission Guard Baseline

- Controllers use `JwtAuthGuard`, `OrganizationContextGuard`, and `PermissionGuard`.
- `PermissionGuard` loads the active organization membership role and authorizes if any required permission is present.
- Shared permission helpers treat `admin.fullAccess` and the legacy full-access value as full access.
- Missing active membership returns `You do not have access to this organization.`
- Missing required permission returns `You do not have permission to perform this action.`
- AP source PDF stream/generate routes now require source view permission plus `generatedDocuments.download`; source `pdf-data` remains source-view metadata only.

## AP Permission Edge Inventory

| Family | Read permission | Mutation permissions | Output/email permission edges |
| --- | --- | --- | --- |
| Purchase bills | `purchaseBills.view` for list/open/detail/accounting/pdf-data/related AP lists | `purchaseBills.create`, `purchaseBills.update`, `purchaseBills.finalize`, `purchaseBills.void`; delete uses `purchaseBills.update` | source `pdf` and `generate-pdf` require `purchaseBills.view` plus `generatedDocuments.download`; AP email requires source view plus `generatedDocuments.download` plus `emailOutbox.view` |
| Supplier payments | `supplierPayments.view` for list/detail/allocation/receipt data | `supplierPayments.create` for create and `applyUnapplied`; `supplierPayments.void` for reverse unapplied allocation, void, delete | receipt PDF/generate requires source view plus `generatedDocuments.download`; AP email requires source view plus download plus email outbox |
| Supplier refunds | `supplierRefunds.view` for list/detail/refundable-sources/pdf-data | `supplierRefunds.create`, `supplierRefunds.void`; delete uses `supplierRefunds.void` | PDF/generate requires source view plus `generatedDocuments.download`; AP email requires source view plus download plus email outbox |
| Purchase debit notes | `purchaseDebitNotes.view` for list/detail/allocations/pdf-data | `purchaseDebitNotes.create` for create/update/delete; `purchaseDebitNotes.finalize` for finalize/apply; `purchaseDebitNotes.void` for reverse allocation/void | PDF/generate requires source view plus `generatedDocuments.download`; AP email requires source view plus download plus email outbox |
| Cash expenses | `cashExpenses.view` for list/detail/pdf-data | `cashExpenses.create`, `cashExpenses.void`; delete uses `cashExpenses.void` | PDF/generate requires source view plus `generatedDocuments.download`; AP email requires source view plus download plus email outbox |
| Purchase receipts | `purchaseReceiving.view`; accounting preview uses `inventory.view` | `purchaseReceiving.create` for create and void; `inventory.receiptsPostAsset`; `inventory.receiptsReverseAsset` | no generated-document or AP email output path found for purchase receipts |
| Purchase orders | `purchaseOrders.view` for list/detail/pdf-data | `purchaseOrders.create`, `purchaseOrders.update`, `purchaseOrders.approve`, `purchaseOrders.void`, `purchaseOrders.convertToBill`; close/delete use `purchaseOrders.update`; mark-sent uses `purchaseOrders.approve` | PDF/generate requires source view plus `generatedDocuments.download`; AP email requires source view plus download plus email outbox |
| Generated documents | `generatedDocuments.view` for list/detail | `generatedDocuments.download` for archive download | download permission is also the secondary gate on AP source PDF/generate routes and AP email creation |
| AP generated-document email | `emailOutbox.view` on the controller | creating AP outbox metadata also requires service-level `generatedDocuments.download` and matching AP source view | missing any of the three permissions should block without provider calls or outbox rows |

## Permission Test Selection

- Part 14 should focus on missing mutation permissions for state-changing AP endpoints and services, plus separate missing-output gates for generated-document download/AP email.
- Restricted roles should be marker-scoped and intentionally narrow:
  - source viewer with no mutation permissions.
  - per-family missing mutation role for purchase bills, supplier payments, supplier refunds, purchase debit notes, cash expenses, purchase receipts, and purchase orders.
  - AP output restricted role with source view but without `generatedDocuments.download`.
  - AP email restricted role with source view plus `generatedDocuments.download` but without `emailOutbox.view`.
  - admin.fullAccess control role to prove the shared full-access behavior.
- Avoid login/browser in DEV-08L until a later prompt explicitly approves login/audit-writing. Prefer service/controller guard checks and metadata-only API calls when possible.
- Do not print JWTs, cookies, auth headers, request/response bodies, raw emails, PDF bodies, attachment bodies, provider payloads, or customer/vendor data in evidence.

## Part Sequence

1. Part 2: create local-only marker fixtures for fiscal-period and permission checks.
2. Part 3: read-only fixture verification.
3. Parts 4-6: purchase bill fiscal blocker preflight, negative checks, and verification.
4. Parts 7-9: supplier payment/refund fiscal blocker preflight, negative checks, and verification.
5. Parts 10-12: purchase debit note, cash expense, and purchase receipt fiscal blocker preflight, negative checks, and verification.
6. Parts 13-15: AP state-changing permission edge preflight, negative checks, and verification.
7. Part 16: DEV-08L closure.

## Exact Mutation Approval Gates

The current user message was a generic approval, not an exact mutation approval phrase. Do not run Parts 2, 5, 8, 11, or 14 unless the exact corresponding phrase is present.

- Part 2: `I approve DEV-08L Part 2 local-only AP fiscal-period and permission fixture mutation under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.`
- Part 5: `I approve DEV-08L Part 5 local-only purchase bill fiscal-period blocker negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.`
- Part 8: `I approve DEV-08L Part 8 local-only supplier payment refund fiscal-period blocker negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.`
- Part 11: `I approve DEV-08L Part 11 local-only PDN cash expense receipt fiscal-period blocker negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.`
- Part 14: `I approve DEV-08L Part 14 local-only AP state-changing permission edge negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.`

## Commands Run

- `git fetch origin`
- `git status --short --branch`
- `git log -1 --oneline --decorate --all`
- `git log --oneline --decorate --graph --all -n 12`
- `rg` inspections across required docs, AP services, controllers, fiscal-period guard, permission guard, generated-document permissions, email AP outbox permissions, shared permission definitions, `BUG_AUDIT.md`, and `README.md`.
- Read required DEV-08H/08I/08J/08K, DEV-03, DEV-02, handoff, API controller/service, fiscal guard, and permission source context as needed.

## Commands Skipped

- Runtime fixture creation, fiscal period creation/close/lock/reopen, AP state changes, generated-document output, downloads, email endpoint calls, provider calls, real email, real ZATCA, login/browser, migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.
- Any command that would print secrets, tokens, cookies, auth headers, request/response bodies, customer/vendor data, PDF bodies, email bodies, attachment bodies, base64, provider payloads, signed XML, QR payloads, private keys, or CSIDs.

## Exact Next Prompt Title

`DEV-08L Part 2: approved local AP fiscal-period and permission fixture mutation`

## Part 2 Follow-Up

- Part 2 fixture mutation evidence is recorded in [DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md](DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_MUTATION_EVIDENCE.md).
- Exact Part 2 approval phrase was received before the mutation.
- Dedicated local disposable fixture organization safe prefix: `cdc2c778`.
- Closed fixture period safe prefix `6cb54c20` covers `2026-05-01..2026-05-31`; open control period safe prefix `ee20b288` covers `2026-06-01..2026-06-30`.
- Baseline side-effect counts for the fixture organization: audit logs `0`, email outbox `0`, generated documents `0`, email provider events `0`, ZATCA invoice metadata `0`, ZATCA submission logs `0`.
- Temporary runner `apps/api/scripts/dev08l-part2-fixture-mutation.temp.ts` was deleted after execution.
- Exact next prompt title: `DEV-08L Part 3: AP fiscal-period and permission fixture evidence verification`.
