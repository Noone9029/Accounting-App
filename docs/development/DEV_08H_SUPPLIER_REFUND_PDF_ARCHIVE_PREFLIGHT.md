# DEV-08H Supplier Refund PDF Archive Preflight

## Purpose And Scope

- Task: `DEV-08H Part 13: supplier refund PDF archive preflight`.
- Latest commit inspected: `a53f11ce Verify DEV-08H supplier-payment-receipt PDF archive`.
- Runtime mutation performed: no.
- Output mutation performed: no PDF generation, no archive record creation, no download, no email, no ZATCA.
- Marker: `DEV08H-AP-20260528T000000`.

## Selected Source

- Supplier refund: `SRF-000127`.
- Safe prefix: `e7eed3c7`.
- Status: `POSTED`.
- Amount refunded: `25.0000`.
- Source type: `SUPPLIER_PAYMENT`.
- Source payment safe prefix: `7efa0003`.
- Journal entry safe prefix: `49b59233`.
- Suitability: local fake posted supplier refund source created specifically for DEV-08H AP output evidence.

## Route And Service Boundary

- Data route: `GET /supplier-refunds/:id/pdf-data`, permission `supplierRefunds.view`; read-only.
- Stream/archive route: `GET /supplier-refunds/:id/pdf`, permission `supplierRefunds.view`, service `SupplierRefundService.pdf(...)`; renders PDF and archives a generated document.
- Explicit archive route: `POST /supplier-refunds/:id/generate-pdf`, permission `supplierRefunds.view`, service `SupplierRefundService.generatePdf(...)`; delegates to `pdf(...)`.
- Expected generated document: `documentType=SUPPLIER_REFUND`, `sourceType=SupplierRefund`, `sourceId` safe prefix `e7eed3c7`, `storageProvider=database`.
- Expected filename pattern: `supplier-refund-SRF-000127.pdf`.
- Expected audit action from archive: `CREATE` on `GeneratedDocument`.
- ZATCA/PDF-A3 boundary: supplier refund PDF archive is normal supplier-refund PDF output only and has no ZATCA signing, XML, QR, clearance/reporting, or production-compliance claim.

## Baselines

- Supplier-refund generated documents for selected source before mutation: `0`.
- Marker email outbox/provider-event rows: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Approval Phrase For Part 14

`I approve DEV-08H Part 14 local-only supplier refund PDF archive mutation under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 14: approved local supplier refund PDF archive mutation`
