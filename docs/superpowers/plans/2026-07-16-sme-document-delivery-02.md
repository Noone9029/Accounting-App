# SME Document Delivery 02 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the merged invoice PDF email-delivery foundation to quotes/proformas, finalized customer credit notes, posted customer payment receipts, and customer statement snapshots while preserving the single generic outbox/worker architecture and the mock-only safety boundary.

**Architecture:** Keep `DocumentDeliveryService`, `EmailOutbox`, `GeneratedDocumentService`, and `EmailRetryWorkerService` as the only generic queue, archive, attachment-verification, and provider-execution path. Add thin source orchestrators in the sales-quotes, credit-notes, customer-payments, and contacts modules; each performs tenant-scoped lookup, eligibility checks, template preparation, PDF archival, and delegation to the generic service. Add one shared frontend delivery dialog/history surface with source-specific configuration and thin page integrations.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Jest, React/Next.js, TypeScript, `@ledgerbyte/pdf-core`, local mock email provider, local PostgreSQL concurrency tests.

## Global Constraints

- Base branch is the latest `origin/main` after merged PR #376; actual base SHA is `92abd403efbad760260b03713335eea229e9c8f5`.
- The pre-existing root modification `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` is protected and must not be staged, reset, copied, moved, or overwritten.
- Queue HTTP requests must never call SMTP or another external provider; only the existing retry worker may execute a provider call.
- All email tests use the mock provider or a fully stubbed Nodemailer transport with zero network activity.
- Do not create another delivery table, queue, worker, concurrency mechanism, suppression system, provider abstraction, or PDF copy in `EmailOutbox`.
- Do not change accounting postings, document lifecycle transitions, statement calculation math, ZATCA behavior, UAE FTA behavior, Peppol behavior, hosted application state, hosted database state, or production credentials.
- Keep idempotency keys raw only in request memory; persist and return only hashes or safe replay metadata.
- Dynamic HTML values must be escaped and history responses must remain redacted, tenant-scoped, newest-first, and free of raw bodies, PDF bytes, provider payloads, credentials, cookies, authorization headers, and raw recipient addresses.
- Use TDD for behavioral changes: write one focused failing test, run it and observe the expected failure, implement the smallest passing change, rerun the focused test, then commit the milestone.

## Current Repository Map and Decisions

