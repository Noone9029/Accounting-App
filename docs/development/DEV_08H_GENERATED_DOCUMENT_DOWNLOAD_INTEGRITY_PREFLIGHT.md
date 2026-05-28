# DEV-08H Generated Document Download Integrity Preflight

## Purpose And Scope

- Task: `DEV-08H Part 22: generated document download integrity preflight`.
- Latest commit inspected: `cfe3c641 Verify DEV-08H cash-expense PDF archive`.
- Runtime mutation performed: no.
- Download performed: no.
- PDF body/base64 printed: no.
- Marker: `DEV08H-AP-20260528T000000`.

## Documents Selected

| Document type | Number | Safe prefix | Filename | Hash prefix | Size bytes | Content present |
| --- | --- | --- | --- | --- | ---: | --- |
| `PURCHASE_ORDER` | `PO-000144` | `8797cdeb` | `purchase-order-PO-000144.pdf` | `ed41181eafb7` | `3226` | yes |
| `PURCHASE_BILL` | `BILL-000423` | `27a07429` | `purchase-bill-BILL-000423.pdf` | `47935bce9f75` | `3417` | yes |
| `SUPPLIER_PAYMENT_RECEIPT` | `PAY-000318` | `11846c56` | `supplier-payment-PAY-000318.pdf` | `4cf43aeb4f19` | `3137` | yes |
| `SUPPLIER_REFUND` | `SRF-000127` | `676ceaa6` | `supplier-refund-SRF-000127.pdf` | `45a947874e20` | `3043` | yes |
| `PURCHASE_DEBIT_NOTE` | `PDN-000127` | `b5626ade` | `purchase-debit-note-PDN-000127.pdf` | `eb5f03433c0b` | `3336` | yes |
| `CASH_EXPENSE` | `EXP-000065` | `4b8b7378` | `cash-expense-EXP-000065.pdf` | `3ab2c65a6ac0` | `3265` | yes |

## Download Integrity Method

- Use the generated document service download path for local fake DEV-08H records only.
- Convert the returned buffer to a hash and compare it with the stored `contentHash`.
- Compare returned byte length with stored `sizeBytes`.
- Print only document type, safe document prefix, filename, hash prefix, size, and match status.
- Do not print PDF body, `contentBase64`, request/response bodies, auth headers, cookies, or secrets.

## Expected Side Effects

- Generated document count should remain unchanged.
- AP source accounting states should remain unchanged.
- Marker email outbox/provider-event rows should remain `0`.
- Marker ZATCA rows should remain `0`.
- No real email provider call, no ZATCA call, no signing, no clearance/reporting, and no PDF/A-3 action.

## Approval Phrase For Part 23

`I approve DEV-08H Part 23 local-only generated document download integrity check under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 23: approved local generated document download integrity check`

## Part 23 Note

- Part 23 checked local generated-document download integrity for all six selected DEV-08H documents.
- Returned buffer hash and byte count matched stored metadata for every selected document.
- Total generated document count remained `839`.
- Marker email outbox/provider-event rows and marker ZATCA rows remained `0`.
- PDF body/base64 was not printed.
