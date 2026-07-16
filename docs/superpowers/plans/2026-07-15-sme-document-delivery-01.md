# SME Document Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a permitted user queue a finalized sales-invoice PDF for email delivery, preserve the exact archived PDF through the existing outbox and retry worker, and expose truthful invoice-level history without sending email synchronously.

**Architecture:** Keep invoice eligibility, recipient resolution, default subject/body, and PDF preparation in a focused `SalesInvoiceEmailDeliveryService` owned by the sales-invoice module. Keep idempotency, outbox creation, attachment metadata/content verification, safe response mapping, status labels, suppression checks, and history mapping in a generic `DocumentDeliveryService` owned by the email module. The existing `EmailService` remains the compatibility facade for existing email endpoints and delegates retry execution to a focused worker service so invitation, reset, diagnostics, suppression, webhook, and existing outbox behavior remain compatible.

**Tech Stack:** NestJS 11, Prisma 6/PostgreSQL, Jest 30, React 19/Next 16, existing LedgerByte UI primitives, `@ledgerbyte/pdf-core`, Nodemailer, and the repository's mock email provider.

## Global Constraints

- Base checkout: updated `origin/main` at `2cff1238` (recorded 2026-07-16); implementation branch: `codex/sme-document-delivery-01`.
- Worktree: `E:\Worktrees\Accounting-App\sme-document-delivery-01`; protected root modification `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` remains untouched.
- The approved pasted specification is authoritative; no product redesign or unrelated refactoring.
- No real email, real SMTP credentials, real provider, hosted system, hosted database, deployment, production/customer data, or production credentials.
- Local and automated delivery tests use `MockEmailProvider` or a fully stubbed Nodemailer transport with zero external network activity.
- Do not change ZATCA, UAE FTA, Peppol, WhatsApp, payment collection, reminders, bulk sending, or other document families.
- `POST /sales-invoices/:id/email-deliveries` only queues; it never calls an email provider.
- Store only an archived generated-document reference and safe attachment metadata in `EmailOutbox`; never duplicate PDF bytes or the raw idempotency key.
- Status copy distinguishes queued, mock-simulated, provider-accepted, retrying failure, terminal failure, suppression, bounce, complaint, and verified delivery.
- Every new production method gets a test written and observed failing before implementation; focused tests run after each task and each independently testable milestone is committed.

## Current-State Baseline

- `EmailOutbox` already stores tenant scope, template, body, retry metadata, provider-event fields, suppression-compatible fields, generated-document reference, and attachment metadata.
- `GeneratedDocumentService.archivePdf()` and `SalesInvoiceService.pdf()` already render and archive database-backed invoice PDFs; the invoice PDF route is also available but must not be reused for worker attachment reads because that would create misleading download audit events.
- `EmailService.retryProcess()` currently selects due rows and writes a lock without a conditional claim; this is the concurrency gap to replace with an atomic database claim.
- `EmailProvider` has mock and SMTP implementations but no attachment contract; existing messages must remain valid without attachments.
- `salesInvoices.send` is absent from shared permissions and role defaults; frontend page permissions currently gate the invoice route only with `salesInvoices.view`.
- The invoice detail page already has loading/error and organization-transition cancellation patterns and uses `LedgerActionDialog`, `LedgerButton`, `LedgerStatusBadge`, `LedgerLoadingState`, and `LedgerEmptyState`.
- Baseline verification from the clean worktree: frozen install passed; Prisma client generation passed; API email/invoice targeted suites passed with 4 suites and 89 tests; invoice-detail web pattern suites passed with 6 suites and 20 tests.

## Transaction and Concurrency Invariants

These invariants must be implemented and documented before atomic worker claiming or idempotency code is written.