- PR #376 is merged as GitHub merge commit `92abd403efbad760260b03713335eea229e9c8f5`; the worktree branch starts from that commit.
- Existing generic files are `apps/api/src/email/document-delivery.service.ts`, `apps/api/src/email/email-retry-worker.service.ts`, `apps/api/src/email/email-delivery-status.ts`, `apps/api/src/email/email-templates.ts`, `apps/api/src/email/email-provider.ts`, `apps/api/src/email/mock-email.provider.ts`, and `apps/api/src/generated-documents/generated-document.service.ts`.
- Existing invoice orchestration is `apps/api/src/sales-invoices/sales-invoice-email-delivery.service.ts`; its route pair is `POST/GET /sales-invoices/:id/email-deliveries` and its shared UI reference is `apps/web/src/components/sales-invoices/invoice-email-delivery-panel.tsx`.
- `DocumentDeliveryService` currently has invoice-shaped `salesInvoiceId` and request-hash inputs. Generalize those fields without removing invoice compatibility; source type, source ID, template/document kind, recipient, subject, message, organization, and statement period context must participate in the normalized request hash.
- `DocumentType` already contains `SALES_QUOTE`, `CREDIT_NOTE`, `CUSTOMER_PAYMENT_RECEIPT`, and `CUSTOMER_STATEMENT`. `EmailTemplateType` currently has `PAYMENT_RECEIPT` but lacks `SALES_QUOTE`, `CREDIT_NOTE`, and `CUSTOMER_STATEMENT`; add only those missing enum values with an additive Prisma migration.
- `SalesQuoteStatus` is exactly `DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CANCELLED | CONVERTED`. The existing quote workflow marks a draft `SENT`, then allows `ACCEPTED`, `REJECTED`, `EXPIRED`, or `CANCELLED`; delivery eligibility is `SENT` and `ACCEPTED` only. `DRAFT`, `REJECTED`, `EXPIRED`, `CANCELLED`, and `CONVERTED` are rejected and no delivery operation changes quote status.
- The current `SalesQuote` model has no quote/proforma discriminator. Add `SalesQuoteDocumentKind { QUOTE PROFORMA }` and `documentKind SalesQuoteDocumentKind @default(QUOTE)` through an additive migration; expose it through create/get/PDF data and use it in filename, subject, template, and history labels. Do not add or change lifecycle states.
- `CreditNoteStatus` is exactly `DRAFT | FINALIZED | VOIDED`; only `FINALIZED` is sendable. `CustomerPaymentStatus` is exactly `DRAFT | POSTED | VOIDED`; only `POSTED` is sendable.
- `ContactType` is exactly `CUSTOMER | SUPPLIER | BOTH`; customer statements accept `CUSTOMER` and `BOTH`, and reject `SUPPLIER`.
- The authoritative customer statement pipeline is `ContactLedgerService.statement`, `statementPdfData`, and `statementPdf`. It validates optional boundaries as `YYYY-MM-DD`, treats `from` as the UTC start boundary and `to` as the UTC end-of-day boundary, and archives `DocumentType.CUSTOMER_STATEMENT` with source type `CustomerStatement`. The queue DTO will require `asOf`; normalize `asOf` to the authoritative upper-bound date (`to`, or `asOf` when `to` is omitted), reject conflicting `to`/`asOf` values, and pass only the normalized `from`/`to` values into the existing statement pipeline. Store normalized `from`, `to`, and `asOf` in safe generated-document accounting context and delivery request context.
- Permission mapping is: quotes/proformas queue `salesInvoices.send`, history `salesInvoices.view`; credit notes queue `creditNotes.send`, history `creditNotes.view`; customer receipts queue `customerPayments.send`, history `customerPayments.view`; customer statements queue `contacts.sendCustomerStatements`, history `contacts.view`. Add the three missing send permissions to `PERMISSIONS`, `ALL_PERMISSIONS`, shared/web permission matrices, and provisioning tests; full-access/system roles continue to receive all permissions through the existing mechanism and custom roles are not silently broadened.

## Milestones

### Task 1: Create baseline and plan checkpoint

**Files:**
- Create: `docs/superpowers/plans/2026-07-16-sme-document-delivery-02.md`
- Modify: none before this plan is committed

**Interfaces:**
- Produces the exact base SHA, status matrix, permission map, statement identity, invariants, file map, and test plan used by all later tasks.

- [x] **Step 1: Verify the dependency gate**

  Run `git fetch origin`, `git log -10 --oneline origin/main`, `gh pr view 376 --repo Noone9029/Accounting-App --json state,isDraft,mergedAt,mergeCommit,url`, the seven foundation checks from the approved brief, and `git status --short` in the root checkout.

  Evidence recorded: PR #376 is merged; all foundation files and symbols are present; root status contains only `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md`.

- [x] **Step 2: Create the isolated branch**

  Create `E:\Worktrees\Accounting-App\sme-document-delivery-02` from `origin/main` on branch `codex/sme-document-delivery-02` and verify its clean status and HEAD `92abd403efbad760260b03713335eea229e9c8f5`.

- [x] **Step 3: Write and review this plan**

  Confirm this document has no placeholder task, records all source eligibility and ownership decisions, and lists every implementation/test/documentation file to be changed before implementation begins.

- [x] **Step 4: Commit the plan checkpoint**

  Run:

  ```powershell
  git add docs/superpowers/plans/2026-07-16-sme-document-delivery-02.md
  git commit -m "docs: plan customer document email delivery"
  ```

### Task 2: Establish clean dependencies and baseline evidence

