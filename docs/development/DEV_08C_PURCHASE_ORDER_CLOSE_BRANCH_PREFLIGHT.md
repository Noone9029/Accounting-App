# DEV-08C Purchase Order Close Branch Preflight

## 1. Purpose And Scope

This document records DEV-08C Part 16 read-only preflight for a separate local-only purchase order close branch.

Scope:

- Confirm the latest pushed commit is the Part 15 evidence verification commit.
- Confirm the local-only target before database reads.
- Protect the main DEV-08C conversion purchase order from reuse.
- Inspect purchase order close transition rules.
- Plan the Part 17 approved local close-branch mutation.

No create, approve, mark-sent, close, void, convert, finalize, cleanup, PDF/export/download/archive generation, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema change, login/browser flow, production, beta, shared-target, hosted-target, or customer-data action was performed.

## 2. Latest Commit Inspected

- `git log -1 --oneline`: `615195a7 Verify DEV-08C converted bill finalization evidence`.
- `git rev-parse HEAD`: `615195a7d6d62eacb342be2e6890eabb4a27708b`.
- `git rev-parse origin/main`: `615195a7d6d62eacb342be2e6890eabb4a27708b`.
- Local `HEAD` matched `origin/main` before Part 16 documentation edits.

## 3. Local-Only Target Proof

- Docker engine was local and available: `28.5.1 linux`.
- Local containers were running and healthy:
  - `infra-postgres-1`: listening on localhost port `5432`.
  - `infra-redis-1`: listening on localhost port `6379`.
- Port checks succeeded for `localhost:5432` and `localhost:6379`.
- Read-only database access used the local Docker PostgreSQL service:
  - database: `accounting`.
  - user: `accounting`.
  - target: local container exposed on localhost port `5432`.
- No production, beta, hosted, shared, Supabase, Vercel, or customer-data target was used.

## 4. Main Conversion PO Protection

The main DEV-08C purchase order was verified read-only:

| Field | Verified value |
| --- | --- |
| Purchase order number | `PO-000141` |
| Safe id prefix | `d6abea75` |
| Status | `BILLED` |
| Converted bill safe id prefix | `f37c60b2` |
| Total | `1150.0000` |

`PO-000141` must not be reused for the close branch because the code only allows close from `APPROVED`, `SENT`, or `PARTIALLY_BILLED`. The converted PO is already `BILLED` and must remain the conversion/finalization evidence record.

Existing marker counts:

| Check | Count |
| --- | ---: |
| Purchase orders with DEV-08C marker | `1` |
| Existing close-branch purchase orders with DEV-08C marker and `CLOSE` suffix | `0` |

## 5. Close Transition Code Rules

Code inspected:

- `apps/api/src/purchase-orders/purchase-order.service.ts`.
- `apps/api/src/purchase-orders/purchase-order.controller.ts`.
- `apps/api/src/purchase-orders/purchase-order-rules.spec.ts`.
- `apps/api/src/audit-log/audit-events.ts`.

Rules found:

- `PurchaseOrderService.close(...)` returns the existing order if status is already `CLOSED`.
- Allowed statuses before close:
  - `APPROVED`.
  - `SENT`.
  - `PARTIALLY_BILLED`.
- Any other status, including `DRAFT`, `BILLED`, and `VOIDED`, is rejected with `Only approved, sent, or partially billed purchase orders can be closed.`
- Successful close updates:
  - `status` to `CLOSED`.
  - `closedAt` to the current timestamp.
- Successful close logs service audit action `PurchaseOrder:CLOSE`, mapped to `PURCHASE_ORDER_CLOSED`.
- The close service does not create purchase bills, journal entries, generated documents, PDFs, email, ZATCA artifacts, purchase receipts, stock movements, supplier payments, supplier refunds, purchase debit notes, or cash expenses.
- Controller route `POST /purchase-orders/:id/close` requires `purchaseOrders.update`.
- Existing unit coverage includes closing a sent purchase order.

## 6. Planned Close-Branch Fixture

Part 17 should create and close one separate fake local close-branch purchase order:

- Marker: `DEV08C-AP-20260526T000000`.
- Suffix: `CLOSE`.
- Supplier: reuse the existing fake DEV-08C local supplier if still active; create no real supplier or customer data.
- Purchase order: one new fake purchase order with marker and suffix `CLOSE`.
- Line shape: same safe single-line VAT path as the prior DEV-08C purchase order fixture unless the Part 17 local guard finds a safer active posting account.
- Planned amount: subtotal `1000.0000`, VAT `150.0000`, total `1150.0000`.
- Mutations planned for Part 17 only after exact approval:
  - create the close-branch purchase order.
  - approve it.
  - mark it sent.
  - close it.
- Explicitly forbidden in Part 17:
  - do not convert it to a bill.
  - do not finalize a bill.
  - do not generate PDF/export/download/archive output.
  - do not create journals.
  - do not create purchase receipts, stock movements, supplier payments, supplier refunds, purchase debit notes, or cash expenses.

## 7. Expected State Sequence

Expected close-branch purchase order sequence:

