# DEV-08H Generated Document Download Integrity Evidence

## Purpose And Scope

- Task: `DEV-08H Part 23: approved local generated document download integrity check`.
- Latest commit inspected: `57306e8c Plan DEV-08H generated document download integrity`.
- Runtime mutation performed: no.
- Download integrity check performed: yes, for selected local fake DEV-08H generated documents.
- Marker: `DEV08H-AP-20260528T000000`.
- Approval phrase status: exact Part 23 phrase received in the up-front DEV-08H approval bundle and checked before the download checks.
- PDF body/base64 printed: no.

## Integrity Results

| Document type | Number | Safe prefix | Filename | Expected hash | Actual hash | Expected size | Actual size | Result |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| `PURCHASE_ORDER` | `PO-000144` | `8797cdeb` | `purchase-order-PO-000144.pdf` | `ed41181eafb7` | `ed41181eafb7` | `3226` | `3226` | pass |
| `PURCHASE_BILL` | `BILL-000423` | `27a07429` | `purchase-bill-BILL-000423.pdf` | `47935bce9f75` | `47935bce9f75` | `3417` | `3417` | pass |
| `SUPPLIER_PAYMENT_RECEIPT` | `PAY-000318` | `11846c56` | `supplier-payment-PAY-000318.pdf` | `4cf43aeb4f19` | `4cf43aeb4f19` | `3137` | `3137` | pass |
| `SUPPLIER_REFUND` | `SRF-000127` | `676ceaa6` | `supplier-refund-SRF-000127.pdf` | `45a947874e20` | `45a947874e20` | `3043` | `3043` | pass |
| `PURCHASE_DEBIT_NOTE` | `PDN-000127` | `b5626ade` | `purchase-debit-note-PDN-000127.pdf` | `eb5f03433c0b` | `eb5f03433c0b` | `3336` | `3336` | pass |
| `CASH_EXPENSE` | `EXP-000065` | `4b8b7378` | `cash-expense-EXP-000065.pdf` | `3ab2c65a6ac0` | `3ab2c65a6ac0` | `3265` | `3265` | pass |

## Counts And Side Effects

- Hash matches: all selected documents.
- Size matches: all selected documents.
- Filename and MIME type matches: all selected documents.
- Total generated documents in local database: `839 -> 839`.
- Marker email outbox rows: `0`.
- Marker email provider events: `0`.
- Marker ZATCA rows: `0`.
- Real email provider call: no.
- Real ZATCA call, signing, clearance, reporting, or PDF/A-3 action: no.
- Temporary script cleanup: no `*dev08h*` runner was created for this part.

## Exact Next Prompt Title

`DEV-08H Part 24: generated document download integrity evidence verification`