**Files:**
- Modify: generated dependency artifacts only if the repository install scripts require them; do not stage generated churn outside the task

- [x] **Step 1: Install and generate the local client**

  Run `corepack pnpm install --frozen-lockfile` and `corepack pnpm --filter @ledgerbyte/api db:generate`.

- [x] **Step 2: Validate the baseline schema and focused foundation tests**

  Run `corepack pnpm --filter @ledgerbyte/api exec prisma validate` and the merged foundation tests: `corepack pnpm --filter @ledgerbyte/api test -- --runInBand src/email/document-delivery.service.spec.ts src/email/document-delivery-persistence.spec.ts src/email/email-retry-worker.service.spec.ts src/email/email-retry-worker.local-db.integration.spec.ts src/sales-invoices/sales-invoice-email-delivery.service.spec.ts src/sales-invoices/sales-invoice-email-delivery.controller.spec.ts src/sales-invoices/sales-invoice-email-delivery.lifecycle.integration.spec.ts`.

  Workspace adaptation/evidence: `corepack pnpm --filter @ledgerbyte/api exec prisma validate` could not resolve the Prisma binary from the root invocation, so validation was rerun from `apps/api` with disposable localhost values for `DATABASE_URL` and `DIRECT_URL` and passed. Frozen install passed; Prisma generation passed; focused baseline passed with 6 suites and 22 tests, 1 local-PostgreSQL suite skipped and 1 test skipped because no disposable local database was running.

- [x] **Step 3: Record the baseline result in the plan**

  Add the actual command exit codes and suite/test counts below this task without copying a large log, and leave unrelated generated files unstaged.

- [x] **Step 4: Commit the baseline checkpoint if repository files changed**

  Use `git diff --check`, review `git status --short`, and commit only intentional plan or migration-generated artifacts.

  No generated or unrelated files were present after setup; this checkpoint is recorded in the plan commit that follows.

