# SME-DOCUMENT-DELIVERY-03 sprint closure

Audit date: 2026-07-17

## Scope and source contract

| Source | Queue route | History route | Eligibility | Send / view permission |
| --- | --- | --- | --- | --- |
| Purchase order | `POST /purchase-orders/:id/email-deliveries` | `GET /purchase-orders/:id/email-deliveries` | `APPROVED` or `SENT` | `purchaseOrders.send` / `purchaseOrders.view` |
| Purchase debit note | `POST /purchase-debit-notes/:id/email-deliveries` | `GET /purchase-debit-notes/:id/email-deliveries` | `FINALIZED` | `purchaseDebitNotes.send` / `purchaseDebitNotes.view` |
| Supplier-payment remittance | `POST /supplier-payments/:id/email-deliveries` | `GET /supplier-payments/:id/email-deliveries` | `POSTED` | `supplierPayments.send` / `supplierPayments.view` |
| Supplier statement | `POST /contacts/:id/supplier-statement-email-deliveries` | `GET /contacts/:id/supplier-statement-email-deliveries` | `SUPPLIER` or `BOTH` contact | `contacts.sendSupplierStatements` / `contacts.view` |

All routes are tenant-scoped. Queueing archives generated-document metadata, writes an immediate `QUEUED` outbox row, and returns without SMTP/provider execution. The explicit retry worker remains the only provider boundary. The UI uses shared source-neutral send/history behavior with customer-named compatibility exports retained for existing consumers.

## Persistence, identity, and safety

- Added additive Prisma `EmailTemplateType` values: `PURCHASE_ORDER`, `PURCHASE_DEBIT_NOTE`, `SUPPLIER_PAYMENT_REMITTANCE`, and `SUPPLIER_STATEMENT`.
- Migration: `apps/api/prisma/migrations/20260717100000_add_supplier_document_email_templates/migration.sql`; additive `ALTER TYPE ... ADD VALUE IF NOT EXISTS` only.
- Supplier DTOs bound recipient, subject, message, and idempotency-key length/format; subjects reject line breaks. Supplier statement dates require exact real `YYYY-MM-DD`, normalize omitted `to` to `asOf`, and reject conflicting periods.
- Organization-scoped request hashes include normalized source number, document/template identity, recipient, subject, body, and bounded source context. Supplier statement identity reuses the existing FX-aware snapshot identity and stores only bounded `from`, `to`, and `asOf` metadata.
- Source orchestrators do not call `markSent`, post/reverse/allocate accounting entries, alter lifecycle status, or store PDF bytes/raw idempotency keys/provider payloads in outbox history.

## Evidence

All local commands were run sequentially with at most three Jest workers and `NODE_OPTIONS=--max-old-space-size=4096`:

- Supplier lifecycle/worker regression: 2 suites, 18 tests passed.
- Shared supplier statement UI: 2 suites, 7 tests passed.
- Full API Jest: 278 suites passed, 1 intentional skip; 2,665 passed tests and 36 skipped.
- Full web Jest: 191 suites, 872 tests passed.
- UAE PINT-AE package: 44 tests passed; ZATCA core package: 31 tests passed.
- All workspace TypeScript lint/typecheck equivalents passed; package, API, and web builds passed. Web generated 149 static pages.
- Prisma generation passed using `apps/api/prisma/schema.prisma`; Prisma validation passed with explicit local placeholder `DATABASE_URL`/`DIRECT_URL` values.
- `verify:diff` passed. Credential-environment safety passed 5/5; user-testing cleanup-plan safety passed 6/6.
- The literal `verify:ci:local` wrapper stopped at `corepack pnpm db:generate` because the managed sandbox denied Corepack's global cache. Its generation, typecheck, test, build, and safety steps were executed through direct local equivalents; no hosted environment was loaded.

## Mandatory PostgreSQL race gate

The guarded fixture is `apps/api/src/email/email-retry-worker.local-db.integration.spec.ts`. It creates a marker-named disposable organization, supplier contact, `SupplierStatement`, archived PDF metadata, two worker instances, atomic claim instrumentation, attachment verification, and teardown assertions.

The required real PostgreSQL two-worker proof is **not complete**. Docker's local engine was unavailable, TCP `127.0.0.1:5432` was closed, and Windows service `postgresql-x64-17` was stopped. Running the guarded spec with the explicit local placeholder failed at Prisma `$connect()` before fixture setup. Therefore no claim-winner/provider-send/attachment/final-update/cleanup counts are claimed; no race-pass or cleanup proof exists. The fixture must be rerun and pass after disposable local PostgreSQL is available. A skipped or connection-failed run cannot close this gate.

## Review, branch, and remaining gates

The complete scoped diff was reviewed for credentials, SMTP secrets, authorization headers/cookies, provider payloads, real addresses, PDF/base64 bytes, raw idempotency keys, misleading `Delivered` wording, accidental `markSent`, accounting mutations, and compliance changes. No Critical or Important finding was verified.

- Approved baseline: `3f5c31bc0ad96b3af2deba1348f55b7cead84888`.
- Branch: `codex/sme-document-delivery-03`.
- The implementation and documentation tip at the initial PR publication was `ac0a4d08257b98a5dee5e32a979cbc726934430d`.
- Draft PR: [#378](https://github.com/Noone9029/Accounting-App/pull/378), `SME-DOCUMENT-DELIVERY-03: Extend email delivery to supplier documents`.
- The branch was subsequently updated with documentation-only closure metadata; the final remote SHA is captured in the task handoff.
- No merge, deployment, hosted migration/proof, real SMTP/provider call, production credential/data access, mailbox access, accounting mutation, ZATCA, UAE FTA, or Peppol behavior was performed.

The remaining gate is the real local PostgreSQL race proof and its cleanup/stop evidence. Production provider rollout, hosted proof, deployment, and merge remain out of scope.
