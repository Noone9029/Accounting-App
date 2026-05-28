# DEV-08H Purchase Bill PDF Archive Preflight

## Purpose And Scope

- Task: `DEV-08H Part 7: purchase bill PDF archive preflight`.
- Latest commit inspected: `0168261a Verify DEV-08H purchase-order PDF archive`.
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no download, no email, no ZATCA.
- Marker: `DEV08H-AP-20260528T000000`.

## Selected Source

- Purchase bill: `BILL-000423`.
- Safe prefix: `16e6f021`.
- Status: `FINALIZED`.
- Total: `230.0000`.
- Live balance due after payment allocation: `130.0000`.
- Suitability: local fake finalized bill source created specifically for DEV-08H AP output evidence.

## Route And Service Boundary

- Data route: `GET /purchase-bills/:id/pdf-data`, permission `purchaseBills.view`, service `PurchaseBillService.pdfData(...)`; read-only.
- Stream/archive route: `GET /purchase-bills/:id/pdf`, permission `purchaseBills.view`, service `PurchaseBillService.pdf(...)`; renders PDF and archives a generated document.
- Explicit archive route: `POST /purchase-bills/:id/generate-pdf`, permission `purchaseBills.view`, service `PurchaseBillService.generatePdf(...)`; delegates to `pdf(...)`.
- Expected generated document: `documentType=PURCHASE_BILL`, `sourceType=PurchaseBill`, `sourceId` safe prefix `16e6f021`, `storageProvider=database`.
- Expected audit action from archive: `CREATE` on `GeneratedDocument`.
- ZATCA/PDF-A3 boundary: purchase bill PDF archive is normal AP PDF output only and has no ZATCA signing, XML, QR, clearance/reporting, or production-compliance claim.

## Baselines

- Purchase-bill generated documents for selected source before mutation: `0`.
- Marker email outbox/provider-event rows: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Approval Phrase For Part 8

`I approve DEV-08H Part 8 local-only purchase bill PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 8: approved local purchase bill PDF archive mutation`