### Task 3: Add schema, permissions, templates, and generic source-neutral delivery contracts

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260716143000_add_customer_document_email_delivery/migration.sql`
- Modify: `packages/shared/src/permissions.ts`
- Modify: `apps/web/src/lib/permissions.ts`
- Modify: `apps/web/src/lib/permission-matrix.ts`
- Modify: `apps/api/src/email/document-delivery.service.ts`
- Modify: `apps/api/src/email/email-delivery-status.ts`
- Modify: `apps/api/src/email/email-templates.ts`
- Create: `apps/api/src/email/customer-document-email-delivery.types.ts`
- Modify: `apps/api/src/email/document-delivery.service.spec.ts`
- Modify: `apps/api/src/email/document-delivery-persistence.spec.ts`
- Create or modify: shared permission normalization/matrix tests already covering `ALL_PERMISSIONS`

**Interfaces:**
- `QueueDocumentDeliveryInput` accepts a generic source and optional bounded `requestContext` while retaining `salesInvoiceId` only for the legacy invoice relation.
- `DocumentDeliveryReplayLookupInput` accepts the same normalized source/request fields and never requires generating a PDF.
- `DocumentDeliveryQueueResult` exposes generic `sourceType`, `sourceId`, `sourceNumber`, `documentLabel`, and safe statement-period metadata in addition to existing invoice-compatible fields.
- `PreparedCustomerDocumentDelivery` contains organization, actor, source type/id/number, template type, recipient, subject, body text/html, generated-document metadata, idempotency key, and bounded request context.

- [x] **Step 1: Write failing generic-contract tests**

  Add tests proving a non-invoice source hash differs when source type, template/document kind, message, or statement period changes; same normalized key/payload replays; different payload conflicts before PDF generation; raw idempotency keys and bodies are absent from selected persistence/audit metadata; and existing invoice behavior remains compatible.

- [x] **Step 2: Run the focused tests and observe the expected failures**

  Run `corepack pnpm --filter @ledgerbyte/api test -- --runInBand src/email/document-delivery.service.spec.ts src/email/document-delivery-persistence.spec.ts`; failures must identify missing generic source/hash behavior rather than test setup errors.

- [x] **Step 3: Implement the generic contract minimally**

  Replace invoice-specific request-hash inputs with normalized `{ organizationId, sourceType, sourceId, recipientEmail, subject, message, templateType, documentType, requestContext }`; preserve the unique organization/hash constraint, replay-before-archive call order, suppression checks, safe audit redaction, attachment metadata, and invoice response compatibility. Extend central status mapping without introducing “Delivered” for provider acceptance.

- [x] **Step 4: Add the additive Prisma changes**

  Add `EmailTemplateType.SALES_QUOTE`, `EmailTemplateType.CREDIT_NOTE`, and `EmailTemplateType.CUSTOMER_STATEMENT`; add `SalesQuoteDocumentKind` and `SalesQuote.documentKind` defaulting to `QUOTE`; preserve existing enum values and use a forward-only local PostgreSQL migration.

- [x] **Step 5: Add permission constants and normalization tests**

  Add `creditNotes.send`, `customerPayments.send`, and `contacts.sendCustomerStatements` to the established registries/matrices. Assert full access permits them, exact permissions permit only their matching route, and existing custom-role permission arrays are not mutated.

- [x] **Step 6: Implement escaped source templates and verify green**

  Add quote/proforma, credit-note, payment-receipt, and customer-statement builders. Subject overrides remain CR/LF-free and at most 200 characters; messages remain at most 5,000 characters; all dynamic HTML is escaped; copy does not promise allocation, refund, reconciliation, settlement, cleared funds, or provider delivery.

- [x] **Step 7: Commit**

  Run the focused API/shared tests and `git diff --check`, then commit `feat: add customer document delivery permissions and templates`.

### Task 4: Queue quote and proforma email deliveries

**Files:**
- Create: `apps/api/src/sales-quotes/dto/create-sales-quote-email-delivery.dto.ts`
- Create: `apps/api/src/sales-quotes/sales-quote-email-delivery.service.ts`
- Create: `apps/api/src/sales-quotes/sales-quote-email-delivery.service.spec.ts`
- Create or modify: `apps/api/src/sales-quotes/sales-quote.controller.spec.ts`
- Modify: `apps/api/src/sales-quotes/sales-quote.controller.ts`
- Modify: `apps/api/src/sales-quotes/sales-quote.module.ts`
- Modify: `apps/api/src/sales-quotes/dto/create-sales-quote.dto.ts`
- Modify: `apps/api/src/sales-quotes/sales-quote.service.ts`
- Modify: `apps/api/src/sales-quotes/sales-quote-rules.spec.ts`
- Modify: `apps/api/prisma/schema.prisma` and its additive migration from Task 3

**Interfaces:**
- `POST /sales-quotes/:id/email-deliveries` accepts `{ recipientEmail?, subject?, message?, idempotencyKey }`.
- `GET /sales-quotes/:id/email-deliveries` returns source-scoped generic history newest first.
- `SalesQuoteEmailDeliveryService.queue(organizationId, actorUserId, quoteId, dto, requestId?)` performs only source preparation and generic delegation.

- [x] **Step 1: Write failing quote/proforma service and controller tests**

  Cover eligible `SENT` quote, eligible `ACCEPTED` proforma, rejection for each non-sendable status, source-specific labels/filename/templates, missing recipient, CR/LF/length validation, permission metadata, cross-tenant lookup, zero provider calls during queue, archived `SALES_QUOTE` attachment, replay-before-PDF generation, and no quote lifecycle mutation.

- [x] **Step 2: Run tests to confirm RED**

  Run the new service/controller specs and confirm they fail because routes/service/template/discriminator behavior is absent.

- [x] **Step 3: Implement the quote/proforma orchestrator and route pair**

  Resolve the customer email unless overridden, require `SENT` or `ACCEPTED`, call existing `SalesQuoteService.pdf`, pass `DocumentType.SALES_QUOTE`, and preserve the `QUOTE`/`PROFORMA` label in the source number, subject, body, filename, and history. Do not call `markSent` or any other lifecycle mutation.

- [x] **Step 4: Run focused quote tests and commit**

  Evidence: quote controller/service/rules suites pass with 25 tests; API typecheck and pdf-core build pass. Included in commit `6ed0572d`.

  Run quote rules, new delivery specs, and existing quote controller tests; commit `feat: queue quote and proforma email deliveries`.

### Task 5: Queue credit-note and customer-payment receipt deliveries

**Files:**
- Create: `apps/api/src/credit-notes/dto/create-credit-note-email-delivery.dto.ts`
- Create: `apps/api/src/credit-notes/credit-note-email-delivery.service.ts`
- Create: `apps/api/src/credit-notes/credit-note-email-delivery.service.spec.ts`
- Create or modify: `apps/api/src/credit-notes/credit-note.controller.spec.ts`
- Modify: `apps/api/src/credit-notes/credit-note.controller.ts`
- Modify: `apps/api/src/credit-notes/credit-note.module.ts`
- Create: `apps/api/src/customer-payments/dto/create-customer-payment-email-delivery.dto.ts`
- Create: `apps/api/src/customer-payments/customer-payment-email-delivery.service.ts`
- Create: `apps/api/src/customer-payments/customer-payment-email-delivery.service.spec.ts`
- Create or modify: `apps/api/src/customer-payments/customer-payment.controller.spec.ts`
- Modify: `apps/api/src/customer-payments/customer-payment.controller.ts`
- Modify: `apps/api/src/customer-payments/customer-payment.module.ts`
- Modify: `apps/api/src/credit-notes/credit-note-rules.spec.ts`
- Modify: `apps/api/src/customer-payments/customer-payment-rules.spec.ts`

**Interfaces:**
- `POST/GET /credit-notes/:id/email-deliveries` use `creditNotes.send`/`creditNotes.view`.
- `POST/GET /customer-payments/:id/email-deliveries` use `customerPayments.send`/`customerPayments.view`.

- [x] **Step 1: Write failing credit-note and payment tests**

  Cover finalized/posting eligibility, draft/voided rejection, source-scoped history, recipient override/default, template values and safe references, archived `CREDIT_NOTE`/`CUSTOMER_PAYMENT_RECEIPT` PDFs, zero provider calls on queue, cross-tenant and permission denial, idempotent replay, and spies proving no allocation/refund/reversal/reconciliation/accounting mutation occurs.

- [x] **Step 2: Run focused tests to confirm RED**

  Run the new service/controller specs and existing credit-note/payment rule specs; failures must be caused by missing delivery behavior.

- [x] **Step 3: Implement both focused orchestrators and controller routes**

  Use `CreditNoteService.pdf` and `CustomerPaymentService.receiptPdf`, reuse `PAYMENT_RECEIPT` for receipts, add only the missing `CREDIT_NOTE` template, and delegate all queue/replay/history/attachment behavior to `DocumentDeliveryService`.

- [x] **Step 4: Run focused tests and commit**

  Evidence: credit-note/payment service and controller suites pass with 25 tests; API typecheck passes. Included in commit `6ed0572d`.

  Commit `feat: queue credit note and payment receipt deliveries` after the affected suites and `git diff --check` pass.

### Task 6: Queue customer statement snapshots

**Files:**
- Create: `apps/api/src/contacts/dto/create-customer-statement-email-delivery.dto.ts`
- Create: `apps/api/src/contacts/customer-statement-email-delivery.service.ts`
- Create: `apps/api/src/contacts/customer-statement-email-delivery.service.spec.ts`
- Create or modify: `apps/api/src/contacts/contact.controller.spec.ts`
- Modify: `apps/api/src/contacts/contact.controller.ts`
- Modify: `apps/api/src/contacts/contact.module.ts`
- Modify: `apps/api/src/contacts/contact-ledger.service.ts` only for safe normalized snapshot metadata/source ownership if needed
- Modify: `apps/api/src/generated-documents/generated-document.service.ts` and its rules spec if contact ownership verification is missing
- Modify: `apps/api/src/email/document-delivery.service.ts` tests from Task 3

**Interfaces:**
- `POST /contacts/:id/customer-statement-email-deliveries` accepts `{ from, to, asOf, recipientEmail?, subject?, message?, idempotencyKey }`.
- `GET /contacts/:id/customer-statement-email-deliveries` returns source-scoped history with normalized statement period metadata.
- `CustomerStatementEmailDeliveryService.queue(organizationId, actorUserId, contactId, dto, requestId?)` normalizes dates and calls the existing `ContactLedgerService.statementPdf` pipeline.

- [x] **Step 1: Write failing statement tests**

  Cover customer/BOTH contact success, supplier-only rejection, cross-tenant rejection, invalid dates and `from > to`, required/normalized `asOf`, statement math delegated to `ContactLedgerService`, one archived `CUSTOMER_STATEMENT` snapshot, customer/organization source ownership, no accounting mutations, period in history, and same-key changed-period HTTP 409.

- [x] **Step 2: Run statement tests to confirm RED**

  Run the new statement delivery suite and existing contact ledger/PDF tests; confirm the failures are missing delivery behavior rather than date-parser setup errors.

- [x] **Step 3: Implement the statement orchestrator**

  Resolve the customer contact with `CUSTOMER`/`BOTH` semantics, normalize `from`, `to`, and `asOf` through the existing date conventions, reject conflicting upper bounds, prepare the source-specific template from authoritative closing balance data, call `statementPdf`, and include only bounded period metadata in generic request/accounting context.

- [x] **Step 4: Verify replay-before-PDF and ownership**

  Assert that a replay or conflict is returned before a second PDF call; assert the generated document source type/source ID and organization match the active customer statement identity; assert no ledger rows or statement bodies are written to `EmailOutbox`.

- [x] **Step 5: Commit**

  Evidence: statement delivery, controller, contact-ledger, generated-document, and generic delivery suites pass; the broader document regression set passes with 8 suites and 42 tests, and API typecheck passes. The statement implementation is included in the next focused commit.

  Commit `feat: queue customer statement deliveries` after focused statement and generated-document tests pass.

### Task 7: Preserve and test the generic worker/provider lifecycle

**Files:**
- Modify: `apps/api/src/email/email-retry-worker.service.spec.ts`
- Modify: `apps/api/src/email/email-retry-worker.local-db.integration.spec.ts`
- Modify: `apps/api/src/email/email-provider-attachments.spec.ts`
- Modify: `apps/api/src/email/email-delivery-status.spec.ts`
- Modify: `apps/api/src/email/email-redaction.ts` tests if necessary
- Create: `apps/api/src/email/customer-document-email-delivery.lifecycle.integration.spec.ts`

- [ ] **Step 1: Write failing mock-only lifecycle and race tests**

  Queue one eligible new source through the service boundary, assert zero provider calls and one archive, run the worker explicitly, assert `SENT_MOCK` and one verified PDF attachment, replay and assert no second outbox/document, query safe history, and run a local PostgreSQL two-worker race for a new source type.

- [ ] **Step 2: Run tests to confirm RED**

  Run the new lifecycle and worker suites with the mock provider and local disposable PostgreSQL only; do not use hosted URLs or credentials.

- [ ] **Step 3: Implement only necessary generic fixes**

  Keep conditional atomic claim ownership, token-bound final updates, active suppression recheck, stale-lock recovery, max-attempt stop, attachment ownership/MIME/size/byte-length/hash checks, lock release, and provider-acceptance label unchanged. Add no second worker or provider path.

- [ ] **Step 4: Run all email lifecycle tests and commit**

  Commit `test: prove customer document delivery lifecycle` after the mock lifecycle, concurrency race, attachment integrity, suppression, webhook, invitation, password-reset, AP groundwork, and invoice suites are green.

### Task 8: Add the shared frontend delivery interface

**Files:**
- Create: `apps/web/src/components/email/customer-document-email-delivery-dialog.tsx`
- Create: `apps/web/src/components/email/customer-document-email-delivery-history.tsx`
- Create: `apps/web/src/components/email/customer-document-email-delivery.tsx`
- Modify: `apps/web/src/components/sales-invoices/invoice-email-delivery-panel.tsx`
- Modify: `apps/web/src/lib/email-deliveries.ts`
- Modify: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/components/email/customer-document-email-delivery.test.tsx`
- Modify: `apps/web/src/components/sales-invoices/invoice-email-delivery-panel.test.tsx`

