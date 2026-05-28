# DEV-08K AP Email Outbox Fixture Preflight

## Purpose And Scope

- Task: `DEV-08K Part 7: AP email outbox fixture preflight`.
- Latest commit inspected: `48806634 Verify DEV-08K AP email service`.
- Mode: read-only preflight only.
- Runtime mutation performed: no.
- Email outbox rows created: no.
- Provider calls performed: no.
- Migrations applied: no.

This preflight selected a local fake AP generated document and a synthetic recipient for the approved Part 8 fixture mutation. It did not call the AP email endpoint, enqueue runtime email, send real email, call SMTP/provider code, run workers, print source contact/vendor data, generate/download PDFs, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Selected Generated Document

The selected target is the original DEV-08H purchase-bill generated document row, not a repeated duplicate row:

| Field | Selected value |
| --- | --- |
| Generated document safe prefix | `27a07429` |
| Organization safe prefix | `00000000` |
| Source id safe prefix | `16e6f021` |
| Document type | `PURCHASE_BILL` |
| Source type | `PurchaseBill` |
| Document number | `BILL-000423` |
| Source number | `BILL-000423` |
| Status | `GENERATED` |
| Filename | `purchase-bill-BILL-000423.pdf` |
| MIME type | `application/pdf` |
| Size bytes | `3417` |
| Content hash prefix | `47935bce9f75` |

Reason for selection:

- It is one of the DEV-08H/DEV-08I AP generated-document sources.
- It is in `GENERATED` status.
- Its `documentType` and `sourceType` pair is supported by the Part 5 AP email service.
- It has attachment metadata available without reading or printing document/PDF body content.

Other original DEV-08H AP generated-document families remain available as fallback candidates by safe prefix only: `8797cdeb` purchase order, `11846c56` supplier payment receipt, `676ceaa6` supplier refund, `b5626ade` purchase debit note, and `4b8b7378` cash expense.

## Selected Recipient

- Selected recipient: `dev08k-ap-generated-document@example.test`.
- Recipient source: explicit synthetic DTO recipient for Part 8.
- Source contact/vendor email printed: no.
- Source contact/vendor email required for Part 8: no, because the service accepts an explicit `recipientEmail` before falling back to source contact data.

## Provider And No-Send Posture

- Root `.env` and `apps/api/.env` do not set `EMAIL_PROVIDER` in the targeted read.
- `EmailModule` defaults the active provider to `mock` when `EMAIL_PROVIDER` is unset.
- The AP generated-document email service uses provider value `mock-no-send` for the created row and does not call `this.provider.send(...)`.
- The AP row design uses `SENT_MOCK`, `attemptCount: 0`, `maxAttempts: 0`, and `nextAttemptAt: null`.
- No retry worker, diagnostics send, SMTP send, provider webhook, or provider event ingestion path is part of the Part 8 fixture plan.

## Baseline Counts

Read-only local baseline:

| Check | Result |
| --- | ---: |
| Email outbox rows | `227` |
| DEV-08K marker email rows | `0` |
| Email provider events | `0` |
| AP email migration applied locally | `false` |

The selected marker for Part 8 remains `DEV08K-AP-20260528T000000`.

## Safe Evidence Plan For Part 8

If Part 8 becomes runnable, evidence must include only:

- new outbox safe prefix.
- selected generated document safe prefix.
- AP source type and source number.
- synthetic recipient classification, not customer/vendor contact data.
- delivery status and provider string.
- provider event count before/after.
- attachment metadata: filename, MIME type, byte count, and hash prefix.
- generated-document count/source status unchanged.
- no provider-call proof.
- temporary script cleanup proof if any temporary script is used.

Evidence must not include PDF body, document body, base64, attachment body, email body, request/response body, customer/vendor data, source contact email, auth headers, cookies, tokens, SMTP values, provider payloads, signed XML, QR payloads, private keys, or CSIDs.

## Part 8 Execution Gate

Part 8 approval has already been received exactly, but the runtime mutation is currently blocked by local schema state:

- The migration file `20260528100000_add_ap_generated_document_email_metadata` exists in the repo.
- The migration is not applied to the local database.
- Current DEV-08K prompts explicitly forbid migrations.
- The Part 5 service writes the new `EmailOutbox` generated-document/source/attachment metadata columns, so the approved Part 8 runtime row creation should not be attempted until an explicitly allowed local schema path exists.

## Required Part 8 Approval Phrase

Status: received exactly in the upfront DEV-08K approval bundle.

`I approve DEV-08K Part 8 local-only AP generated-document email outbox fixture mutation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Commands Run

- `git status --short --branch`
- `git log -1 --oneline`
- Read-only local Prisma metadata/count query through `node -e`.
- Targeted `Select-String` reads for provider env flags only.

## Commands Skipped

- Calling the AP email endpoint against local API/runtime.
- Creating outbox rows.
- Applying migrations or Prisma db push.
- Fixture mutation, seed/reset/delete, provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, PDF generation/download, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 8: approved local AP generated-document email outbox fixture mutation`
