# DEV-08H AP Output Duplicate Generation Evidence

## Purpose And Scope

- Task: `DEV-08H Part 26: approved local AP output duplicate generation check`.
- Latest commit inspected: `45c45ceb Plan DEV-08H AP output duplicate generation check`.
- Runtime mutation performed: yes, exactly one additional local `PurchaseOrderService.generatePdf(...)` archive call.
- Marker: `DEV08H-AP-20260528T000000`.
- Approval phrase status: exact Part 26 phrase received in the up-front DEV-08H approval bundle and checked before mutation.
- PDF body/base64 printed: no.

## Source

- Selected source: `PO-000144`.
- Source safe prefix: `8f42caf7`.
- Status before: `APPROVED`.
- Status after: `APPROVED`.
- Total before/after: `115.0000`.

## Duplicate Behavior Observed

- Purchase-order generated documents for selected source: `1 -> 2`.
- Existing generated document safe prefix: `8797cdeb`.
- New generated document safe prefix: `b01ee620`.
- Filename: `purchase-order-PO-000144.pdf`.
- Previous hash prefix: `ed41181eafb7`.
- New hash prefix: `6ffd6d911c82`.
- Previous size: `3226` bytes.
- New size: `3227` bytes.
- Same hash as previous: no.
- Same size as previous: no.
- Current behavior classification: duplicate archive rows are allowed by the service; this should be a future product/idempotency decision if reuse or supersede behavior is desired.

## Counts And Side Effects

- Generated document audit actions tied to selected source/documents: `GENERATED_DOCUMENT_CREATED = 2` total for the two purchase-order archive rows.
- Expected source audit actions remained present: `PURCHASE_ORDER_CREATED = 1`, `PURCHASE_ORDER_APPROVED = 1`.
- Marker email outbox rows: `0 -> 0`.
- Marker email provider events: `0 -> 0`.
- Marker ZATCA rows: `0 -> 0`.
- Real email provider call: no.
- Real ZATCA call, signing, clearance, reporting, or PDF/A-3 action: no.
- Temporary script cleanup: no `*dev08h*` runner was created for this part.

## Exact Next Prompt Title

`DEV-08H Part 27: AP output duplicate generation evidence verification`

## Part 27 Note

- Part 27 verified exactly two purchase-order generated-document archive rows for `PO-000144`.
- Duplicate row `b01ee620` remains intact with filename `purchase-order-PO-000144.pdf`, hash prefix `6ffd6d911c82`, and size `3227` bytes.
- Source state remained `APPROVED`; marker email and ZATCA counts remained `0`.
- Classification remains a future product/idempotency decision.
