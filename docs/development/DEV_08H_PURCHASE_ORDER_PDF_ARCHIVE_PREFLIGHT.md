# DEV-08H Purchase Order PDF Archive Preflight

## Purpose And Scope

- Task: `DEV-08H Part 4: purchase order PDF archive preflight`.
- Latest commit inspected: `91b4f7d6 Verify DEV-08H AP output source fixtures`.
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no download, no email, no ZATCA.
- Marker: `DEV08H-AP-20260528T000000`.

## Selected Source

- Purchase order: `PO-000144`.
- Safe prefix: `8f42caf7`.
- Status: `APPROVED`.
- Total: `115.0000`.
- Suitability: local fake source created specifically for DEV-08H AP output evidence.

## Route And Service Boundary

- Data route: `GET /purchase-orders/:id/pdf-data`, permission `purchaseOrders.view`, service `PurchaseOrderService.pdfData(...)`; read-only.
- Stream/archive route: `GET /purchase-orders/:id/pdf`, permission `purchaseOrders.view`, service `PurchaseOrderService.pdf(...)`; renders PDF and archives a generated document.
- Explicit archive route: `POST /purchase-orders/:id/generate-pdf`, permission `purchaseOrders.view`, service `PurchaseOrderService.generatePdf(...)`; delegates to `pdf(...)` and returns generated-document metadata.
- Expected generated document: `documentType=PURCHASE_ORDER`, `sourceType=PurchaseOrder`, `sourceId` safe prefix `8f42caf7`, `storageProvider=database`.
- Expected audit action from archive: `CREATE` on `GeneratedDocument`.
- ZATCA/PDF-A3 boundary: purchase order PDF archive is normal PDF output only and has no ZATCA signing, XML, QR, clearance/reporting, or production-compliance claim.

## Baselines

- Purchase-order generated documents for selected source before mutation: `0`.
- Marker email outbox/provider-event rows: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Approval Phrase For Part 5

`I approve DEV-08H Part 5 local-only purchase order PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 5: approved local purchase order PDF archive mutation`

## Part 5 Note

- Part 5 archived one purchase-order PDF in [DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_MUTATION_EVIDENCE.md](DEV_08H_PURCHASE_ORDER_PDF_ARCHIVE_MUTATION_EVIDENCE.md).
- Generated document safe prefix `8797cdeb`, filename `purchase-order-PO-000144.pdf`, hash prefix `ed41181eafb7`, size `3226` bytes.
- Marker email and ZATCA counts remained `0`.
