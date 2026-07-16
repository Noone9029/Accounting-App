# SME-DOCUMENT-DELIVERY-01 Sprint Closure

Date: 2026-07-16

## Scope and source state

- Approved specification: `E:\OpenClaw\agents\main\agent\codex-home\attachments\6caf7f59-43af-4868-b072-daaf7e638b7c\pasted-text-1.txt`.
- Base: `origin/main` at `2cff1238`.
- Branch: `codex/sme-document-delivery-01`.
- Worktree: `E:\Worktrees\Accounting-App\sme-document-delivery-01`.
- Final local SHA before publish: `16270ab1` (`fix: harden invoice delivery review findings`).
- Draft PR: `https://github.com/Noone9029/Accounting-App/pull/376` (open, draft, base `main`, not merged).
- Protected root checkout `E:\Accounting App` and its unrelated dirty `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` were not modified.

## Implemented behavior

Permitted users can queue a finalized sales-invoice PDF for asynchronous email delivery. The implementation adds `salesInvoices.send`, tenant-scoped `EmailOutbox` persistence, migration `20260716090000_add_sales_invoice_email_delivery`, optional provider attachments, bounded request validation, safe status/history mapping, and a finalized-invoice detail-panel send/history experience.

`POST /sales-invoices/:id/email-deliveries` resolves the customer address or a bounded override, archives one PDF snapshot, and creates one `QUEUED` outbox row without calling a provider. `GET /sales-invoices/:id/email-deliveries` returns newest-first masked/safe metadata only. The worker verifies the archived document's tenant/source, PDF MIME type, configured size, byte length, and SHA-256 hash before sending the exact bytes through the configured provider.

The UI only exposes sending for `FINALIZED` invoices and users with `salesInvoices.send`. It generates one bounded idempotency key per send attempt, preserves it across a failed HTTP retry, prevents duplicate submission while pending, and says “Invoice queued for email delivery.” It does not claim that an email was delivered.

## Invariants and security boundary

- Idempotency identity is `(organizationId, idempotencyKeyHash)`, backed by a unique database constraint. Same-request replay returns the existing delivery; a different request with the same key conflicts.
- The raw idempotency key, PDF bytes, message body, provider payload, credentials, and secrets are not persisted in delivery history or audit metadata.
- Every invoice, suppression, generated document, outbox, claim, history, and audit operation is tenant-scoped.
- A worker sends only after a conditional `updateMany` claim returns `count === 1`; claim tokens prevent stale workers from updating a reclaimed row. Recent locks are skipped and stale locks use the configured 900000 ms timeout.
- Suppression is checked before queueing and again immediately before worker/provider work. All terminal and retry paths release the matching lock, even when audit persistence fails.
- Sales-invoice rows must have a generated document and matching `salesInvoiceId`/source ID before provider contact; untrusted provider failure text is reduced to a generic safe diagnostic.

## Verification evidence

Passed focused evidence:

- Baseline API email/invoice suites: 4 suites, 89 tests.
- Persistence/permission/schema, provider/template/status/DTO, queue/controller, worker, and compatibility suites: focused tests passed; the worker-focused suite was 6 tests and the broader email/generated-document compatibility run was 55 tests.
- Mock-only lifecycle integration: 1 test passed; queue provider calls `0`, worker verified-PDF provider calls `1`, replay added rows `0` and provider calls `0`, and PDF generation ran once.
- Invoice delivery panel: 3 tests passed; invoice-detail route suite: 12 tests passed.
- API and web typechecks passed; API build passed; Prisma client generation and schema validation passed; `git diff --check` passed.
- Post-review focused suites passed: API worker/document-history suites 15 tests, invoice delivery panel 4 tests; API and web typechecks passed after the review-fix milestone.
- Full repository test gate: API 265 suites passed with 2,579 passing and 36 skipped tests; web 190 suites passed with 868 passing tests. Full lint, build, `verify:diff`, and `verify:ci:local` passed; the local CI mirror also passed credential-environment (5 tests) and user-testing cleanup (6 tests) guards.

The guarded local PostgreSQL concurrency test was subsequently executed against the repository's local Docker PostgreSQL service at `postgresql://localhost:5432/accounting` and passed: 1 test, one provider send, one claim winner, and one final state update. The temporary outbox row was removed by test teardown. This is local database-backed evidence only; it is not hosted, production, or provider-delivery proof.

## Review findings and resolutions

The final review was performed in-line against base `2cff1238` without subagents, hosted systems, or external providers. Findings resolved during implementation:

- Idempotent replay originally risked regenerating the PDF before the existing row was found; the public replay lookup now runs before PDF generation, and the lifecycle test proves one archive.
- The queue boundary was kept provider-free; the lifecycle test proves the POST path makes zero provider calls.
- History and audit mapping were checked for raw body, PDF, key, credential, and provider-payload leakage; only masked/safe metadata is returned.
- Review fixes closed five verified Important findings: audit failures no longer strand worker claims; malformed or mismatched invoice attachment sources cannot reach a provider; provider failure text is generic; history exposes requested/retry/bounce/complaint/suppression metadata; and delayed submit refreshes cannot repopulate a changed organization/invoice context.
- The initial database race attempt found the Docker engine stopped; after starting the local engine and using the already-present local PostgreSQL image, the race proof passed. No hosted system or external provider was used.

## Explicit non-scope and remaining gates

No real email, SMTP credential, hosted system/database mutation, deployment, production/customer data, or production credential was used. No ZATCA, UAE FTA, Peppol, accounting, payment, reminder, WhatsApp, bulk-send, or other document-family behavior was changed.

Remaining work includes provider-specific webhook verification, a real scheduler/worker hosting path, sender-domain evidence, monitoring/alerting, production readiness gates, and any future reminders, WhatsApp delivery, bulk sending, or additional document types.
