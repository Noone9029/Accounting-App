# DEV-08L Purchase Bill Fiscal Blocker Preflight

## Purpose And Scope

- Task: `DEV-08L Part 4: purchase bill fiscal-period blocker preflight`.
- Latest commit inspected: `8c2c3599 Verify DEV-08L AP fiscal permission fixtures`.
- Marker: `DEV08L-AP-20260529T000000`.
- Runtime mutation performed: no.
- AP service blocker calls performed: no.
- Login/browser/output/email/ZATCA/migration/seed/reset/delete/deploy/env/provider action performed: no.

This was a read-only preflight for the approved purchase bill fiscal-period blocker checks.

## Source Evidence

- Fixture verification: [DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08L_AP_FISCAL_PERMISSION_FIXTURE_EVIDENCE_VERIFICATION.md).
- Fiscal guard inventory: [DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md](DEV_08L_AP_FISCAL_PERMISSION_EDGE_PREFLIGHT.md).
- Purchase bill service: `apps/api/src/purchase-bills/purchase-bill.service.ts`.

## Guard Inventory

- `PurchaseBillService.finalize(...)` calls `assertPostingDateAllowed(organizationId, bill.billDate, tx)` while the bill is still `DRAFT`, before claim/update and before journal creation.
- `PurchaseBillService.void(...)` calls `assertPostingDateAllowed(organizationId, reversalDate, tx)` for finalized bills before payment/debit-note allocation checks, state claim, and reversal journal creation.
- Draft purchase bill void does not call the fiscal guard because no journal is reversed.

Expected fiscal guard messages:

- Closed document-date finalize: `Posting date falls in a closed fiscal period.`
- Current-date finalized void: `Posting date falls in a closed fiscal period.`

## Selected Fixtures

| Check | Fixture safe prefix | Number | Status | Date | Expected |
| --- | --- | --- | --- | --- | --- |
| Finalize closed-period draft bill | `81912f0b` | `DEV08L-PB-CLOSED-FINALIZE` | `DRAFT` | `2026-05-12` | blocked before finalization/journal |
| Void finalized bill while current date is in closed fixture period | `a4ab2c11` | `DEV08L-PB-VOID-OPEN` | `FINALIZED` | `2026-06-12` | blocked before void/reversal journal |

## Baseline Counts

Fixture organization safe prefix: `cdc2c778`.

| Count | Baseline |
| --- | ---: |
| Purchase bills | `4` |
| Journal entries | `10` |
| Audit logs | `0` |
| Email outbox rows | `0` |
| Generated documents | `0` |
| Email provider events | `0` |
| ZATCA invoice metadata rows | `0` |
| ZATCA submission logs | `0` |

## Part 5 Plan

- Recheck the local DB target before importing write-capable services.
- Instantiate `PurchaseBillService` with `FiscalPeriodGuardService`, `NumberSequenceService`, and `AuditLogService`.
- Run exactly two approved local service calls:
  - `purchaseBillService.finalize(...)` for bill safe prefix `81912f0b`.
  - `purchaseBillService.void(...)` for bill safe prefix `a4ab2c11`.
- Catch the expected `BadRequestException` messages.
- Verify after each blocked call that:
  - Bill statuses remain `DRAFT` and `FINALIZED`.
  - Journal count remains `10`.
  - Audit log count remains `0`.
  - Output/email/ZATCA counts remain `0`.
  - No temporary script remains.

## Required Part 5 Approval Phrase

Received exactly before this preflight:

```text
I approve DEV-08L Part 5 local-only purchase bill fiscal-period blocker negative checks under marker DEV08L-AP-20260529T000000. No production, no beta, no customer data.
```

## Commands Run

- Read fixture evidence and purchase bill service guard usage.

## Commands Skipped

- Purchase bill finalize/void service calls.
- Any runtime mutation.
- Login/browser.
- Output/PDF generation or download.
- AP email endpoint calls, provider calls, real email, retry workers, diagnostics, SMTP.
- Real ZATCA, signing, clearance/reporting, PDF/A-3, CSID, SDK network paths.
- Migrations, seed/reset/delete, deploys, env/provider changes, backups/restores, full E2E, full smoke, full build, and full test suites.

## Exact Next Prompt Title

`DEV-08L Part 5: approved local purchase bill fiscal-period blocker negative checks`