**Interfaces:**
- Shared component configuration supplies source label, number, status eligibility, customer email, PDF filename, endpoint pair, permission result, default subject/message, optional statement period, and document label.
- Dialog generates one UUID on open, preserves it across failed HTTP retries, disables double submit, resets only after successful queue or intentional send-again, and never stores the key in browser storage.

- [ ] **Step 1: Write failing component tests**

  Cover permission-gated actions, ineligible states, prefilled/missing recipient, source defaults, endpoint/DTO, queued success copy, stable retry key, double-submit prevention, filename/provider warning, shared history labels/periods, loading/empty/error states, keyboard accessibility, organization transition clearing, and late-response suppression.

- [ ] **Step 2: Run focused web tests to confirm RED**

  Run `corepack pnpm --filter @ledgerbyte/web test -- --runInBand src/components/email/customer-document-email-delivery.test.tsx src/components/sales-invoices/invoice-email-delivery-panel.test.tsx` and confirm failures are the missing shared behavior.

- [ ] **Step 3: Implement the shared component and invoice wrapper**

  Preserve invoice behavior through a thin configuration wrapper or a narrowly scoped extraction. Render “Queued for email delivery” only; never render “Sent” or “Delivered” for queue success, and map provider acceptance to “Accepted by email provider.”

- [ ] **Step 4: Run focused web tests and commit**

  Commit `feat: add shared customer document delivery interface` after focused component tests and existing invoice tests pass.