1. **Queue idempotency invariant:** The identity of a request is `(organizationId, idempotencyKeyHash)`. A unique database constraint prevents two concurrent requests in one organization from creating two rows for the same key. The request hash is computed from the normalized invoice ID, recipient, subject, and message. If the key exists with the same request hash, return the existing row with `idempotentReplay: true`; if the hash differs, return HTTP 409 and do not create or mutate an outbox row.
2. **No raw-key invariant:** Only a cryptographic hash of the bounded key is persisted or audited. The raw key never appears in an outbox row, audit metadata, API response, log, fixture, or error text.
3. **Queue transaction invariant:** Invoice eligibility, recipient/suppression/provider checks, PDF archive creation, and the idempotency-aware outbox insert are one logical queue operation. If the outbox insert cannot commit, the request must not report queued. If PDF archiving has already committed because the existing renderer/archive service cannot share the same transaction, the orphaned generated document is metadata-only and no delivery row is reported; the implementation must not send or expose its bytes.
4. **Tenant invariant:** Every invoice, generated document, suppression, idempotency lookup, outbox write, worker claim, attachment read, history read, and audit event is scoped by `organizationId`. A cross-tenant ID is indistinguishable from not found to the caller.
5. **Worker claim invariant:** A worker can call the provider only after a conditional database update succeeds for that row. The predicate includes organization, eligible status (`QUEUED`/`FAILED`), due time, max-attempt boundary, no bounce/complaint, and either no lock or a lock older than the configured stale-lock timeout. The update sets `retryLockedAt` and a unique `retryLockedBy`; `count === 1` is the sole permission to send. `count === 0` means another worker owns it or it is no longer eligible, so the worker skips it.
6. **Lock-release invariant:** Every claimed row clears `retryLockedAt` and `retryLockedBy` in success, retryable failure, terminal failure, suppression block, attachment-verification failure, and provider-throw paths. A recent lock is never silently reclaimed. A stale lock is reclaimable only after the configured timeout and the stale-lock path is covered by a local database-backed test.
7. **Send-once boundary:** The provider call occurs outside the short claim/update transaction, but no second worker can claim the same row while the first claim is recent. A provider result is recorded only by the worker holding the matching claim token; a stale worker cannot overwrite a newer claim's result.
8. **Attachment invariant:** The worker loads the generated document through a tenant-scoped internal read, verifies source organization and `SalesInvoice` source ID, `application/pdf`, configured positive size limit, stored byte length, and SHA-256 content hash before provider contact. Any mismatch is a safe failure/block with no provider call.
9. **Suppression invariant:** Queueing checks active suppression before creating a queued result; every worker attempt checks again immediately before attachment loading/provider contact. A newly suppressed address becomes a terminal suppression-blocked outbox state with no future retry.

## File Map

Create or modify only the files justified by the tasks below. Exact generated Prisma client output is not committed.

- Shared contract: `packages/shared/src/permissions.ts` and permission tests.
- Persistence: `apps/api/prisma/schema.prisma`, one additive migration under `apps/api/prisma/migrations/`, and schema contract tests.
- Generic email delivery: `apps/api/src/email/document-delivery.service.ts`, `apps/api/src/email/email-delivery-status.ts`, `apps/api/src/email/email-provider.ts`, `apps/api/src/email/mock-email.provider.ts`, `apps/api/src/email/smtp-email.provider.ts`, `apps/api/src/email/email-templates.ts`, `apps/api/src/email/email.module.ts`, and focused specs.
- Invoice orchestration: `apps/api/src/sales-invoices/sales-invoice-email-delivery.service.ts`, request DTO, response/history types, `sales-invoice.controller.ts`, `sales-invoice.module.ts`, and focused specs.
- Retry worker: `apps/api/src/email/email-retry-worker.service.ts`, compatibility delegation in `email.service.ts`, worker specs, and a local PostgreSQL integration spec guarded by the repository's local test-database conventions.
- Frontend API/types/UI: `apps/web/src/lib/types.ts`, `apps/web/src/lib/email-deliveries.ts`, `apps/web/src/components/sales-invoices/invoice-email-delivery-panel.tsx`, invoice detail page and tests.
- Truth-bearing docs: `docs/IMPLEMENTATION_STATUS.md`, `docs/API_CATALOG.md`, `docs/FRONTEND_ROUTE_CATALOG.md`, `docs/email/EMAIL_DELIVERY_ARCHITECTURE.md`, `docs/email/SMTP_PROVIDER_SETUP.md` only where directly affected, and `docs/development/SME_DOCUMENT_DELIVERY_01_SPRINT_CLOSURE.md`.
- Do not edit compliance files or unrelated audit/roadmap documentation.

