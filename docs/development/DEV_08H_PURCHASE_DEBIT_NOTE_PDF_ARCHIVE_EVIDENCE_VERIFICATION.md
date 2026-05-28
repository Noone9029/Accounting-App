# DEV-08H Purchase Debit Note PDF Archive Evidence Verification

## Purpose And Scope

- Task: `DEV-08H Part 18: purchase debit note PDF archive evidence verification`.
- Latest commit inspected: `f41c4625 Archive DEV-08H purchase-debit-note PDF locally`.
- Runtime mutation performed: no.
- Marker: `DEV08H-AP-20260528T000000`.
- PDF/archive/download/email/ZATCA action performed: no.

## Verification Result

- Purchase debit note source `PDN-000127` exists with safe prefix `7c07411c`.
- Source state remained `FINALIZED`.
- Total remained `69.0000`.
- Live unapplied amount remained `69.0000`.
- Allocation count remained `0`.
- Journal entry safe prefix remained `13ec8afb`.
- Exactly one purchase-debit-note generated document exists for the selected source.
- Generated document safe prefix: `b5626ade`.
- Document type: `PURCHASE_DEBIT_NOTE`.
- Source type: `PurchaseDebitNote`.
- Document number: `PDN-000127`.
- Filename: `purchase-debit-note-PDN-000127.pdf`.
- Hash prefix: `eb5f03433c0b`.
- Size: `3336` bytes.
- Status: `GENERATED`.
- Storage provider: `database`.
- Storage key present: no.
- Content base64 present in storage: yes, verified without printing it.

## Side Effects

- Marker email outbox rows: `0`.
- Marker email provider events: `0`.
- Marker ZATCA rows: `0`.
- Audit actions include expected source create/finalize actions plus `GENERATED_DOCUMENT_CREATED = 1`.
- PDF body/base64 was not printed.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Exact Next Prompt Title

`DEV-08H Part 19: cash expense PDF archive preflight`
