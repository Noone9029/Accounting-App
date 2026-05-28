# DEV-08K AP Email Local Schema Gate Preflight

## Purpose And Scope

- Task: `DEV-08K Part 8A: AP email local schema gate preflight`.
- Latest commit inspected: `f4d8834c Plan DEV-08K AP email outbox fixture`.
- Mode: read-only preflight only.
- Runtime mutation performed: no.
- Migration applied: no.
- Email outbox rows created: no.
- Provider calls performed: no.

This preflight resolves the Part 8 blocker safely by selecting a local-only schema path before any AP email outbox row is created. It did not apply migrations, run Prisma db push, call the AP email endpoint, create outbox rows, send real email, call provider/SMTP code, run retry workers, generate/download PDFs, run ZATCA, seed/reset/delete, deploy, change env vars, or use production, beta, hosted/shared, or customer data.

## Inputs Reviewed

- `CODEX_HANDOFF.md`.
- `docs/development/DEV_08K_AP_EMAIL_OUTBOX_FIXTURE_PREFLIGHT.md`.
- `docs/development/DEV_08K_AP_EMAIL_SERVICE_EVIDENCE_VERIFICATION.md`.
- `docs/development/DEV_08K_AP_EMAIL_SERVICE_IMPLEMENTATION_EVIDENCE.md`.
- `docs/development/DEV_08K_AP_EMAIL_SCHEMA_DESIGN_EVIDENCE_VERIFICATION.md`.
- `docs/development/DEV_08K_AP_GENERATED_DOCUMENT_EMAIL_DESIGN_PREFLIGHT.md`.
- `docs/development/DEV_08J_AP_REPEATED_IDEMPOTENCY_BLOCKER_CLOSURE.md`.
- `docs/development/DEV_08H_AP_OUTPUT_PDF_ARCHIVE_EMAIL_CLOSURE.md`.
- `docs/development/DEV_03_SAFE_FIXTURE_LOGIN_AUDIT_POLICY.md`.
- `docs/development/DEV_02_VERIFICATION_GATE_RUNBOOK.md`.
- `BUG_AUDIT.md`.
- `README.md`.
- `apps/api/prisma/schema.prisma`.
- `apps/api/prisma/migrations/20260528100000_add_ap_generated_document_email_metadata/migration.sql`.
- AP email service/controller and web outbox surfaces as needed.

## Blocker Confirmed

- Part 7 selected generated document safe prefix `27a07429`.
- Part 7 selected synthetic recipient `dev08k-ap-generated-document@example.test`.
- The selected generated document remains `GENERATED`.
- The selected generated document metadata remains:
  - document type `PURCHASE_BILL`.
  - source type `PurchaseBill`.
  - document/source number `BILL-000423`.
  - filename `purchase-bill-BILL-000423.pdf`.
  - MIME type `application/pdf`.
  - size bytes `3417`.
  - content hash prefix `47935bce9f75`.
- The AP service writes the new `EmailOutbox` generated-document, source, and attachment metadata columns.
- The local database has not applied `20260528100000_add_ap_generated_document_email_metadata`.
- The `EmailOutbox` table does not yet expose the seven new metadata columns locally.

## Migration File Inspection

The committed migration file exists at:

- `apps/api/prisma/migrations/20260528100000_add_ap_generated_document_email_metadata/migration.sql`

The migration is additive for existing outbox rows:

- adds `EmailTemplateType.AP_GENERATED_DOCUMENT`.
- adds nullable `EmailOutbox` columns:
  - `generatedDocumentId`
  - `sourceType`
  - `sourceId`
  - `attachmentFilename`
  - `attachmentMimeType`
  - `attachmentSizeBytes`
  - `attachmentContentHash`
- adds indexes for generated-document and source lookup.
- adds a nullable FK from `EmailOutbox.generatedDocumentId` to `GeneratedDocument.id` with `ON DELETE SET NULL`.