---

### Task 1: Permission and persistence foundation

**Files:**
- Modify: `packages/shared/src/permissions.ts`, `apps/web/src/lib/permissions.test.ts`, `apps/api/src/auth/guards/permission.guard.spec.ts` or the established shared permission regression spec.
- Modify: `apps/api/prisma/schema.prisma`.
- Create: `apps/api/prisma/migrations/20260716090000_add_sales_invoice_email_delivery/migration.sql`.
- Test: `apps/api/src/email/document-delivery-persistence.spec.ts`.

**Interfaces:**
- Add `PERMISSIONS.salesInvoices.send = "salesInvoices.send"`.
- Include it in full-access/system defaults exactly where the established role-default policy includes other sales-invoice actions; do not broaden custom roles silently.
- Add `EmailOutbox` fields sufficient for source invoice history and idempotency: `salesInvoiceId`, `requestedById`, `idempotencyKeyHash`, `requestHash`, `idempotencyOrganizationId` only if required by the final Prisma relation shape, `requestedAt`, `userFacingStatus` only if centralized mapping cannot be derived, and safe lock/attachment fields required by later tasks. Prefer existing fields and avoid duplicate state.
- Add a unique constraint on `(organizationId, idempotencyKeyHash)` for non-null values using the repository's PostgreSQL-compatible additive migration pattern. If Prisma cannot express a partial unique index, use a nullable hash plus a generated-safe unique strategy that preserves existing null rows and document the exact SQL.
- Add indexes for `(organizationId, salesInvoiceId, createdAt)`, due worker selection, and idempotency lookup.

- [x] Write failing permission and schema contract tests: the new permission is normalized, full-access includes it, missing permission is denied, the unique idempotency index exists, and raw PDF/body fields are not introduced to the new delivery relation.
- [x] Run the focused tests and observe failure because the permission/schema fields are absent.
- [x] Add the minimum permission/default/schema/migration changes.
- [x] Run `corepack pnpm --filter @ledgerbyte/api db:generate`, Prisma validation, and the focused tests.
- [x] Commit: `feat: add invoice delivery permission and persistence` (`a08e38eb`).

**Checkpoint:** Commit `a08e38eb` added `salesInvoices.send`, assigned it to Owner/Admin/Accountant/Sales defaults without broadening Viewer/Purchases, and added the additive migration `20260716090000_add_sales_invoice_email_delivery`. The plan's idempotency and tenant invariants are now represented by the `(organizationId, idempotencyKeyHash)` unique constraint and tenant/source/requester fields; no PDF bytes or body copies were added.

### Task 2: Provider attachments, templates, validation, and safe status mapping

**Files:**
- Modify: `apps/api/src/email/email-provider.ts`, `apps/api/src/email/mock-email.provider.ts`, `apps/api/src/email/smtp-email.provider.ts`, `apps/api/src/email/email-templates.ts`, `apps/api/src/email/email-redaction.ts`, `.env.example`.
- Create: `apps/api/src/email/email-delivery-status.ts`, `apps/api/src/email/dto/create-sales-invoice-email-delivery.dto.ts` if the DTO is not owned by the sales module, and focused specs.
- Test: `apps/api/src/email/email-provider-attachments.spec.ts`, `apps/api/src/email/email-template-sales-invoice.spec.ts`, `apps/api/src/email/email-delivery-status.spec.ts`, `apps/api/src/email/email-dto-validation.spec.ts`.

**Interfaces:**
- Extend `EmailMessage` with optional `attachments?: EmailAttachment[]`, where attachment fields are `filename`, `mimeType`, `content: Buffer`, and `contentHash`.
- Map SMTP attachments to Nodemailer `{ filename, content: Buffer, contentType: mimeType }`; do not log body, attachment bytes, or provider payload.
- Keep existing messages without attachments unchanged.
- Mock `send()` remains zero-network and records only safe attachment metadata for assertions.
- Add `buildSalesInvoiceDeliveryEmail()` with the approved plain-text and escaped HTML defaults. User message overrides the body text while the invoice details remain excluded from arbitrary metadata claims.
- Centralize `salesInvoiceDeliveryStatusLabel(status, providerEventStatus, nextAttemptAt, suppressionStatus)` so API and web use the same truth language; never call SMTP acceptance “Delivered.”
- Normalize email, reject invalid/empty recipient, reject CR/LF subject, cap subject at 200 and message at 5,000, require a 16–128 character bounded idempotency key, and hash it with SHA-256 before persistence.
- Add positive-integer attachment-size config with default `10485760`; invalid production-like configuration fails closed.

