# DEV-08L AP State Permission Edge Negative Check Evidence

## Purpose And Scope

- Task: `DEV-08L Part 14: approved local AP state-changing permission edge negative checks`.
- Latest commit inspected: `c3c2550f Plan DEV-08L AP state permission edges`.
- Marker: `DEV08L-AP-20260529T000000`.
- Runtime mutation attempted: no AP service mutation was invoked; this run used guard/helper checks only.
- Successful mutation performed: no.
- Login/browser/output/email/ZATCA/migration/seed/reset/delete/deploy/env/provider action performed: no.

This run proved the selected restricted AP roles are blocked by permission checks before any AP state-changing service can run. It also proved `admin.fullAccess` still satisfies an AP mutation permission through the shared permission helper.

## Approval Gate

The exact Part 14 approval phrase was provided before the run:

```text
I approve DEV-08L Part 14 local-only AP state-changing permission edge negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.
```

## Local Target

- Database target classification: local-only.
- Protocol: `postgresql`.
- Host: `localhost`.
- Port: `5432`.
- Database: `accounting`.
- Fixture organization safe prefix: `cdc2c778`.

No database URL, password, token, cookie, auth header, request body, response body, customer/vendor data, email body, PDF body, attachment body, base64, provider payload, signed XML, QR payload, private key, or CSID was printed.

## Check Method

- `PermissionGuard.canActivate(...)` was run with fake local request contexts containing only a fixture user id and fixture organization id.
- No login occurred, and no JWT, cookie, or auth header was created.
- AP service methods and API endpoints were not called after denied guard checks.
- `assertGeneratedDocumentDownloadPermission(...)` was called directly for the output helper denial.

## Permission Check Results

| Check | Required permission/helper | Result | Message |
| --- | --- | --- | --- |
| purchase bill finalize denied | `purchaseBills.finalize` | blocked | `You do not have permission to perform this action.` |
| purchase bill void denied | `purchaseBills.void` | blocked | `You do not have permission to perform this action.` |
| supplier payment create denied | `supplierPayments.create` | blocked | `You do not have permission to perform this action.` |
| supplier payment void denied | `supplierPayments.void` | blocked | `You do not have permission to perform this action.` |
| supplier refund create denied | `supplierRefunds.create` | blocked | `You do not have permission to perform this action.` |
| supplier refund void denied | `supplierRefunds.void` | blocked | `You do not have permission to perform this action.` |
| purchase debit note finalize denied | `purchaseDebitNotes.finalize` | blocked | `You do not have permission to perform this action.` |
| purchase debit note apply denied | `purchaseDebitNotes.finalize` | blocked | `You do not have permission to perform this action.` |
| purchase debit note void denied | `purchaseDebitNotes.void` | blocked | `You do not have permission to perform this action.` |
| cash expense create denied | `cashExpenses.create` | blocked | `You do not have permission to perform this action.` |
| cash expense void denied | `cashExpenses.void` | blocked | `You do not have permission to perform this action.` |
| purchase receipt create denied | `purchaseReceiving.create` | blocked | `You do not have permission to perform this action.` |
| purchase receipt void denied | `purchaseReceiving.create` | blocked | `You do not have permission to perform this action.` |
| purchase receipt asset post denied | `inventory.receipts.postAsset` | blocked | `You do not have permission to perform this action.` |
| purchase receipt asset reversal denied | `inventory.receipts.reverseAsset` | blocked | `You do not have permission to perform this action.` |
| purchase order approve denied | `purchaseOrders.approve` | blocked | `You do not have permission to perform this action.` |
| purchase order void denied | `purchaseOrders.void` | blocked | `You do not have permission to perform this action.` |
| purchase order convert-to-bill denied | `purchaseOrders.convertToBill` | blocked | `You do not have permission to perform this action.` |
| generated-document download helper denied | `assertGeneratedDocumentDownloadPermission(...)` | blocked | `You do not have permission to generate or download PDF outputs.` |
| AP email outbox permission denied | `emailOutbox.view` | blocked | `You do not have permission to perform this action.` |
| admin full-access convert-to-bill control | `purchaseOrders.convertToBill` | allowed | `admin.fullAccess` satisfied the guard |

Denied check count: `20`.
Allowed control count: `1`.

## Role Inputs

| Role label | Role safe prefix | User safe prefix | Permission count |
| --- | --- | --- | ---: |
| `DEV08L Admin FullAccess` | `f4db7bfa` | `dda4ee99` | `1` |
| `DEV08L AP Output No Download` | `d237da5b` | `951154c9` | `2` |
| `DEV08L AP Email No Outbox` | `597d41d1` | `286d65cf` | `3` |
| `DEV08L Purchase Bill No Finalize` | `edf7213c` | `0b441c45` | `1` |
| `DEV08L Supplier Payment No Create` | `a3949801` | `dbc129c4` | `1` |
| `DEV08L Supplier Refund No Create` | `4f2a0e04` | `16c8737c` | `1` |
| `DEV08L PDN No Finalize` | `3cb87165` | `a1244f5f` | `1` |
| `DEV08L Cash Expense No Create` | `841711f6` | `4ffafb8c` | `1` |
| `DEV08L Receipt No Post` | `ee65f79e` | `78568d69` | `2` |
| `DEV08L Purchase Order No Approve` | `5a65718a` | `abcdc4b5` | `1` |

## Count Integrity

| Count | Before | After | Result |
| --- | ---: | ---: | --- |
| Purchase bills | `4` | `4` | unchanged |
| Supplier payments | `3` | `3` | unchanged |
| Supplier refunds | `1` | `1` | unchanged |
| Purchase debit notes | `2` | `2` | unchanged |
| Cash expenses | `1` | `1` | unchanged |
| Purchase receipts | `2` | `2` | unchanged |
| Purchase orders | `1` | `1` | unchanged |
| Journal entries | `10` | `10` | unchanged |
| Audit logs | `0` | `0` | unchanged |
| Auth tokens | `0` | `0` | unchanged |
| Email outbox rows | `0` | `0` | unchanged |
| Generated documents | `0` | `0` | unchanged |
| Email provider events | `0` | `0` | unchanged |
| ZATCA invoice metadata rows | `0` | `0` | unchanged |
| ZATCA submission logs | `0` | `0` | unchanged |

## Temporary Script Cleanup

- Temporary runner: `apps/api/scripts/dev08l-part14-permission-edge-checks.temp.ts`.
- Cleanup result: `Test-Path` returned `False`.
- The temporary runner was not staged.

## Commands Run

- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev08l-part14-permission-edge-checks.temp.ts`
- `Remove-Item -LiteralPath 'apps/api/scripts/dev08l-part14-permission-edge-checks.temp.ts'; Test-Path -LiteralPath 'apps/api/scripts/dev08l-part14-permission-edge-checks.temp.ts'`

## Commands Skipped

- Login/browser.
- AP service mutation calls.
- API endpoint calls after permission checks.
- Output/PDF generation or download.
- AP email endpoint calls, provider calls, real email, retry workers, diagnostics, SMTP.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths.
- Migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.

## Exact Next Prompt Title

`DEV-08L Part 15: AP state-changing permission edge evidence verification`

## Part 15 Verification Note

- Part 15 verification is recorded in [DEV_08L_AP_STATE_PERMISSION_EDGE_EVIDENCE_VERIFICATION.md](DEV_08L_AP_STATE_PERMISSION_EDGE_EVIDENCE_VERIFICATION.md).
- Read-only verification confirmed the denied/allowed check counts, expected permission messages, unchanged AP/source/audit/auth/output/email/ZATCA counts, and no remaining temporary script.
