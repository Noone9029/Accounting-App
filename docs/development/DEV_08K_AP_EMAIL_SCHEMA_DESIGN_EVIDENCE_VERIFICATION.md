# DEV-08K AP Email Schema Design Evidence Verification

## Purpose And Scope

- Task: `DEV-08K Part 3: AP email schema design evidence verification`.
- Latest commit inspected: `66d11809 Add DEV-08K AP email schema design`.
- Runtime mutation performed: no.
- Email outbox mutation performed: no.
- Provider call performed: no.
- Migration applied to a database: no.

This part was a read-only verification of Part 2 schema/type evidence. It did not enqueue email, send email, call a provider, generate/download PDFs, run migrations, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Verification Result

- Part 2 schema/type changes match the Part 1 design decision.
- `EmailTemplateType.AP_GENERATED_DOCUMENT` exists in the Prisma schema and web type union.
- `EmailOutbox` now has nullable generated-document, source, and attachment metadata fields in the Prisma schema.
- The migration file exists, but the local database has not applied `20260528100000_add_ap_generated_document_email_metadata`.
- API AP email DTO/source metadata type files exist.
- Web email label/type support exists.
- No AP email service/controller endpoint exists yet.
- No temporary `*dev08k*` scripts remain under `apps/api/scripts`.

## Read-Only Local Snapshot

Read-only local Prisma metadata snapshot:

| Check | Result |
| --- | ---: |
| Email outbox rows | `227` |
| DEV-08K marker email rows | `0` |
| Email provider events | `0` |
| Generated documents | `870` |
| AP email migration applied locally | `false` |
| `apps/api/scripts/*dev08k*` files | `0` |

The count snapshot did not inspect or print email bodies, PDF bodies, `contentBase64`, attachment bodies, request/response bodies, tokens, cookies, auth headers, database URLs, signed XML, or QR payloads.

## Side-Effect Result

- No `EmailOutbox` rows were created by DEV-08K Part 2 or Part 3.
- No `EmailProviderEvent` rows were created.
- No generated documents were created or changed by Part 3.
- No provider `send(...)`, SMTP, retry worker, diagnostics send, webhook, or suppression mutation path was called.
- The local API process was stopped only to release the Prisma generated-client DLL lock during Part 2; it was not restarted in Part 3 because no runtime API check was required.

## Verification Commands Run

- `git status --short --branch`
- `git log -1 --oneline`
- `rg` checks for `AP_GENERATED_DOCUMENT`, `generatedDocumentId`, attachment metadata fields, DTO/type files, and web labels.
- `Get-ChildItem apps/api/scripts -Filter '*dev08k*'`
- Read-only Prisma count queries for email outbox rows, DEV-08K marker rows, provider events, generated documents, and migration-applied status.
- `corepack pnpm verify:diff`
- `git diff --check`
- `git diff --cached --check` after staging intended files.

## Commands Skipped

- Prisma migrate/deploy/db push and any database schema application.
- Schema/code behavior changes.
- Email outbox mutation, provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 4: AP generated-document email service preflight`

## Part 4 Follow-Up

- Part 4 service preflight is recorded in [DEV_08K_AP_EMAIL_SERVICE_PREFLIGHT.md](DEV_08K_AP_EMAIL_SERVICE_PREFLIGHT.md).
- The selected API is `POST /email/ap-generated-documents/:generatedDocumentId/outbox`.
- Implementation must enforce `emailOutbox.view`, `generatedDocuments.download`, and matching AP source view permission inside the service because the existing permission guard uses any-permission semantics for static decorator entries.
- Exact next prompt title: `DEV-08K Part 5: approved local AP generated-document email service implementation`.