- [x] Write the failing provider, template, status, and DTO tests, including HTML escaping and no-sensitive-output assertions.
- [x] Run each focused suite and observe the intended failures.
- [x] Implement the minimum provider/template/validation/status/config changes.
- [x] Run focused API tests, typecheck, and existing email/provider suites.
- [x] Commit: `feat: support email document attachments` (`50ca93b6`).

**Checkpoint:** Commit `50ca93b6` added optional provider attachments, Nodemailer mapping, escaped sales-invoice defaults, bounded DTO validation, centralized truthful status labels, and local attachment-size/lock config defaults. Focused provider tests use a stubbed transport and the mock provider; no external network call was made.

### Task 3: Generic document-delivery service and sales-invoice queue API

**Files:**
- Create: `apps/api/src/email/document-delivery.service.ts` and its spec.
- Create: `apps/api/src/sales-invoices/sales-invoice-email-delivery.service.ts`, DTO/response types, and specs.
- Modify: `apps/api/src/email/email.module.ts`, `apps/api/src/sales-invoices/sales-invoice.module.ts`, `apps/api/src/sales-invoices/sales-invoice.controller.ts`, `apps/api/src/audit-log/audit-events.ts`.

**Interfaces:**
- `DocumentDeliveryService.queue(input: QueueDocumentDeliveryInput): Promise<DocumentDeliveryQueueResult>` performs normalized idempotency lookup, active suppression check, safe provider readiness check, generated-document metadata validation, durable outbox creation, and safe response mapping. It must not know invoice accounting rules.
- `DocumentDeliveryService.listHistory(organizationId, sourceType, sourceId)` returns newest-first safe history with masked recipient, requested-by display data, status label, retry/bounce/complaint/suppression fields, attachment metadata, and generated-document ID; it never returns bodies, bytes, provider payloads, secrets, or raw key hashes.
- `DocumentDeliveryService.readAttachmentForWorker(organizationId, outboxId)` tenant-checks the outbox and generated document, reads content via a non-auditing internal generated-document method, verifies source, MIME, configured size, byte length, and hash, and returns an `EmailAttachment` only on success.
- `SalesInvoiceEmailDeliveryService.queue(organizationId, actorUserId, invoiceId, dto, requestId)` validates tenant and exact `FINALIZED` status, resolves customer/override recipient, checks suppression/provider usability, calls `SalesInvoiceService.pdf()` to archive one immutable PDF snapshot, and delegates to `DocumentDeliveryService.queue()` with `EmailTemplateType.SALES_INVOICE`, `sourceType: "SalesInvoice"`, and `salesInvoiceId`.
- `SalesInvoiceEmailDeliveryService.history(organizationId, invoiceId)` verifies invoice tenant scope and delegates history.
- Add `POST /sales-invoices/:id/email-deliveries` with `salesInvoices.send` and `GET /sales-invoices/:id/email-deliveries` with `salesInvoices.view`.
- Add explicit safe audit events for queued, replayed, blocked, attempted, provider-accepted, and failed delivery. Audit metadata is masked/hashed presence only.

- [x] Write failing service/controller tests for finalized-only eligibility, tenant and permission guards, recipient/defaults/overrides, validation, PDF archive reference, no PDF duplication, provider readiness, suppression blocking, idempotent replay/conflict, safe audit metadata, and the exact POST zero-provider-call boundary.
- [x] Run the tests and observe failure before implementing production services.
- [x] Implement the queue path with the idempotency unique constraint as the concurrency backstop; catch only the expected unique-key race and resolve it to replay/conflict after re-reading the tenant-scoped row.
- [x] Add route/controller wiring and safe response mappers.
- [x] Run focused API suites and `git diff --check`.
- [x] Commit: `feat: queue sales invoice email deliveries` (`784be85b`).

