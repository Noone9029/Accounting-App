# DEV-08H AP Output Source Fixture Mutation Evidence

## Purpose And Scope

This document records DEV-08H Part 2: approved local-only AP output source fixture mutation.

- Task: `DEV-08H Part 2: approved local AP output source fixture mutation`.
- Latest commit inspected: `e21ae33b Plan DEV-08H AP output evidence`.
- Runtime mutation performed: yes, local-only source records only.
- Approval phrase status: exact Part 2 phrase was received in the up-front DEV-08H approval bundle and checked before mutation.
- Marker: `DEV08H-AP-20260528T000000`.
- Local-only target proof: the runner refused non-local database targets before dynamically importing write-capable services.
- Temporary script cleanup: `apps/api/scripts/dev08h-part2-runner.ts` was removed after execution; no `*dev08h*` script remained under `apps/api/scripts`.

## Source Fixture Pack Created

All records use local fake data and safe-prefix evidence only.

| Family | Number | Safe prefix | Status | Amount evidence | Journal safe prefix |
| --- | --- | --- | --- | --- | --- |
| Purchase order | `PO-000144` | `8f42caf7` | `APPROVED` | total `115.0000` | n/a |
| Purchase bill | `BILL-000423` | `16e6f021` | `FINALIZED` | total `230.0000`; live balance due verified in Part 3 after payment allocation | `2184df0c` |
| Supplier payment | `PAY-000318` | `7efa0003` | `POSTED` | amount paid `150.0000`, unapplied `50.0000` before refund source claim | `70443308` |
| Supplier refund | `SRF-000127` | `e7eed3c7` | `POSTED` | amount refunded `25.0000` | `49b59233` |
| Purchase debit note | `PDN-000127` | `7c07411c` | `FINALIZED` | total `69.0000`, unapplied `69.0000` | `13ec8afb` |
| Cash expense | `EXP-000065` | `bd4d1330` | `POSTED` | total `46.0000` | `c5f37e88` |

Supplier safe prefix: `4a37083e`.

## Mutation Path

- Created one fake local supplier contact.
- Created and approved one purchase order.
- Created and finalized one purchase bill.
- Created one posted supplier payment with one bill allocation and an unapplied balance.
- Created one posted supplier refund from the local supplier-payment source.
- Created and finalized one purchase debit note.
- Created one posted cash expense.

## Side Effects

- Generated documents for selected source records: `0`.
- Marker email outbox rows: `0`.
- Marker email provider events: `0`.
- Marker ZATCA rows: `0`.
- PDF/archive generation: not run.
- Generated-document download: not run.
- Email enqueue/send/provider call: not run.
- ZATCA network/signing/PDF-A3: not run.

## Exact Next Prompt Title

`DEV-08H Part 3: AP output source fixture evidence verification`

## Part 3 Note

- Part 3 verified the source fixture pack in [DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md](DEV_08H_AP_OUTPUT_SOURCE_FIXTURE_EVIDENCE_VERIFICATION.md).
- Live post-allocation balances: bill `BILL-000423` balance due `130.0000`; supplier payment `PAY-000318` unapplied `25.0000`.
- Generated-document, marker email, and marker ZATCA counts remained `0`.
