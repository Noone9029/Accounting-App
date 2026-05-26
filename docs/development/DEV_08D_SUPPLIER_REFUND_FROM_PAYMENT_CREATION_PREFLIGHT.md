# DEV-08D Supplier Refund From Payment Creation Preflight

## 1. Purpose And Scope

This document records DEV-08D Part 4: read-only preflight for creating one supplier refund sourced from the DEV-08D supplier payment source.

- Marker: `DEV08D-AP-20260526T000000`.
- Runtime mutation performed: no.
- Supplier refund creation performed: no.
- Supplier payment mutation performed: no.
- No allocation, reversal, finalization, delete, cleanup, purchase bill, purchase order, purchase receipt, stock movement, cash expense, purchase debit note, generated document, PDF/archive/export/download, email, ZATCA, migration, seed/reset/delete, deploy, environment/provider/schema, production, beta, shared-target, hosted-target, customer-data, login, or browser/audit-writing action was performed.

## 2. Latest Commit And Local-Only Proof

- Latest commit inspected: `5e490b8c Verify DEV-08D supplier payment refund source`.
- Local `HEAD` matched `origin/main`: `5e490b8c8b877f552748aea6b18e26fa456c9e4b`.
- Branch inspected: `main`.
- `apps/api/.env` database target remained local:
  - host: `localhost`.
  - database: `accounting`.
  - classification: local.
- Read-only SQL was run through local Docker Postgres container `infra-postgres-1`.
- Query output was limited to safe prefixes, counts, statuses, account codes, and amounts.
- No temporary DEV-08D script was created.
- Database URLs, credentials, tokens, cookies, auth headers, request/response bodies, customer/vendor data, document bodies, signed XML, QR payloads, attachment bodies, and email bodies were not printed.

## 3. Source Payment Current State

- Source count: `1`.
- Organization safe prefix: `db69e5a8`.
- Supplier safe prefix: `a5d3ece3`.
- Supplier type: `SUPPLIER`.
- Supplier active: yes.
- Supplier payment: `PAY-000007`.
- Payment safe prefix: `4b9c42b1`.
- Status: `POSTED`.
- Currency: `SAR`.
- Amount paid: `500.0000`.
- Unapplied amount: `500.0000`.
- Void reversal journal: absent.
- Existing refunds sourced from this payment: `0`.
- Existing posted refunds sourced from this payment: `0`.
- Direct supplier payment allocations: `0`.
- Active unapplied allocations: `0`.
- Payment journal: `JE-000058`, `POSTED`, balanced at debit/credit `500.0000`.

Conclusion: the source payment is eligible for a `150.0000` supplier refund.

## 4. Planned Refund Amount And Received-Into Account

- Planned refund amount: `150.0000`.
- Planned source payment unapplied after refund: `350.0000`.
- Received-into account: `112`.
- Received-into account safe prefix: `32ab6f4d`.
- Received-into account type: `ASSET`.
- Received-into account active: yes.
- Received-into account allows posting: yes.
- AP account: `210`, safe prefix `883ea9a6`, type `LIABILITY`, active and posting.

## 5. Expected DTO Shape

Future approved Part 5 mutation should call `SupplierRefundService.create(...)` exactly once with this shape:

```ts
{
  supplierId: "<DEV-08D supplier id>",
  sourceType: "SUPPLIER_PAYMENT",
  sourcePaymentId: "<DEV-08D source supplier payment id>",
  refundDate: "2026-05-26T00:00:00.000Z",
  currency: "SAR",
  amountRefunded: "150.0000",
  accountId: "<account 112 id>",
  description: "DEV08D-AP-20260526T000000 local-only supplier refund from supplier payment"
}
```

`sourceDebitNoteId` should be absent.

## 6. Expected Source Payment Before And After

| Field | Before | After |
| --- | ---: | ---: |
| Source payment status | `POSTED` | `POSTED` |
| Amount paid | `500.0000` | `500.0000` |
| Unapplied amount | `500.0000` | `350.0000` |
| Direct allocations | `0` | `0` |
| Active unapplied allocations | `0` | `0` |
| Posted refunds sourced from payment | `0` | `1` |

No purchase bill balance should change, and no supplier payment allocation should be created.

## 7. Expected Supplier Refund State

- One supplier refund should be created.
- Source type: `SUPPLIER_PAYMENT`.
- Source payment: `PAY-000007`.
- Source debit note: absent.
- Status: `POSTED`.
- Amount refunded: `150.0000`.
- Currency: `SAR`.
- Journal entry: present and posted.
- Void reversal journal: absent.

## 8. Expected Journal And Accounting Result

From `SupplierRefundService.create(...)` and `buildSupplierRefundJournalLines(...)`:

- One supplier refund journal should be created and posted.
- Journal should be balanced at debit/credit `150.0000`.
- Debit received-into asset account `112` for `150.0000`.
- Credit AP account `210` for `150.0000`.
- Existing source payment journal `JE-000058` should remain posted and unreversed.

## 9. Expected Audit Result

- Expected new audit: `SupplierRefund:CREATE` count `1`.
- No supplier refund void audit.
- No supplier payment void audit.
- No allocation/reversal audit.
- No cleanup/delete audit.
- No login/browser audit-writing flow.

## 10. Expected Forbidden Side Effects

Expected marker-scoped counts after the future Part 5 refund creation:

| Check | Expected |
| --- | ---: |
| Generated documents | `0` |
| Email outbox rows | `0` |
| Email provider events | `0` |
| Purchase orders | `0` |
| Purchase receipts | `0` |
| Stock movements | `0` |
| Cash expenses | `0` |
| Purchase debit notes | `0` |
| Cleanup/delete audits | `0` |

ZATCA should remain out of scope. No sales invoice or ZATCA metadata path should be invoked.

## 11. Blockers Or Discrepancies

- No blocker found.
- No discrepancy found.
- Part 5 can proceed only because the user has provided the exact local-only approval phrase for the planned marker and amount.

## 12. Required Approval Phrase For Part 5

`I approve DEV-08D Part 5 local-only supplier refund from supplier payment mutation under marker DEV08D-AP-20260526T000000 for the DEV-08D supplier payment source with refund amount 150.0000. No production, no beta, no customer data.`

## 13. Commands Run

- `git status --short`.
- `git log -1 --oneline`.
- `git rev-parse HEAD`.
- `git rev-parse origin/main`.
- `Get-ChildItem apps/api/scripts -Filter '*dev08d*'`.
- Targeted prompt, handoff, DEV-08D evidence, DTO, service, and accounting helper reads.
- Read-only local SQL through `docker exec -i infra-postgres-1 psql -U accounting -d accounting -v ON_ERROR_STOP=1 -At`.

## 14. Commands Skipped

- Supplier refund creation: reserved for Part 5's approved mutation.
- Supplier payment mutation or void: forbidden for this preflight part.
- Allocation/reversal/finalization/delete/cleanup actions: forbidden.
- Login/browser flows: skipped because they can write audit logs.
- Output/PDF/archive/export/download generation: forbidden.
- ZATCA and email commands: forbidden.
- Migrations, seed/reset/delete, deploys, environment/provider/schema changes, backup/restore, production-hosting research, production, beta, shared-target, hosted-target, and customer-data checks: forbidden.
- Full tests, full build, E2E, smoke, `verify:repo`, and actual `verify:ci:local`: out of scope.

## 15. Next Prompt Title

`DEV-08D Part 5: approved local supplier refund from supplier payment mutation`