**Checkpoint:** Commit `784be85b`; focused queue/controller coverage is 3 suites and 6 tests. The finalized-invoice queue path archives one PDF reference, creates one `QUEUED` outbox row, and makes zero provider calls; active suppression, unusable provider readiness, replay, and request conflicts fail before a new row or provider work.

### Task 4: Attachment worker verification and atomic retry claiming

**Files:**
- Create: `apps/api/src/email/email-retry-worker.service.ts`, `apps/api/src/email/email-retry-worker.service.spec.ts`, and the local DB integration spec using the repository's existing test database guard.
- Modify: `apps/api/src/email/email.service.ts`, `apps/api/src/email/email.controller.ts`, `apps/api/src/email/email.module.ts`, `apps/api/src/generated-documents/generated-document.service.ts`, `.env.example`, `docs/email/EMAIL_DELIVERY_ARCHITECTURE.md`.

**Interfaces:**
- `EmailRetryWorkerService.process(organizationId, actorUserId, limit)` selects due candidates only as a bounded batch, then atomically claims each with a conditional `updateMany`; only `count === 1` may send.
- Claim predicate: organization, status in `QUEUED`/`FAILED`, due `nextAttemptAt`, no bounce/complaint, attempt count below max, and unlocked or stale beyond `LEDGERBYTE_EMAIL_RETRY_LOCK_STALE_MS` (safe default 15 minutes; positive integer validation).
- Claim update sets `retryLockedAt`, `retryLockedBy`, and leaves the row otherwise unchanged. Result update includes a matching `retryLockedBy` predicate to prevent stale workers overwriting a reclaimed row.
- Immediately after claim, recheck suppression, then call `readAttachmentForWorker()` for invoice deliveries, then call provider with the exact verified Buffer and content hash. Existing no-attachment messages continue through the same worker with no attachment.
- On success set `SENT_MOCK` or `SENT_PROVIDER`, provider marker/message ID, attempt metadata, and clear lock. On retryable provider failure increment attempt, set safe error, schedule retry while below max, and clear lock. On max failure, clear future retry. On suppression or attachment verification failure, record safe terminal failure/block and clear lock without provider contact.
- Existing `/email/retry-process` and `/email/retry-worker/run` behavior remains compatible; default disabled flags remain fail-closed and no hosted scheduler is added.

- [x] Write failing unit tests for exact attachment delivery, hash/size/limit/MIME/source mismatch no-send, suppression added after queueing, retry metadata, max attempts, recent-lock skip, stale-lock recovery, success/failure lock release, and two worker executions.
- [x] Write and run a failing local PostgreSQL integration test that inserts one queued outbox row and runs two concurrent worker calls against the same database; assert one provider send, one claim winner, and one final state update. If local DB infrastructure is unavailable, preserve the failing integration test and report the external local-only blocker rather than claiming concurrency safety.
- [x] Implement atomic claim, stale-lock recovery, attachment loading, and compatibility delegation.
- [x] Run focused worker/provider suites, then the DB integration test with only the local Docker Compose Postgres target if available. Never use hosted `DATABASE_URL` or `DIRECT_URL`.
- [x] Commit: `fix: claim email retry rows atomically` (`6078ef6b`).

**Checkpoint:** Commit `6078ef6b`; worker tests are 6 tests green and the broader email/generated-document compatibility run is 55 tests green. Claiming uses tenant/status/due/suppression/attempt predicates plus unlocked-or-stale lock state, with `updateMany` `count === 1` as the only send authority and token-matched terminal updates. Stale lock default is 900000 ms. The guarded local PostgreSQL race test now passes against the repository's local Docker PostgreSQL service: 1 test, one provider send, one claim winner, and one final state update; the temporary test row was removed during teardown.

### Task 5: Invoice detail send dialog and delivery history

**Files:**
- Modify: `apps/web/src/lib/types.ts`, `apps/web/src/lib/permissions.ts` only if normalization wiring is required, `apps/web/src/app/(app)/sales/invoices/[id]/page.tsx`, and its test.
- Create: `apps/web/src/lib/email-deliveries.ts`, `apps/web/src/components/sales-invoices/invoice-email-delivery-panel.tsx`, and focused component/helper tests.

