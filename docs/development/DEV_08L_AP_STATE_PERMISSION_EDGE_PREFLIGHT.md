# DEV-08L AP State Permission Edge Preflight

## Purpose And Scope

- Task: `DEV-08L Part 13: AP state-changing permission edge preflight`.
- Latest commit inspected: `f5e7826b Verify DEV-08L PDN cash receipt fiscal blockers`.
- Marker: `DEV08L-AP-20260529T000000`.
- Runtime mutation performed: no.
- AP service/controller mutation performed: no.
- Login/browser/output/email/ZATCA/migration/seed/reset/delete/deploy/env/provider action performed: no.

This was a read-only preflight for AP state-changing permission negative checks. Part 14 should use real permission helpers/guards with fake request contexts only, so blocked checks return before any AP service mutation can run.

## Source Evidence

- Fixture verification: [DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md).
- Permission inventory: [DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md](DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md).
- DEV-08I output permission closure: [DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md](DEV_08I_AP_OUTPUT_PERMISSION_AUTHENTICATED_UI_QA_CLOSURE.md).
- Permission guard: `apps/api/src/auth/guards/permission.guard.ts`.
- Required permission decorator: `apps/api/src/auth/decorators/require-permissions.decorator.ts`.
- Generated-document download helper: `apps/api/src/generated-documents/generated-document-permissions.ts`.
- Shared permissions: `packages/shared/src/permissions.ts`.

## Local Target Verification

- Database target classification: local-only.
- Protocol: `postgresql`.
- Host: `localhost`.
- Port: `5432`.
- Database: `accounting`.
- Fixture organization safe prefix: `cdc2c778`.

## Guard Behavior Inventory

- `PermissionGuard` reads required permissions from `REQUIRED_PERMISSIONS_KEY`.
- It requires an authenticated user and organization context.
- It loads the active organization membership and role from the database.
- Missing active membership returns `You do not have access to this organization.`
- Missing required permission returns `You do not have permission to perform this action.`
- `hasAnyPermission(...)` treats `admin.fullAccess` and legacy `*` as full access.
- `assertGeneratedDocumentDownloadPermission(...)` returns `You do not have permission to generate or download PDF outputs.` when the request membership lacks `generatedDocuments.download`.

## Fixture Role Baseline

| Role safe prefix | User safe prefix | Role label | Permissions |
| --- | --- | --- | --- |
| `f4db7bfa` | `dda4ee99` | `DEV08L Admin FullAccess` | `admin.fullAccess` |
| `967b3dcc` | `1a8cfeba` | `DEV08L AP Source Viewer` | AP source view permissions only |
| `d237da5b` | `951154c9` | `DEV08L AP Output No Download` | `purchaseBills.view`, `generatedDocuments.view` |
| `597d41d1` | `286d65cf` | `DEV08L AP Email No Outbox` | `purchaseBills.view`, `generatedDocuments.view`, `generatedDocuments.download` |
| `edf7213c` | `0b441c45` | `DEV08L Purchase Bill No Finalize` | `purchaseBills.view` |
| `a3949801` | `dbc129c4` | `DEV08L Supplier Payment No Create` | `supplierPayments.view` |
| `4f2a0e04` | `16c8737c` | `DEV08L Supplier Refund No Create` | `supplierRefunds.view` |
| `3cb87165` | `a1244f5f` | `DEV08L PDN No Finalize` | `purchaseDebitNotes.view` |
| `841711f6` | `4ffafb8c` | `DEV08L Cash Expense No Create` | `cashExpenses.view` |
| `ee65f79e` | `78568d69` | `DEV08L Receipt No Post` | `purchaseReceiving.view`, `inventory.view` |
| `5a65718a` | `abcdc4b5` | `DEV08L Purchase Order No Approve` | `purchaseOrders.view` |

All fixture memberships were `ACTIVE`.

## Baseline Counts

| Count | Baseline |
| --- | ---: |
| Roles | `11` |
| Organization members | `11` |
| Users with fixture memberships | `11` |
| Audit logs | `0` |
| Email outbox rows | `0` |
| Generated documents | `0` |
| Email provider events | `0` |
| ZATCA invoice metadata rows | `0` |
| ZATCA submission logs | `0` |

## Selected Part 14 Checks

Part 14 should run guard-only checks. It must not call AP service mutation methods or API endpoints after a guard denial.

