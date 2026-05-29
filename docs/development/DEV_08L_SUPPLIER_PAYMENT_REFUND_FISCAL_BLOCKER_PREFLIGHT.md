# DEV-08L Supplier Payment Refund Fiscal Blocker Preflight

## Purpose And Scope

- Task: `DEV-08L Part 7: supplier payment refund fiscal blocker preflight`.
- Latest commit inspected: `54684410 Verify DEV-08L purchase bill fiscal blockers`.
- Marker: `DEV08L-AP-20260529T000000`.
- Runtime mutation performed: no.
- Supplier payment/refund service blocker calls performed: no.
- Login/browser/output/email/ZATCA/migration/seed/reset/delete/deploy/env/provider action performed: no.

This was a read-only preflight for supplier payment and supplier refund fiscal-period blocker checks.

## Source Evidence

- Fixture verification: [DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md).
- Fiscal guard inventory: [DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md](DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md).
- Supplier payment service: `apps/api/src/supplier-payments/supplier-payment.service.ts`.
- Supplier refund service: `apps/api/src/supplier-refunds/supplier-refund.service.ts`.

## Local Target Verification

- Database target classification: local-only.
- Protocol: `postgresql`.
- Host: `localhost`.
- Port: `5432`.
- Database: `accounting`.
- Fixture organization safe prefix: `cdc2c778`.

## Guard Inventory

- `SupplierPaymentService.create(...)` calls `assertPostingDateAllowed(organizationId, paymentDate, tx)` before supplier/account validation, number sequencing, journal creation, payment creation, allocation changes, or audit logging.
- `SupplierPaymentService.void(...)` calls `assertPostingDateAllowed(organizationId, reversalDate, tx)` after confirming the payment is posted and has a journal entry, but before unapplied-allocation checks, refund checks, state claim, bill balance restoration, reversal journal creation, and audit logging.
- `SupplierRefundService.create(...)` calls `assertPostingDateAllowed(organizationId, refundDate, tx)` before supplier/account/source validation, source claim, number sequencing, journal creation, refund creation, or audit logging.
- `SupplierRefundService.void(...)` calls `assertPostingDateAllowed(organizationId, reversalDate, tx)` after confirming the refund is posted and has a journal entry, but before state claim, source unapplied restoration, reversal journal creation, or audit logging.

Expected fiscal guard message for all selected checks: `Posting date falls in a closed fiscal period.`

## Selected Part 8 Checks

| Check | Selected fixture/input | Expected |
| --- | --- | --- |
| Supplier payment create | supplier safe prefix `c9ee417b`, account safe prefix `61155360`, payment date `2026-05-12`, amount `10.0000`, no allocations | blocked before payment/journal/sequence/audit writes |
| Supplier payment void | payment safe prefix `59c3a992`, number `DEV08L-SP-VOID`, current reversal date in closed period | blocked before void state/reversal journal |
| Supplier refund create | source payment safe prefix `6fa2b089`, supplier safe prefix `c9ee417b`, account safe prefix `61155360`, refund date `2026-05-12`, amount `10.0000` | blocked before source claim/refund/journal/audit writes |
| Supplier refund void | refund safe prefix `67a8f011`, number `DEV08L-SRF-VOID`, current reversal date in closed period | blocked before void state/source restoration/reversal journal |

## Baseline Fixtures

### Supplier Payments

| Safe prefix | Number | Status | Date | Amount paid | Unapplied | Journal | Void reversal journal |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| `59c3a992` | `DEV08L-SP-VOID` | `POSTED` | `2026-06-12` | `100` | `100` | yes | no |
| `6fa2b089` | `DEV08L-SP-REFUND-CREATE-SOURCE` | `POSTED` | `2026-06-12` | `100` | `100` | yes | no |
| `908f37de` | `DEV08L-SP-REFUND-VOID-SOURCE` | `POSTED` | `2026-06-12` | `100` | `100` | yes | no |

### Supplier Refunds

| Safe prefix | Number | Status | Date | Amount refunded | Source payment | Journal | Void reversal journal |
| --- | --- | --- | --- | ---: | --- | --- | --- |
| `67a8f011` | `DEV08L-SRF-VOID` | `POSTED` | `2026-06-12` | `25` | `908f37de` | yes | no |

## Baseline Counts

| Count | Baseline |
| --- | ---: |
| Supplier payments | `3` |
| Supplier refunds | `1` |
| Supplier payment allocations | `0` |
| Supplier payment unapplied allocations | `0` |
| Journal entries | `10` |
| Audit logs | `0` |
| Email outbox rows | `0` |
| Generated documents | `0` |
| Email provider events | `0` |
| ZATCA invoice metadata rows | `0` |
| ZATCA submission logs | `0` |

## Part 8 Plan

- Recheck the local DB target before importing write-capable services.
- Instantiate `SupplierPaymentService` and `SupplierRefundService` with `FiscalPeriodGuardService`, `NumberSequenceService`, and `AuditLogService`.
- Run exactly four approved local service calls:
  - `SupplierPaymentService.create(...)` using the closed-period payment date.
  - `SupplierPaymentService.void(...)` for payment safe prefix `59c3a992`.
  - `SupplierRefundService.create(...)` using the closed-period refund date and source payment safe prefix `6fa2b089`.
  - `SupplierRefundService.void(...)` for refund safe prefix `67a8f011`.
- Catch expected blocker messages.
- Verify after the blocked calls that:
  - Supplier payment and refund statuses remain `POSTED`.
  - Source payment unapplied amounts remain unchanged.
  - Supplier payment/refund counts remain `3` and `1`.
  - Journal count remains `10`.
  - Audit log count remains `0`.
  - Output/email/ZATCA counts remain `0`.
  - No temporary script remains.

## Required Part 8 Approval Phrase

Received exactly before this preflight:

```text
I approve DEV-08L Part 8 local-only supplier payment refund fiscal-period blocker negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.
```

## Temporary Script Cleanup

- Temporary read-only preflight runner: `apps/api/scripts/dev08l-part7-supplier-payment-refund-preflight.temp.ts`.
- Cleanup result: `Test-Path` returned `False`.
- The temporary runner was not staged.

## Commands Run

- `corepack pnpm --filter @ledgerbyte/api exec tsx scripts/dev08l-part7-supplier-payment-refund-preflight.temp.ts`
- `Remove-Item -LiteralPath 'apps/api/scripts/dev08l-part7-supplier-payment-refund-preflight.temp.ts'; Test-Path -LiteralPath 'apps/api/scripts/dev08l-part7-supplier-payment-refund-preflight.temp.ts'`

## Commands Skipped

- Supplier payment/refund service mutation calls.
- Login/browser.
- Output/PDF generation or download.
- AP email endpoint calls, provider calls, real email, retry workers, diagnostics, SMTP.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths.
- Migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.

## Exact Next Prompt Title

`DEV-08L Part 8: approved local supplier payment refund fiscal-period blocker negative checks`

## Part 8 Evidence Note

- Part 8 evidence is recorded in [DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md](DEV_08L_SUPPLIER_PAYMENT_REFUND_FISCAL_BLOCKER_NEGATIVE_CHECK_EVIDENCE.md).
- The approved Part 7 supplier payment/refund calls were the only service calls executed.
- All four calls were blocked with `Posting date falls in a closed fiscal period.`
- Supplier payment/refund statuses, source unapplied amounts, journal count, audit log count, output/email/ZATCA counts, and generated-document count remained unchanged.
- The temporary runner was deleted and not staged.
