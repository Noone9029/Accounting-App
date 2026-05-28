# DEV-08J AP Repeated Blocker Source Fixture Mutation Evidence

## Scope

- Task: `DEV-08J Part 2: approved local AP repeated blocker source fixture mutation`.
- Approval phrase status: received exactly.
- Marker: `DEV08J-AP-20260528T000000`.
- Latest commit inspected: `0342d742 Close DEV-08I AP output permission evidence`.
- Local-only proof: sanitized DB target was protocol `postgresql`, host `localhost`, port `5432`, database `accounting`.
- Runtime mutation performed: yes, local fake AP fixtures only.
- Output/PDF generation performed: no.

## Side-Effect Counts

| Count | Before | After |
| --- | ---: | ---: |
| Generated documents | `852` | `852` |
| Email outbox rows | `224` | `224` |
| ZATCA submission logs | `331` | `331` |
| Planned signed artifact drafts | `33` | `33` |
| Journal entries | `3161` | `3182` |

## Fixture Summary

| Family | Numbers | Safe prefixes / states |
| --- | --- | --- |
| Purchase orders | `PO-000145` to `PO-000149` | approved `31af1f9f`, sent `c5964777`, closed `6b8b3ffd`, voided `5fd4ea6a`, billed `1719b0fb` |
| Purchase bills | `BILL-000424` to `BILL-000431` | draft converted bill plus finalized/blocked/finalize-void/receipt-asset fixtures |
| Supplier payments | `PAY-000319` to `PAY-000324` | posted payment allocation, unapplied allocation, refund blocker, apply/reverse, and void-repeat fixtures |
| Supplier refunds | `SRF-000128` to `SRF-000130` | payment-sourced and debit-note-sourced posted refunds plus a void-repeat refund |
| Purchase debit notes | `PDN-000128` to `PDN-000130` | active allocation, posted refund blocker, and apply/reverse/void-repeat fixtures |
| Cash expense | `EXP-000066` | posted cash expense for void-repeat checks |
| Purchase receipt | `PRC-000232` | posted receipt with active inventory asset posting |

## Blocker Baselines Prepared

- Purchase bill void blockers: active supplier payment allocation, active supplier payment unapplied allocation, active purchase debit note allocation.
- Supplier payment void blockers: active unapplied allocation and posted supplier refund.
- Purchase debit note void blockers: active allocation and posted supplier refund.
- Purchase receipt blockers: active inventory asset posting, repeated asset post, repeated asset reversal, repeated void.

## Exposure And Cleanup

- No production, beta, hosted/shared, or customer data was used.
- No secrets, tokens, auth headers, request/response bodies, PDF bodies, base64, email bodies, signed XML, or QR payloads were printed.
- The temporary runner was kept untracked during the single uncommitted DEV-08J chain and is deleted before closure/commit.