**Interfaces:**
- The detail page shows “Send invoice” only for `FINALIZED` invoices and `PERMISSIONS.salesInvoices.send`.
- Dialog fields: recipient, subject, message, archived PDF filename preview, sender label, provider/readiness warning, queue, and cancel. Opening creates one UUID idempotency key; failed HTTP retry preserves it; completed send or intentional send-again creates a new key; pending submission disables duplicate sends.
- Submit DTO is `{ recipientEmail?: string, subject?: string, message?: string, idempotencyKey: string }`; success copy is exactly “Invoice queued for email delivery.” and never “Email sent.”
- History panel consumes `GET /sales-invoices/:id/email-deliveries`, newest first, with loading, error, empty, responsive table/card, status label, masked recipient, requested by/time, attempts, retry time, provider, filename, bounce/complaint, suppression, and safe error.
- Organization changes clear history immediately and late responses are ignored using the same cancellation/organization token pattern already used on the page.
- Dialog controls use the existing accessible `LedgerActionDialog`/form primitives and remain keyboard operable.

- [x] Write failing frontend tests for visibility, finalized/draft/voided gating, prefilled/blank recipient, defaults, DTO/idempotency key retry behavior, double-submit prevention, queued copy, history states/labels, bounce/complaint, organization change, stale response, and keyboard accessibility.
- [x] Run the focused web tests and observe the intended failures.
- [x] Implement the smallest coherent panel and page wiring without changing the broader invoice layout or compliance surfaces.
- [x] Run focused web tests, web typecheck, and invoice route tests.
- [x] Commit: `feat: add invoice email delivery interface` (`dd2b4af3`).

**Checkpoint:** Commit `dd2b4af3`; focused UI coverage is 3 tests green, invoice-detail route coverage is 12 tests green, and web/API typechecks pass. The panel only exposes sending for finalized invoices with `salesInvoices.send`, preserves the same idempotency key after a failed submit, and uses “Invoice queued for email delivery.” without claiming that provider acceptance is delivery.

### Task 6: Local mock-only lifecycle integration proof

**Files:**
- Create: `apps/api/src/sales-invoices/sales-invoice-email-delivery.integration.spec.ts` or the repository's established local smoke-test location.
- Modify: `apps/api/src/email/mock-email.provider.ts` test-only safe capture if required, and relevant test scripts/docs.

**Interfaces:**
- Use a disposable local finalized invoice and synthetic contact/organization data only.
- Queue through the HTTP/service path; assert zero provider calls and one outbox row.
- Run the worker explicitly; assert `SENT_MOCK`, one PDF attachment, exact content hash/byte length, and one provider call.
- Replay the same normalized request; assert same delivery, `idempotentReplay: true`, no new outbox row, and no second provider call.
- Query history and assert newest-first tenant-safe metadata with no body/PDF/raw key.

- [x] Write the failing integration test and run it against the local target only.
- [x] Implement any narrow fixture/wiring changes required by the failing proof.
- [x] Run the safe mock-only flow separately and capture sanitized output counts.
- [x] Commit: `test: prove invoice document delivery lifecycle` (`138f88ee`).

**Checkpoint:** Commit `138f88ee`; mock-only lifecycle proof passes with provider `mock`, POST sends `0`, worker sends `1` verified PDF attachment, replay creates `0` additional rows, sends `0` additional emails, and avoids a second PDF archive generation. The separate database-backed race proof was subsequently completed against the local Docker PostgreSQL service and is now recorded in the Task 4 checkpoint.