### Task 9: Integrate source pages and frontend route tests

**Files:**
- Modify: `apps/web/src/app/(app)/sales/quotes/[id]/page.tsx`
- Modify: `apps/web/src/app/(app)/sales/credit-notes/[id]/page.tsx`
- Modify: `apps/web/src/app/(app)/sales/customer-payments/[id]/page.tsx`
- Modify: `apps/web/src/app/(app)/customers/[id]/statement/page.tsx`
- Modify: `apps/web/src/lib/types.ts`
- Create or modify: the four corresponding page test files

- [ ] **Step 1: Write failing route integration tests**

  Cover source-specific permission gates, eligible-state visibility, customer email defaults, endpoint DTOs, truthful queue copy, source labels, statement period inputs, and organization-switch/late-response behavior on each page.

- [ ] **Step 2: Run the route tests to confirm RED**

  Run the four page test paths and confirm missing controls/requests are the cause.

- [ ] **Step 3: Add thin page configurations**

  Wire the shared surface to the exact API endpoints, source statuses, document labels, and PDF filename previews without changing unrelated page workflows or accounting actions.

- [ ] **Step 4: Run focused web tests and commit**

  Commit `test: cover customer document delivery UI workflows` after page tests and invoice regression tests pass.

### Task 10: Update truth-bearing documentation and verify the complete change

