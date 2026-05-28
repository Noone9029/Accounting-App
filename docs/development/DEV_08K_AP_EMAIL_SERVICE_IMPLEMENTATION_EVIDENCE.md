# DEV-08K AP Email Service Implementation Evidence

## Purpose And Scope

- Task: `DEV-08K Part 5: approved local AP generated-document email service implementation`.
- Latest commit inspected: `f365d228 Plan DEV-08K AP email service`.
- Approval phrase status: exact phrase received up front and checked before implementation.
- Marker: `DEV08K-AP-20260528T000000`.
- Runtime data mutation performed: no.
- Unit-test-only outbox mutation: mocked only.
- Provider calls performed: no real provider calls; mocked provider verified not called by the AP path.

This part implemented the backend service/controller path and tests only. It did not run the new endpoint against the local database, create runtime outbox rows, send real email, call SMTP/provider code, run retry workers, generate/download PDFs, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Approval Phrase

`I approve DEV-08K Part 5 local-only AP generated-document email service implementation under marker DEV08K-AP-20260528T000000. No production, no beta, no customer data, no real email send.`

## Implementation Summary

Backend API:

- Added `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.
- Static controller gate: `emailOutbox.view`.
- The service enforces the full required permission set with AND semantics:
  - `emailOutbox.view`
  - `generatedDocuments.download`
  - matching AP source view permission.

Service behavior:

- Loads generated-document metadata only.
- Accepts only `GeneratedDocumentStatus.GENERATED`.
- Accepts only the six supported AP generated-document source/document pairs.
- Verifies that the AP source record still exists in the same organization.
- Resolves recipient from explicit DTO input or source supplier/contact email.
- Creates local metadata-only outbox rows with:
  - `templateType`: `AP_GENERATED_DOCUMENT`
  - `status`: `SENT_MOCK`
  - `provider`: `mock-no-send`
  - `attemptCount`: `0`
  - `maxAttempts`: `0`
  - no retry scheduling
  - generated-document/source/attachment metadata fields populated
- Does not call `this.provider.send(...)`.
- Returns a sanitized response without `bodyText`, `bodyHtml`, PDF body, `contentBase64`, attachment body, or provider payload.
- Adds `EMAIL_OUTBOX_CREATED` audit mapping for `EmailOutbox:CREATE`.

## Tests Added

Targeted tests cover:

- valid AP generated document creates local metadata-only outbox data and does not call the provider.
- missing `generatedDocuments.download` is rejected before outbox create.
- unsupported generated-document source/document pairs are rejected.
- missing AP recipient is rejected.
- controller static gate for the AP endpoint requires `emailOutbox.view`.

TDD red result:

- `corepack pnpm --filter @ledgerbyte/api test -- email.service.spec.ts email.controller.spec.ts --runInBand` failed before implementation because `createApGeneratedDocumentOutbox` did not exist.

Green result:

- `corepack pnpm --filter @ledgerbyte/api test -- email.service.spec.ts email.controller.spec.ts --runInBand` passed after implementation.
- `corepack pnpm --filter @ledgerbyte/api typecheck` passed.
- `git diff --check` passed.

## No Provider Or Runtime Side Effects

Read-only local count after implementation tests:

| Check | Result |
| --- | ---: |
| DEV-08K marker email rows | `0` |
| Email provider events | `0` |

No runtime email body, provider payload, PDF body, `contentBase64`, attachment body, request/response body, token, cookie, auth header, database URL, signed XML, QR payload, private key, or CSID was printed.

## Commands Skipped

- Calling the new endpoint against local API/runtime.
- Applying the migration to the local database.
- Prisma migrate/deploy/db push, seed/reset/delete, fixture mutation, provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, PDF generation/download, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 6: AP generated-document email service evidence verification`