| Step | Expected status |
| --- | --- |
| Create close-branch PO | `DRAFT` |
| Approve close-branch PO | `APPROVED` |
| Mark sent close-branch PO | `SENT` |
| Close close-branch PO | `CLOSED` |

The main conversion purchase order must remain `BILLED` throughout Part 17.

## 8. Expected Accounting/Journal Result

- Purchase order create, approve, mark-sent, and close are operational state transitions only.
- Expected journal entries for the close-branch purchase order: `0`.
- Expected purchase bills for the close-branch purchase order: `0`.
- Expected converted bill link on the close-branch purchase order: absent.

## 9. Expected Audit Result

Expected close-branch purchase order audit sequence:

| Expected audit action | Count |
| --- | ---: |
| `PURCHASE_ORDER_CREATED` | `1` |
| `PURCHASE_ORDER_APPROVED` | `1` |
| `PURCHASE_ORDER_SENT` | `1` |
| `PURCHASE_ORDER_CLOSED` | `1` |

No `PURCHASE_ORDER_CONVERTED_TO_BILL` audit action should exist for the close-branch purchase order.

## 10. Expected Forbidden Side Effects

Expected forbidden side-effect result for the close branch:

- No purchase bill.
- No journal entry.
- No generated document, PDF, export, download, or archive row.
- No email or ZATCA side effect.
- No supplier payment.
- No supplier refund.
- No purchase debit note.
- No purchase receipt.
- No inventory stock movement.
- No cash expense.
- No cleanup/delete.
- No migration, seed/reset/delete, deploy, environment/provider/schema change, production, beta, hosted, shared-target, or customer-data effect.

## 11. Required Approval Phrase

`I approve DEV-08C Part 17 local-only purchase order close branch mutation under marker DEV08C-AP-20260526T000000. No production, no beta, no customer data.`

The user already provided this exact approval phrase in the current thread. Part 17 must still re-check it before any write-capable service import or local mutation.

## 12. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- Targeted reads of required docs:
  - `CODEX_HANDOFF.md`.
  - `docs/development/DEV_08B_AP_DEBIT_NOTE_REFUND_CLOSURE.md`.
  - `docs/development/DEV_08_AP_STATE_MACHINE_CLOSURE.md`.
  - `docs/development/DEV_03_AP_STATE_MACHINE_DRY_RUN_PLAN.md`.
  - `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
  - `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`.
  - `docs/development/DEVELOPMENT_COMPLETION_PLAN.md`.
  - `BUG_AUDIT.md`.
  - `README.md`.
  - `docs/development/DEV_08C_CONVERTED_PURCHASE_BILL_FINALIZATION_EVIDENCE_VERIFICATION.md`.
  - `docs/development/DEV_08C_PURCHASE_ORDER_CONVERSION_PREFLIGHT.md`.
- Targeted source reads/searches for:
  - `apps/api/src/purchase-orders/purchase-order.service.ts`.
  - `apps/api/src/purchase-orders/purchase-order.controller.ts`.
  - `apps/api/src/purchase-orders/purchase-order-rules.spec.ts`.
  - `apps/api/src/audit-log/audit-events.ts`.
  - `apps/api/prisma/schema.prisma`.
- `docker info --format '{{.ServerVersion}} {{.OSType}}'`.
- `docker ps --filter name=infra-postgres-1 --filter name=infra-redis-1 --format '{{.Names}} {{.Status}} {{.Ports}}'`.
- `Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet`.
- `Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet`.
- Local read-only `psql` checks against the Docker PostgreSQL container for main PO state and close-branch marker counts.
- `Get-ChildItem -Path apps/api/scripts -File` filtered for `*dev08c*`.

## 13. Commands Skipped And Why

- Create, approve, mark sent, close, void, convert, finalize, cleanup, migration, seed/reset/delete, and other mutation commands: forbidden for Part 16 read-only preflight.
- API/web startup: not needed for code inspection and direct read-only local database checks.
- Browser/login flows: forbidden because they can write audit logs.
- PDF/export/download/archive/output generation: forbidden.
- Email and ZATCA commands: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope for this prompt.
- Deploys, Vercel/Supabase changes, environment/provider/schema changes, backup/restore, production-hosting research, production, beta, shared, hosted, and customer-data targets: explicitly forbidden.

## 14. Blockers Or Discrepancies

- No blocker found.
- No discrepancy found.
- One harmless initial `psql` attempt used the non-existent local role `postgres`; the local compose database correctly uses the `accounting` role and subsequent read-only checks succeeded.

## 15. Exact Next Prompt Title

`DEV-08C Part 17: approved local purchase order close branch mutation`

## 16. Evidence Note

DEV-08C Part 17 executed this close-branch plan locally and recorded evidence in [DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_MUTATION_EVIDENCE.md](DEV_08C_PURCHASE_ORDER_CLOSE_BRANCH_MUTATION_EVIDENCE.md). The separate close-branch order `PO-000142` safe prefix `d40b6716` reached `CLOSED`; the main converted order `PO-000141` remained `BILLED`; no purchase bill, journal, generated document, email, ZATCA, receipt, inventory, supplier payment/refund/debit note, or cash expense side effect was found.
