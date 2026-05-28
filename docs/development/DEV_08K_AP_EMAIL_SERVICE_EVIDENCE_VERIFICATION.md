# DEV-08K AP Email Service Evidence Verification

## Purpose And Scope

- Task: `DEV-08K Part 6: AP generated-document email service evidence verification`.
- Latest commit inspected: `193e7d46 Implement DEV-08K AP email service`.
- Verification mode: read-only/code-level plus sanitized local counts.
- Runtime data mutation performed: no.
- Email outbox rows created: no.
- Provider calls performed: no.
- Temporary scripts created: no.

This verification did not call the AP email endpoint, enqueue runtime email, send real email, call SMTP/provider code, run workers, generate/download PDFs, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Code-Level Verification

API route/service:

- `POST /email/ap-generated-documents/:generatedDocumentId/outbox` exists in `apps/api/src/email/email.controller.ts`.
- The controller uses the static `emailOutbox.view` gate and passes membership role permissions into the service.
- `EmailService.createApGeneratedDocumentOutbox` exists in `apps/api/src/email/email.service.ts`.

Permission rules:

- The AP service enforces service-level AND semantics for:
  - `emailOutbox.view`
  - `generatedDocuments.download`
  - the matching AP source view permission.
- Missing permission coverage is tested by the targeted email service suite.

Provider/no-send behavior:

- The AP path creates a metadata-only `EmailOutbox` row with `status: SENT_MOCK` and provider `mock-no-send`.
- The AP path does not call `this.provider.send(...)`.
- Existing `provider.send(...)` calls remain in non-AP email/retry/test-email paths only.

Attachment/body exposure:

- The AP generated-document select contains metadata only: id, organization, document/source ids, number, filename, mime type, content hash, size, and status.
- The AP response marks `noBodyReturned`, `noPdfBodyReturned`, `noAttachmentBodyReturned`, and `noProviderPayload`.
- The AP response helper excludes `bodyText` and `bodyHtml`.
- No PDF body, base64, attachment body, request/response body, token, cookie, auth header, signed XML, QR payload, private key, CSID, or email body was printed.

## Test Coverage Verified

Targeted tests cover:

- successful AP generated-document outbox creation against mocked Prisma with no provider call.
- missing `generatedDocuments.download` is rejected before outbox creation.
- unsupported generated-document source/document pairs are rejected.
- missing AP recipient is rejected.
- controller static gate for the AP endpoint requires `emailOutbox.view`.
- AP response excludes `bodyText` and `bodyHtml`.

Command result:

| Command | Result |
| --- | --- |
| `corepack pnpm --filter @ledgerbyte/api test -- email.service.spec.ts email.controller.spec.ts --runInBand` | Passed: 2 suites, 37 tests |

## Sanitized Local Side-Effect Snapshot

Read-only local count check:

| Check | Result |
| --- | ---: |
| DEV-08K marker email rows | `0` |
| Email provider events | `0` |
| Generated documents | `870` |
| AP email migration applied locally | `false` |

The unapplied local migration state is expected from the prior schema-design evidence. No migration was applied during this verification.

## Temporary Script Check

- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'` returned no files.
- `git ls-files 'apps/api/scripts/*dev08k*'` returned no tracked files.

## Commands Skipped

- Calling the AP email endpoint against local API/runtime.
- Creating outbox rows.
- Applying migrations or Prisma db push.
- Fixture mutation, seed/reset/delete, provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, PDF generation/download, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 7: AP email outbox fixture preflight`