**Files:**
- Modify: `docs/IMPLEMENTATION_STATUS.md`
- Modify: `docs/API_CATALOG.md`
- Modify: `docs/FRONTEND_ROUTE_CATALOG.md`
- Modify: `docs/email/EMAIL_DELIVERY_ARCHITECTURE.md`
- Modify: `docs/email/SMTP_PROVIDER_SETUP.md`
- Create: `docs/development/SME_DOCUMENT_DELIVERY_02_SPRINT_CLOSURE.md`

- [ ] **Step 1: Write the closure document from evidence**

  Include base SHA, final SHA, source types, exact endpoint list, permission mapping, idempotency behavior, statement snapshot identity, worker/concurrency evidence, focused/full test results, mock-only/no-real-email boundary, no hosted mutation/deployment/production credentials/customer data, unchanged accounting/ZATCA/UAE FTA behavior, review findings, resolutions, and remaining work.

- [ ] **Step 2: Run the required verification gates**

  Run, adapting only to current scripts:

  ```powershell
  corepack pnpm install --frozen-lockfile
  corepack pnpm --filter @ledgerbyte/api db:generate
  corepack pnpm --filter @ledgerbyte/api exec prisma validate
  corepack pnpm lint
  corepack pnpm typecheck
  corepack pnpm test
  corepack pnpm build
  corepack pnpm verify:diff
  corepack pnpm verify:ci:local
  git diff --check
  ```

  Use only disposable local Docker PostgreSQL for migration/concurrency evidence, remove temporary rows, stop the container, and record the exact result.

