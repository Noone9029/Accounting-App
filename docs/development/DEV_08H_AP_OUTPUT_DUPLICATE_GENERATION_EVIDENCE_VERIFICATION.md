# DEV-08H AP Output Duplicate Generation Evidence Verification

## Purpose And Scope

- Task: `DEV-08H Part 27: AP output duplicate generation evidence verification`.
- Latest commit inspected: `4520ba26 Check DEV-08H AP output duplicate generation`.
- Runtime mutation performed: no.
- Marker: `DEV08H-AP-20260528T000000`.
- PDF body/base64 printed: no.

## Verification Result

- Selected source `PO-000144` still exists with safe prefix `8f42caf7`.
- Source state remained `APPROVED`.
- Source total remained `115.0000`.
- Purchase-order generated document count for selected source is `2`, matching Part 26 evidence.
- Existing generated document safe prefix: `8797cdeb`, hash prefix `ed41181eafb7`, size `3226` bytes.
- Duplicate generated document safe prefix: `b01ee620`, hash prefix `6ffd6d911c82`, size `3227` bytes.
- Both rows have filename `purchase-order-PO-000144.pdf`, status `GENERATED`, and stored content present.

## Classification

- Current behavior permits duplicate generated-document archive rows for repeated AP output generation.
- This is not a data-integrity failure for DEV-08H, but it needs a future product/idempotency decision if the desired behavior is reuse, supersede, or explicit versioning.

## Side Effects

- Audit actions tied to selected source/documents: `GENERATED_DOCUMENT_CREATED = 2`, `PURCHASE_ORDER_CREATED = 1`, `PURCHASE_ORDER_APPROVED = 1`.
- Marker email outbox rows: `0`.
- Marker email provider events: `0`.
- Marker ZATCA rows: `0`.
- No `*dev08h*` temporary script remained under `apps/api/scripts`.

## Exact Next Prompt Title

`DEV-08H Part 28: AP email output boundary preflight`