| Check label | Fixture user role | Required permission/helper | Expected |
| --- | --- | --- | --- |
| purchase bill finalize denied | `DEV08L Purchase Bill No Finalize` | `purchaseBills.finalize` | 403 permission message |
| purchase bill void denied | `DEV08L Purchase Bill No Finalize` | `purchaseBills.void` | 403 permission message |
| supplier payment create denied | `DEV08L Supplier Payment No Create` | `supplierPayments.create` | 403 permission message |
| supplier payment void denied | `DEV08L Supplier Payment No Create` | `supplierPayments.void` | 403 permission message |
| supplier refund create denied | `DEV08L Supplier Refund No Create` | `supplierRefunds.create` | 403 permission message |
| supplier refund void denied | `DEV08L Supplier Refund No Create` | `supplierRefunds.void` | 403 permission message |
| purchase debit note finalize denied | `DEV08L PDN No Finalize` | `purchaseDebitNotes.finalize` | 403 permission message |
| purchase debit note apply denied | `DEV08L PDN No Finalize` | `purchaseDebitNotes.finalize` | 403 permission message |
| purchase debit note void denied | `DEV08L PDN No Finalize` | `purchaseDebitNotes.void` | 403 permission message |
| cash expense create denied | `DEV08L Cash Expense No Create` | `cashExpenses.create` | 403 permission message |
| cash expense void denied | `DEV08L Cash Expense No Create` | `cashExpenses.void` | 403 permission message |
| purchase receipt create denied | `DEV08L Receipt No Post` | `purchaseReceiving.create` | 403 permission message |
| purchase receipt void denied | `DEV08L Receipt No Post` | `purchaseReceiving.create` | 403 permission message |
| purchase receipt asset post denied | `DEV08L Receipt No Post` | `inventory.receipts.postAsset` | 403 permission message |
| purchase receipt asset reversal denied | `DEV08L Receipt No Post` | `inventory.receipts.reverseAsset` | 403 permission message |
| purchase order approve denied | `DEV08L Purchase Order No Approve` | `purchaseOrders.approve` | 403 permission message |
| purchase order void denied | `DEV08L Purchase Order No Approve` | `purchaseOrders.void` | 403 permission message |
| purchase order convert-to-bill denied | `DEV08L Purchase Order No Approve` | `purchaseOrders.convertToBill` | 403 permission message |
| output download helper denied | `DEV08L AP Output No Download` | `assertGeneratedDocumentDownloadPermission(...)` | generated-document PDF permission message |
| AP email outbox permission denied | `DEV08L AP Email No Outbox` | `emailOutbox.view` | 403 permission message |
| admin full-access control allowed | `DEV08L Admin FullAccess` | `purchaseOrders.convertToBill` | allowed by guard |

## Part 14 Plan

- Recheck the local DB target before importing `PermissionGuard` or permission helpers.
- Build fake `ExecutionContext` objects with user id and organization id only; do not log in and do not create JWTs/cookies/headers.
- Run only `PermissionGuard.canActivate(...)` and `assertGeneratedDocumentDownloadPermission(...)`.
- Treat denied checks as successful negative checks only when the message matches the expected permission message.
- Treat the admin full-access check as a positive control only when the guard returns `true`.
- Verify before/after counts for AP source records, audit logs, generated documents, email outbox, provider events, and ZATCA rows are unchanged.
- Delete the temporary runner and do not stage it.

## Required Part 14 Approval Phrase

Received exactly before this preflight:

```text
I approve DEV-08L Part 14 local-only AP state-changing permission edge negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.
```

## Temporary Script Cleanup

- Temporary read-only preflight runner: `apps/api/scripts/dev08l-part13-permission-edge-preflight.temp.ts`.
- Cleanup result: `Test-Path` returned `False`.
- The temporary runner was not staged.

## Commands Run

- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev08l-part13-permission-edge-preflight.temp.ts`
- `Remove-Item -LiteralPath 'apps/api/scripts/dev08l-part13-permission-edge-preflight.temp.ts'; Test-Path -LiteralPath 'apps/api/scripts/dev08l-part13-permission-edge-preflight.temp.ts'`

## Commands Skipped

- Login/browser.
- AP service mutation calls.
- API endpoint calls after permission checks.
- Output/PDF generation or download.
- AP email endpoint calls, provider calls, real email, retry workers, diagnostics, SMTP.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths.
- Migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.

## Exact Next Prompt Title

`DEV-08L Part 14: approved local AP state-changing permission edge negative checks`