- [ ] **Step 3: Perform the independent full-diff review**

  Inspect every changed file and search the diff for credentials, SMTP passwords, tokens, provider payloads, real addresses, PDF/base64 copies in `EmailOutbox`, raw idempotency keys, misleading “Delivered” language, and unrelated accounting/compliance changes. Classify findings as Critical, Important, or Minor; fix all verified Critical/Important findings with regression tests and rerun affected/full gates.

- [ ] **Step 4: Commit documentation and closure**

  Commit `docs: close customer document delivery arc` only after the verification evidence is fresh and the worktree contains no unrelated changes.

### Task 11: Publish a draft PR without merging

**Files:**
- No additional source files; use the verified branch and closure document

- [ ] **Step 1: Verify final local state**

  Run `git status --short`, `git log --oneline --decorate -10`, `git diff origin/main...HEAD --stat`, and the full verification commands again if any post-review fix landed.

- [ ] **Step 2: Push the branch**

  Run `git push -u origin codex/sme-document-delivery-02`.

- [ ] **Step 3: Open the draft PR**

  Create a draft PR against `main` with title `SME-DOCUMENT-DELIVERY-02: Extend email delivery to customer documents` and a body containing goal, reused architecture, sources/endpoints/permissions/schema, quote/proforma policy, statement snapshot/idempotency, tenant/attachment safeguards, worker evidence, UI workflow, test evidence, review findings/resolutions, explicit no-real-email boundary, out-of-scope items, and remaining production gates. Do not merge.

- [ ] **Step 4: Record remote evidence**

  Capture the PR URL, remote branch SHA, draft state, and final local/root status in the closure document and final report.

## Verification Matrix

| Requirement | Evidence |
| --- | --- |
| Queue does not call provider | Mock provider call count remains zero before explicit worker run in lifecycle tests |
| One immutable PDF per intentional send | Generated-document count, source ownership, MIME, size, byte length, and content hash assertions |
| Replay before PDF generation | PDF service spy is not called on same-key replay or conflict |
| Same key changed payload/period returns 409 | Generic and statement service/controller tests |
| Tenant and permission isolation | Four source-specific cross-tenant/permission-denial suites plus controller metadata tests |
| Exact source eligibility | Quote status matrix, finalized credit-note, posted payment, customer/BOTH contact tests |
| Worker concurrency unchanged | Existing worker tests plus local PostgreSQL two-worker race for a new source |
| Truthful statuses | Central status mapping tests and frontend history/status assertions |
| No sensitive data leakage | Persistence, audit, API history, diff scan, and redaction tests |
| No hosted/production mutation | Command history and closure confirmations; no deploy/migration against hosted URLs |
