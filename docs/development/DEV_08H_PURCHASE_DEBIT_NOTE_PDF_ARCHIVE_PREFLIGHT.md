# DEV-08H Purchase Debit Note PDF Archive Preflight

## Purpose And Scope

- Task: `DEV-08H Part 16: purchase debit note PDF archive preflight`.
- Latest commit inspected: `851f0398 Verify DEV-08H supplier-refund PDF archive`.
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no download, no email, no ZATCA.
- Marker: `DEV08H-AP-20260528T000000`.

## Selected Source

- Purchase debit note: `PDN-000127`.
- Safe prefix: `7c07411c`.
- Status: `FINALIZED`.
- Total: `69.0000`.
- Live unapplied amount: `69.0000`.
- Journal entry safe prefix: `13ec8afb`.
- Suitability: local fake finalized purchase debit note source created specifically for DEV-08H AP output evidence.

## Route And Service Boundary

- Data route: `GET /purchase-debit-notes/:id/pdf-data`, permission `purchaseDebitNotes.view`; read-only.
- Stream/archive route: `GET /purchase-debit-notes/:id/pdf`, permission `purchaseDebitNotes.view`, service `PurchaseDebitNoteService.pdf(...)`; renders PDF and archives a generated document.
- Explicit archive route: `POST /purchase-debit-notes/:id/generate-pdf`, permission `purchaseDebitNotes.view`, service `PurchaseDebitNoteService.generatePdf(...)`; delegates to `pdf(...)`.
- Expected generated document: `documentType=PURCHASE_DEBIT_NOTE`, `sourceType=PurchaseDebitNote`, `sourceId` safe prefix `7c07411c`, `storageProvider=database`.
- Expected filename pattern: `purchase-debit-note-PDN-000127.pdf`.
- Expected audit action from archive: `CREATE` on `GeneratedDocument`.
- ZATCA/PDF-A3 boundary: purchase debit note PDF archive is normal AP debit-note PDF output only and has no ZATCA signing, XML, QR, clearance/reporting, or production-compliance claim.

## Baselines

- Purchase-debit-note generated documents for selected source before mutation: `0`.
- Marker email outbox/provider-event rows: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Approval Phrase For Part 17

`I approve DEV-08H Part 17 local-only purchase debit note PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 17: approved local purchase debit note PDF archive mutation`
