# DEV-08H Purchase Debit Note PDF Archive Mutation Evidence

## Purpose And Scope

- Task: `DEV-08H Part 17: approved local purchase debit note PDF archive mutation`.
- Latest commit inspected: `aba99678 Plan DEV-08H purchase-debit-note PDF archive`.
- Runtime mutation performed: yes, exactly one local `PurchaseDebitNoteService.generatePdf(...)` archive call.
- Marker: `DEV08H-AP-20260528T000000`.
- Approval phrase status: exact Part 17 phrase received in the up-front DEV-08H approval bundle and checked before mutation.

## Source

- Purchase debit note: `PDN-000127`.
- Safe prefix: `7c07411c`.
- Status: `FINALIZED`.
- Total: `69.0000`.
- Live unapplied amount: `69.0000`.
- Journal entry safe prefix: `13ec8afb`.
- Source type stored on generated document: `PurchaseDebitNote`.

## Generated Document Evidence

- Generated document safe prefix: `b5626ade`.
- Document type: `PURCHASE_DEBIT_NOTE`.
- Document number: `PDN-000127`.
- Filename: `purchase-debit-note-PDN-000127.pdf`.
- Hash prefix: `eb5f03433c0b`.
- Size: `3336` bytes.
- Status: `GENERATED`.
- Storage provider: `database`.
- Storage key present: no.
- PDF body/base64 printed: no.

## Counts And Side Effects

- Selected-source purchase-debit-note generated documents: `0 -> 1`.
- Marker email outbox rows: `0 -> 0`.
- Marker email provider events: `0 -> 0`.
- Marker ZATCA rows: `0 -> 0`.
- Real email provider call: no.
- Real ZATCA call, signing, clearance, reporting, or PDF/A-3 action: no.
- Temporary script cleanup: no `*dev08h*` runner was created for this part.

## Exact Next Prompt Title

`DEV-08H Part 18: purchase debit note PDF archive evidence verification`
