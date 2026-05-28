# DEV-08H AP Output Duplicate Generation Preflight

## Purpose And Scope

- Task: `DEV-08H Part 25: AP output duplicate generation preflight`.
- Latest commit inspected: `12c4f198 Verify DEV-08H generated document download integrity`.
- Runtime mutation performed: no.
- Duplicate PDF generation performed: no.
- Marker: `DEV08H-AP-20260528T000000`.

## Selected Source

- Selected family: purchase order.
- Selected source: `PO-000144`.
- Source safe prefix: `8f42caf7`.
- Source status: `APPROVED`.
- Source total: `115.0000`.
- Reason selected: low-risk AP output source with no accounting source-state mutation expected from another PDF archive call.

## Existing Generated Document Baseline

- Current purchase-order generated documents for selected source: `1`.
- Existing generated document safe prefix: `8797cdeb`.
- Filename: `purchase-order-PO-000144.pdf`.
- Hash prefix: `ed41181eafb7`.
- Size: `3226` bytes.
- Status: `GENERATED`.

## Expected Duplicate Behavior

- `GeneratedDocumentService.archivePdf(...)` uses `prisma.generatedDocument.create(...)`.
- `PurchaseOrderService.generatePdf(...)` delegates to PDF render/archive and does not look up or reuse an existing generated document.
- Expected Part 26 behavior: a second `PURCHASE_ORDER` generated document row for `PO-000144`, with the same filename and same deterministic hash/size unless the render timestamp changes output bytes.
- Source accounting state should remain `APPROVED`.
- No email, ZATCA, signing, clearance/reporting, or PDF/A-3 behavior is expected.

## Baselines

- Marker email outbox/provider-event rows: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Approval Phrase For Part 26

`I approve DEV-08H Part 26 local-only AP output duplicate generation check under marker DEV08H-AP-20260528T000000. No production, no beta, no customer data.`

## Exact Next Prompt Title

`DEV-08H Part 26: approved local AP output duplicate generation check`