### Task 7: Documentation and closure evidence

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`, `docs/API_CATALOG.md`, `docs/FRONTEND_ROUTE_CATALOG.md`, `docs/email/EMAIL_DELIVERY_ARCHITECTURE.md`, and `docs/email/SMTP_PROVIDER_SETUP.md` only for directly affected current truth.
- Create: `docs/development/SME_DOCUMENT_DELIVERY_01_SPRINT_CLOSURE.md`.

**Required closure content:**
- Implemented behavior, exact base SHA `2cff1238`, final SHA, branch, migration summary, API/UI contract, permission and tenant controls, idempotency and worker invariants, tests and verification results, and independent review findings/resolutions.
- Explicitly state: no real email, no hosted mutation, no deployment, no production/customer data, no ZATCA/UAE FTA behavior changes, and mock-only local verification.
- Remaining work: provider-specific webhook verification, real scheduler/worker hosting, sender-domain proof, monitoring/production gates, reminders, WhatsApp, and broader document types.
- Correct only stale documentation directly encountered in this feature scope; do not perform unrelated documentation archaeology.

- [x] Update docs from verified implementation and command results only.
- [x] Run documentation contract tests, `git diff --check`, and secret/body-language scans over the diff.
- [x] Commit: `docs: close SME document delivery arc`.

**Checkpoint:** Commit `770fd183` records the finalized-invoice queue/history contract, atomic claim and attachment invariants, truthful status language, local mock-only lifecycle evidence, and the original local-PostgreSQL availability boundary. The later local Docker run completed the race proof; the sprint closure is `docs/development/SME_DOCUMENT_DELIVERY_01_SPRINT_CLOSURE.md`.

### Task 8: Final verification, review, publish draft PR, and closeout

**Files:**
- No new production files unless review fixes require a focused change; review fixes get their own commit.

- [x] Inspect `git status --short`, review every changed file, and scan the diff for credentials, SMTP passwords, tokens, raw provider payloads, customer emails in fixtures, PDF/base64 bodies in outbox records, and misleading “Delivered” labels.
- [x] Run `corepack pnpm install --frozen-lockfile`.
- [x] Run `corepack pnpm --filter @ledgerbyte/api db:generate`.
- [x] Run `corepack pnpm --filter @ledgerbyte/api exec prisma validate`.
- [x] Run `corepack pnpm lint`.
- [x] Run `corepack pnpm typecheck`.
- [x] Run `corepack pnpm test`.
- [x] Run `corepack pnpm build`.
- [x] Run `corepack pnpm verify:diff`.
- [x] Run `corepack pnpm verify:ci:local`.
- [x] Run `git diff --check`.
- [x] Apply verification-before-completion: read exit codes and test counts; report failures rather than inferring success.
- [x] Perform an independent in-line review against base `2cff1238` and final implementation HEAD. Subagents and hosted review systems were prohibited; the review resolved the replay/PDF duplication risk, the zero-provider queue boundary, safe-history redaction, permission-matrix drift, and test-module dependency seams. The local Docker PostgreSQL race proof now passes with one claim winner and one provider send.
- [x] Add failing regression tests for the final review findings, observe the expected failures, and run the focused API/web suites and typechecks.
- [x] Apply only the verified review fixes: audit-failure lock release, invoice source/document attachment enforcement, generic provider failure diagnostics, complete safe history metadata, and stale organization refresh protection.
- [x] Commit the review-fix milestone: `fix: harden invoice delivery review findings` (`16270ab1`).
- [ ] Push `codex/sme-document-delivery-01` — explicitly authorized for this review-and-publish handoff; no force push.
- [ ] Open a draft PR against `main` — explicitly authorized; keep draft and do not merge.
- [x] Do not merge the PR.

**Final local checkpoint:** The review-fix milestone is `16270ab1`. Full local gates and the post-review focused suites remain required before the authorized GitHub push and draft-PR handoff.

**Final report must include:** branch, base/final SHAs, draft PR link, files created/modified, schema/migration summary, API/UI summary, pass/fail counts for every verification command, independent review findings/resolutions, explicit no-real-email and no-hosted-mutation confirmation, explicit ZATCA/UAE FTA unchanged confirmation, and remaining limitations.

## Plan Self-Review

- Spec coverage: queue API, finalized-only eligibility, permissions, tenant scope, PDF archive/reference, attachment contract and verification, mock/SMTP support, suppression before queue and before send, retry/max attempts, atomic claims/stale locks, idempotency/replay/conflict, audit redaction, status language, frontend send/history/organization transitions, local integration proof, docs, review, verification, and draft PR are each assigned above.
- No production code is planned without a preceding failing test step.
- The worker and idempotency transaction invariants are written before their implementation tasks.
- No task adds a hosted scheduler, real provider, compliance behavior, or unrelated document family.