No destructive DDL was found in this migration file.

## Local-Only Database Proof

Sanitized target classification from the read-only Prisma check:

| Field | Value |
| --- | --- |
| Protocol | `postgresql` |
| Host | `localhost` |
| Port | `5432` |
| Database | `accounting` |
| Schema | `public` |
| Local-only classification | `true` |

No database URL, credential, token, cookie, auth header, request/response body, email body, attachment body, PDF body, base64, signed XML, QR payload, private key, CSID, SMTP payload, provider payload, customer/vendor data, or source contact email was printed.

## Read-Only Local Snapshot

| Check | Result |
| --- | ---: |
| AP email migration applied locally | `false` |
| AP email migration rows in `_prisma_migrations` | `0` |
| Present new `EmailOutbox` metadata columns | `0` |
| Email outbox rows | `227` |
| Selected synthetic recipient rows | `0` |
| AP generated-document email rows | `0` |
| Email provider events | `0` |
| Generated documents | `870` |

## Schema Path Decision

Selected path: Option A.

Reason:

- The target is a local-only disposable LedgerByte database: `localhost:5432/accounting`.
- The exact migration already exists in the repository and is committed.
- The migration is required before the already implemented AP email service can create the Part 8 metadata-only outbox row.
- Option B is unnecessary because the current target is already the approved disposable local DB.
- Option C would block runtime evidence even though an explicitly approved, repo-committed, local-only migration path is available.

Part 8B must apply only the existing migration `20260528100000_add_ap_generated_document_email_metadata` to the local database. It must not run db push, seed/reset/delete, alter unrelated schema, create outbox rows, call the AP endpoint, send real email, call providers, or expose bodies/secrets.

## Required Part 8B Approval Phrase

Status: received exactly from the user before this preflight was executed.

`I approve DEV-08K Part 8B local-only AP email migration application under marker DEV08K-AP-20260528T000000. Local database only, no production, no beta, no customer data.`

## Commands Run

- `git fetch origin`
- `git status --short --branch`
- `git log --oneline -8 --decorate`
- `git log --oneline -3 --decorate --all`
- `git remote -v`
- `rg` inspections for AP email schema/service/outbox metadata.
- Targeted reads of the required DEV-08K/DEV-08J/DEV-08H/DEV-03/DEV-02, `BUG_AUDIT.md`, and `README.md` context.
- Read-only sanitized inline Prisma check for target classification, migration status, local outbox/provider/generated-document counts, and selected generated-document metadata.

## Commands Skipped

- Applying migrations.
- Prisma db push.
- Calling the AP email endpoint.
- Creating outbox rows.
- Provider calls, real email, retry workers, webhooks, diagnostics sends, SMTP, PDF generation/download, body/base64 reads, attachment body reads, seed/reset/delete, deploys, env/provider setting changes, backup/restore, full tests, full build, E2E, smoke, production-hosting research, real ZATCA, CSID, clearance/reporting, signing, and PDF-A3.

## Exact Next Prompt Title

`DEV-08K Part 8B: approved local AP email migration application`

## Part 8B Follow-Up

- Part 8B evidence is recorded in [DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_MUTATION_EVIDENCE.md](DEV_08K_AP_EMAIL_LOCAL_SCHEMA_GATE_MUTATION_EVIDENCE.md).
- The exact Part 8B approval phrase was received and checked before mutation.
- Only `20260528100000_add_ap_generated_document_email_metadata` was applied to the disposable local database.
- `prisma migrate deploy` was skipped because one unrelated migration was also pending and outside the DEV-08K approval scope.
- The AP email enum value and seven `EmailOutbox` metadata columns are present locally.
- Email outbox rows remained `227`, selected synthetic recipient rows remained `0`, AP generated-document email rows remained `0`, provider events remained `0`, and generated documents remained `870`.
- Exact next prompt title: `DEV-08K Part 8C: AP email local schema gate evidence verification`.
