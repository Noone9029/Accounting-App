# Goal

Implement the approved `SME-DOCUMENT-DELIVERY-03` arc on branch `codex/sme-document-delivery-03`: queue immutable archived PDFs for eligible supplier-facing purchase orders, purchase debit notes, supplier-payment remittances, and supplier statements through the merged source-neutral document-delivery engine; add truthful history and shared UI; prove the mock-only lifecycle and the mandatory local PostgreSQL `SupplierStatement` race; update directly affected documentation; obtain an independent review; and publish a draft PR without merging or deploying.

The required base is present. The implementation worktree was created from `origin/main` at:

`3f5c31bc0ad96b3af2deba1348f55b7cead84888`

The protected root modification `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` remains outside this worktree and must not be staged, reset, copied, moved, or deleted.

# Architecture

`DocumentDeliveryService` remains the only queue, idempotency, suppression, history-mapping, attachment-reference, audit-summary, and outbox owner. `EmailRetryWorkerService` remains the only provider execution owner. The four supplier source orchestrators own only tenant-scoped lookup, eligibility, recipient resolution, default template data, existing PDF/archive invocation, source context, and delegation:

- `PurchaseOrderEmailDeliveryService`
- `PurchaseDebitNoteEmailDeliveryService`
- `SupplierPaymentEmailDeliveryService`
- `SupplierStatementEmailDeliveryService`

The existing generated-document archive remains the only PDF byte store. `EmailOutbox` stores only its generated-document reference and verified attachment metadata. No supplier-specific queue table, worker, provider abstraction, suppression path, or concurrency algorithm will be introduced.

The existing customer statement route and behavior remain unchanged:

- `POST/GET /contacts/:id/email-deliveries` continues to serve customer statements.
- Supplier statements use `POST/GET /contacts/:id/supplier-statement-email-deliveries`.

The existing customer-document frontend components will be generalized in place with compatibility exports where that avoids broad churn. Supplier pages will provide source configuration and statement-period fields; shared dialog, history, idempotency, organization-transition, status, and provider-readiness behavior will remain in the shared component owner.

# Tech Stack

- NestJS API with Prisma and PostgreSQL
- Prisma additive enum migration only; no new delivery table or outbox relation
- React/Next.js web application with Jest and Testing Library
- Existing `@ledgerbyte/pdf-core` renderers and generated-document archive
- Existing mock email provider and retry worker
- Local Docker Compose PostgreSQL only for the race proof
- PowerShell commands run from `E:\Accounting App-sme-document-delivery-03`

# Baseline / Authority Refs

- Approved brief: `E:\OpenClaw\agents\main\agent\codex-home\attachments\23f654c1-5195-4a41-8adc-bcfcdd92f831\pasted-text-1.txt`
- Dependency gate: merged PR #377 at `3f5c31bc0ad96b3af2deba1348f55b7cead84888`
- Existing customer delivery plan: `docs/superpowers/plans/2026-07-16-sme-document-delivery-02.md`
- Existing generic queue: `apps/api/src/email/document-delivery.service.ts`
- Existing worker and race harness: `apps/api/src/email/email-retry-worker.service.ts`, `apps/api/src/email/email-retry-worker.local-db.integration.spec.ts`
- Existing customer orchestrator and date boundary: `apps/api/src/contacts/customer-statement-email-delivery.service.ts`
- Existing source-neutral validation candidate: `apps/api/src/email/customer-document-email-delivery.validation.ts`
- Existing templates/status/redaction: `apps/api/src/email/email-templates.ts`, `apps/api/src/email/email-delivery-status.ts`, `apps/api/src/email/email-redaction.ts`
- Existing PDF/archive owners: `PurchaseOrderService.pdf`, `PurchaseDebitNoteService.pdf`, `SupplierPaymentService.receiptPdf`, and `ContactLedgerService.supplierStatementPdf`
- Existing permission registry and role policy: `packages/shared/src/permissions.ts`
- Existing shared delivery UI: `apps/web/src/components/email/customer-document-email-delivery*.tsx`, `apps/web/src/lib/email-deliveries.ts`
- Lazyweb UI evidence search: `accounting document email dialog` on desktop; the references showed a clear recipient/message/document modal and a visible primary action, which will be applied only within the approved shared UI scope.

## Baseline facts recorded before planning

- `EmailTemplateType` currently has the customer and AP foundation values but not `PURCHASE_ORDER`, `PURCHASE_DEBIT_NOTE`, `SUPPLIER_PAYMENT_REMITTANCE`, or `SUPPLIER_STATEMENT`.
- `DocumentType.PURCHASE_ORDER`, `PURCHASE_DEBIT_NOTE`, `SUPPLIER_PAYMENT_RECEIPT`, and `SUPPLIER_STATEMENT` already exist.
- `GeneratedDocument` and `EmailOutbox` already carry tenant, source, document, request-context, generated-document, attachment, and hashed-idempotency fields required by this arc.
- `EmailOutbox` already has `@@unique([organizationId, idempotencyKeyHash])`; no supplier relation is needed.
- `DocumentDeliveryService` already performs replay/conflict lookup before outbox creation, and customer statement delivery already computes statement data before replay and passes it into the PDF path. The supplier implementation will mirror that ordering.
- The current generic request hash includes organization, source type/id, recipient, subject, body, template type, document type, and request context, but does not yet include `sourceNumber`; the generic hash input and replay tests must be extended to include it because this arc requires the normalized source number in the hash.
- `ContactLedgerService.supplierStatementPdf` currently recomputes `supplierStatementPdfData`; it must accept an optional precomputed data object so `SupplierStatementEmailDeliveryService` can check replay/conflict before rendering and archiving a second snapshot.
- Supplier snapshot source IDs are generated by the existing private `statementSourceId("supplier-statement", contactId, data)` path and include dates, base currency, and FX evidence IDs. The delivery request context will additionally preserve normalized `from`, `to`, and `asOf`, with `to` normalized to `asOf`.
- Existing baseline tests pass after local Prisma generation: API delivery suites `4/4`, `26` tests; web delivery suites `2/2`, `5` tests.

# Compatibility Boundary

- Do not change purchase-order, purchase-debit-note, supplier-payment, or supplier-statement accounting behavior.
- Queueing a purchase order never calls `markSent` and never changes `APPROVED` or `SENT` status.
- Remittance terminology is additive UI/email wording; `DocumentType.SUPPLIER_PAYMENT_RECEIPT` and existing receipt-download behavior remain unchanged.
- Customer invoice and customer-document delivery routes, statuses, history masking, worker behavior, and tests remain green.
- Do not reuse `/contacts/:id/email-deliveries` for suppliers.
- Do not return raw recipient addresses where masking is required, bodies, PDF bytes/base64, secrets, raw provider payloads, or raw idempotency keys.
- Do not send real email, call real SMTP/providers, access hosted app/database services, deploy, mutate Vercel/Supabase, use production credentials/data, or claim production readiness.
- Existing custom roles are not broadened; Viewer and Sales-only roles do not receive supplier send permissions.
- The protected root modification is unrelated and remains untouched.

# TDD Route

- Mode: strict
- Decision: strict
- Strict authority: explicit project brief requirement: `Use TDD for every behavioral change` and `Write failing test before writing code`.
- Test posture: strict RED test, minimal GREEN implementation, focused regression after each milestone, then required full gates.
- Reason: the arc adds public API routes, permission contracts, persistence hashing, source eligibility, worker evidence, and UI behavior; each must have an executable behavior test before its implementation.
- Verification: each task below has a RED/GREEN checkpoint; no behavioral implementation is committed without its focused tests passing.

# Requirement Ready Check

- Requirement source refs: approved brief listed above; objective, scope, exclusions, safety boundary, endpoints, DTOs, permissions, source eligibility, worker invariants, frontend behavior, race proof, documentation, verification, review, and publishing rules are explicit.
- Goals and scope refs: four supplier document types only; queue/history/mock/local proof only.
- User/scenario refs: authorized user opens eligible supplier source or supplier statement, edits recipient/subject/message, queues one archived PDF, sees safe history, and can intentionally send again with a new key.
- Acceptance/verification refs: required backend tests 1-69, frontend tests 1-23, lifecycle proof, race proof, full command list, diff review, draft PR body requirements.
- Open blocker questions: none.
- Decision: ready.

# Change Necessity

- User-visible need: supplier-facing documents currently have PDF/download paths but no source-specific email queue/history workflow.
- No-change/non-code option: documentation or frontend-only wiring cannot provide tenant-scoped eligibility, hashed idempotency, archived attachments, permissions, or worker proof.
- Why code change is necessary: the missing behavior crosses Prisma enum, API orchestrators/controllers, generic hash capability, PDF precomputation, role registry, shared UI, and local proof surfaces.
- Minimum change boundary: additive template enum values; one common supplier DTO; four focused orchestrators; four route pairs; one optional supplier PDF-data parameter; narrowly generalized validation/hash/shared UI; tests/docs required by the brief.
- Decision: code-change.

# Existence Check

- Proposed new surfaces: four source orchestrators, one common DTO, one supplier-statement DTO, four source route pairs, and additive template enum values.
- Existing owner/reuse candidates: `DocumentDeliveryService`, `EmailRetryWorkerService`, `GeneratedDocumentService`, existing source PDF methods, `ContactLedgerService`, customer validation/UI, permission registry, and local worker race harness.
- Why existing surface is insufficient: no supplier source lookup/status/template orchestration, no supplier endpoints/permissions/templates, and no supplier statement precomputed-data parameter.
- Creation proof: each new orchestrator maps one source to the canonical generic service; no new queue/worker/provider/table is introduced; common DTO and shared UI remove duplication.
- Entropy/retirement impact: customer-specific validation/UI exports remain only as compatibility aliases while new source-neutral exports become canonical; no duplicate runtime owner remains.
- Decision: add-with-proof for focused orchestrators and DTOs; reuse-existing for queue, worker, archive, provider, status, suppression, and UI primitives.

# Architecture Integrity Lens

- Invariant: source-specific rules stay outside the generic delivery service; provider execution stays in the worker.
- Canonical owners: source orchestrators own eligibility/PDF/template context; `DocumentDeliveryService` owns queue/idempotency/history/attachment metadata; `EmailRetryWorkerService` owns send/claim/final update.
- Responsibility overlap risk: adding supplier rules to `DocumentDeliveryService`, copying PDF bytes into outbox, or creating supplier queue logic would violate the merged architecture.
- Higher-level simplification: extend the existing generic request hash with `sourceNumber` because all source types need it, and generalize the existing validation/UI rather than cloning customer helpers.
- Retirement/falsifier: after migration, search for duplicate supplier queue/worker/provider/table implementations and confirm only the four thin orchestrators remain.
- Verdict: proceed with the approved architecture and the minimum generic extensions described above.

# Plan Pressure Test

- Owner/contract/retirement: clear canonical owners and compatibility aliases are identified.
- Architecture integrity/higher-level path: supplier behavior is delegated through existing queue/worker/PDF/archive owners.
- Verification scope: source matrix, permissions, replay/conflict, zero provider calls, suppression, attachment integrity, UI transitions, lifecycle, race, full gates, and diff scan are explicit.
- Task executability: each milestone names exact files, tests, commands, expected proof, and commit boundary.
- Pressure result: proceed.

# Plan-Time Complexity Check

- Complexity budget: at-risk but within the approved arc; the generic delivery service, permission registry, Prisma schema, worker race harness, and shared UI are maintained high-fanout artifacts.
- Target files/artifacts: the generic hash input, `permissions.ts`, `schema.prisma`, four source modules, contact ledger PDF signature, shared delivery components, four source pages, local race test, and truth-bearing docs.
- Current pressure: source-specific behavior belongs in focused files; generic and shared files already carry customer behavior and require compatibility regression coverage.
- Better boundary: add focused orchestrator/DTO/spec files; keep generic changes limited to `sourceNumber` hashing and neutral exports; keep UI source configuration thin.
- Recommendation: add owner files for supplier services/tests, edit generic owners only for shared capabilities, and split commits by feature slice.

# Source Eligibility and PDF Matrix

| Source | Sendable status/contact | Rejected status/type | PDF owner | Existing document/source identity |
| --- | --- | --- | --- | --- |
| Purchase order | `APPROVED`, `SENT` | `DRAFT`, `PARTIALLY_BILLED`, `BILLED`, `CLOSED`, `VOIDED` | `PurchaseOrderService.pdf` | `DocumentType.PURCHASE_ORDER`, `sourceType=PurchaseOrder`, source id is PO id |
| Purchase debit note | `FINALIZED` | `DRAFT`, `VOIDED` | `PurchaseDebitNoteService.pdf` | `DocumentType.PURCHASE_DEBIT_NOTE`, `sourceType=PurchaseDebitNote`, source id is debit-note id |
| Supplier-payment remittance | `POSTED` | `DRAFT`, `VOIDED` | `SupplierPaymentService.receiptPdf` | `DocumentType.SUPPLIER_PAYMENT_RECEIPT`, `sourceType=SupplierPayment`, source id is payment id |
| Supplier statement | contact type `SUPPLIER` or `BOTH` | customer-only, missing contact, or other tenant | `ContactLedgerService.supplierStatementPdf` using authoritative `supplierStatementPdfData` | `DocumentType.SUPPLIER_STATEMENT`, `sourceType=SupplierStatement`, source id is existing `statementSourceId("supplier-statement", contactId, data)` |

Queueing never changes any source status or accounting rows. It never calls PO `markSent`, debit-note finalize/allocation/refund/reversal/void/journal paths, supplier-payment post/allocation/reconciliation/refund/journal paths, or supplier-statement accounting calculations.

# Permission Mapping

| Source | Queue permission | History permission | Default role policy |
| --- | --- | --- | --- |
| Purchase order | `purchaseOrders.send` | `purchaseOrders.view` | Owner/Admin/full access plus Accountant and Purchases; not Sales or Viewer |
| Purchase debit note | `purchaseDebitNotes.send` | `purchaseDebitNotes.view` | Owner/Admin/full access plus Accountant and Purchases; not Sales or Viewer |
| Supplier-payment remittance | `supplierPayments.send` | `supplierPayments.view` | Owner/Admin/full access plus Accountant and Purchases; not Sales or Viewer |
| Supplier statement | `contacts.sendSupplierStatements` | `contacts.view` | Owner/Admin/full access plus Accountant and Purchases; preserve existing customer-statement policy and do not add to Sales/Viewer |

Add all four to `PERMISSIONS`, `ALL_PERMISSIONS`, default-role arrays, permission matrix UI/types, normalization, and regression tests. Backend guards are authoritative; frontend visibility is only a matching convenience.

# API Route and DTO Mapping

| Method | Route | DTO | Guard |
| --- | --- | --- | --- |
| POST/GET | `/purchase-orders/:id/email-deliveries` | common supplier-document DTO | `purchaseOrders.send` / `purchaseOrders.view` |
| POST/GET | `/purchase-debit-notes/:id/email-deliveries` | common supplier-document DTO | `purchaseDebitNotes.send` / `purchaseDebitNotes.view` |
| POST/GET | `/supplier-payments/:id/email-deliveries` | common supplier-document DTO | `supplierPayments.send` / `supplierPayments.view` |
| POST/GET | `/contacts/:id/supplier-statement-email-deliveries` | supplier-statement DTO | `contacts.sendSupplierStatements` / `contacts.view` |

The common DTO is `{ recipientEmail?, subject?, message?, idempotencyKey }` with the exact length, CR/LF, safe-character, and required-key rules from the brief. The statement DTO additionally requires `asOf`, validates exact real `YYYY-MM-DD` dates, normalizes omitted `to` to `asOf`, requires `to === asOf` when supplied, rejects `from > asOf`, and includes normalized `from`, `to`, `asOf` in request context and request hashing.

Every POST sequence is: tenant-scoped source lookup; eligibility; recipient resolution; normalized subject/message; authoritative template; replay/conflict lookup; PDF generation/archive only for a new request; generic queue; immediate due `QUEUED` outbox row; safe audit; return without provider contact.

# Idempotency and Snapshot Identity

The hashed key remains organization-scoped and raw keys never persist or return. The normalized request hash will cover:

1. organization id
2. source type
3. source id
4. normalized source number
5. document type
6. email template type
7. normalized recipient
8. normalized subject
9. body text
10. normalized source request context
11. supplier-statement normalized `from`, `to`, and `asOf`

The generic service will include `sourceNumber` in both normal queue and replay hash inputs. Same-key/same-request returns the original row with `idempotentReplay=true` before PDF generation; same-key/different request throws HTTP 409 before PDF generation/outbox creation; a new key creates a new archived snapshot/history row. Supplier statement source id reuses the existing FX-aware `statementSourceId("supplier-statement", contactId, data)`; the period is also safe `sourceContextJson` metadata and participates in the hash.

# Worker Invariants and Race Requirements

Do not redesign the worker. Preserve conditional `updateMany` claim, `count === 1` send authority, tenant/status/due-time candidate selection, maximum attempts, suppression and bounce/complaint exclusion, unlocked-or-stale lock predicate, worker-token-bound final updates, attachment source/tenant/MIME/filename/size/byte-length/hash verification, bounded stale-lock recovery, redacted errors, and lock release on all paths.

Extend focused template/status/attachment/suppression tests for the four new template types. Replace or extend the local DB race fixture to use `SupplierStatement`, a marker-named disposable organization created by the test, one supplier contact, one archived PDF, and two worker instances. The test must prove exactly one claim winner, exactly one mock-provider send, exactly one verified PDF attachment, exactly one final outbox update owned by the winning worker token, no duplicate send, zero temporary `EmailOutbox`/`GeneratedDocument`/`Contact` rows, zero disposable organization rows after teardown, and PostgreSQL stopped afterward. The test is never marked complete while skipped.

# Files and Milestones

## Milestone 1 — permissions, templates, validation, schema, and generic hash

Files to create or modify:

- Modify `packages/shared/src/permissions.ts`.
- Modify `apps/api/prisma/schema.prisma`.
- Create `apps/api/prisma/migrations/20260717100000_add_supplier_document_email_templates/migration.sql` using additive `ALTER TYPE ... ADD VALUE IF NOT EXISTS` statements only.
- Create `apps/api/src/email/dto/create-supplier-document-email-delivery.dto.ts`.
- Create or modify `apps/api/src/email/document-email-delivery.validation.ts`; retain compatibility exports from `customer-document-email-delivery.validation.ts` if needed.
- Modify `apps/api/src/email/email-templates.ts` and create `apps/api/src/email/email-template-supplier-documents.spec.ts`.
- Modify `apps/api/src/email/document-delivery.service.ts` and its existing specs.
- Modify `apps/web/src/lib/permission-matrix.ts` and its tests.

TDD checkpoint: add failing permission-registry/role/default normalization tests, DTO validation tests, four template escaping/content tests, and generic hash tests showing source-number differences conflict under the same key; run the focused suites and verify RED; implement the additive values/helpers/hash; rerun focused suites and verify GREEN; commit `feat: add supplier document delivery permissions and templates`.

Expected focused commands:

```powershell
corepack pnpm --filter @ledgerbyte/shared test -- --runInBand src/permissions.test.ts
corepack pnpm --filter @ledgerbyte/api test -- --runInBand src/email/email-dto-validation.spec.ts src/email/email-template-supplier-documents.spec.ts src/email/document-delivery.service.spec.ts
corepack pnpm --filter @ledgerbyte/web test -- --runInBand src/lib/permission-matrix.test.ts
corepack pnpm --filter @ledgerbyte/api db:generate
corepack pnpm --filter @ledgerbyte/api exec prisma validate
```

## Milestone 2 — purchase-order delivery

Files to create or modify:

- Create `apps/api/src/purchase-orders/dto/create-purchase-order-email-delivery.dto.ts` only if the controller convention requires a typed subclass; otherwise import the common DTO.
- Create `apps/api/src/purchase-orders/purchase-order-email-delivery.service.ts`.
- Create `apps/api/src/purchase-orders/purchase-order-email-delivery.service.spec.ts`.
- Modify `apps/api/src/purchase-orders/purchase-order.controller.ts`, `purchase-order.module.ts`, and controller metadata tests.
- Modify `apps/api/src/purchase-orders/purchase-order-rules.spec.ts` only for delivery/status non-mutation coverage.

TDD checkpoint: RED tests cover APPROVED/SENT success, all five rejected statuses, missing recipient/override, source PDF/archive reference, zero provider calls, replay/conflict, cross-tenant access, send/view permissions, no `markSent`, and unchanged status; implement the thin orchestrator and route pair; GREEN focused service/controller/rules suites; commit `feat: queue purchase order email deliveries`.

## Milestone 3 — debit note and supplier-payment remittance delivery

Files to create or modify:

- Create `apps/api/src/purchase-debit-notes/purchase-debit-note-email-delivery.service.ts` and its spec.
- Modify `apps/api/src/purchase-debit-notes/purchase-debit-note.controller.ts`, module, and controller specs.
- Create `apps/api/src/supplier-payments/supplier-payment-email-delivery.service.ts` and its spec.
- Modify `apps/api/src/supplier-payments/supplier-payment.controller.ts`, module, and controller specs.
- Modify source rules specs only to assert no accounting/lifecycle mutation from queueing.

TDD checkpoint: RED then GREEN for FINALIZED/POSTED eligibility, rejected statuses, exact existing PDF owners/document types, remittance template wording, recipient/permission/tenant behavior, replay/conflict, zero provider calls, and no allocation/refund/reversal/post/reconcile/journal mutation; commit `feat: queue debit note and remittance deliveries`.

## Milestone 4 — supplier statement delivery and precomputed PDF data

Files to create or modify:

- Create `apps/api/src/contacts/dto/create-supplier-statement-email-delivery.dto.ts`.
- Create `apps/api/src/contacts/supplier-statement-email-delivery.service.ts`.
- Create `apps/api/src/contacts/supplier-statement-email-delivery.service.spec.ts`.
- Modify `apps/api/src/contacts/contact-ledger.service.ts` and its rules/specs to accept optional precomputed `CustomerStatementPdfData` in `supplierStatementPdf` while preserving the existing public call behavior.
- Modify `apps/api/src/contacts/contact.controller.ts`, `contact.module.ts`, and controller specs with the separate supplier route pair.
- Preserve customer statement service/controller tests and `/contacts/:id/email-deliveries`.

TDD checkpoint: RED then GREEN for SUPPLIER/BOTH, customer-only/missing/cross-tenant rejection, exact date validation/normalization, authoritative statement calculation delegation, source identity, period request context/history, replay before PDF, same-key changed-period 409, no accounting mutation, and permission mapping; commit `feat: queue supplier statement deliveries`.

## Milestone 5 — shared supplier delivery UI and source pages

Files to create or modify:

- Generalize `apps/web/src/components/email/customer-document-email-delivery-dialog.tsx`, `customer-document-email-delivery-history.tsx`, and `customer-document-email-delivery.tsx` into source-neutral behavior with compatibility exports, or add neutral files only where the current public exports cannot be safely generalized.
- Modify `apps/web/src/lib/email-deliveries.ts`, `apps/web/src/lib/types.ts`, and `apps/web/src/lib/permission-matrix.ts` as needed for supplier history, period metadata, source labels, and permissions.
- Add/modify shared UI tests in `apps/web/src/components/email/customer-document-email-delivery.test.tsx` and source-neutral tests.
- Modify `apps/web/src/app/(app)/purchases/purchase-orders/[id]/page.tsx`.
- Modify `apps/web/src/app/(app)/purchases/debit-notes/[id]/page.tsx`.
- Modify `apps/web/src/app/(app)/purchases/supplier-payments/[id]/page.tsx`.
- Modify `apps/web/src/app/(app)/suppliers/[id]/statement/page.tsx` and the actual shared `apps/web/src/components/parties/party-statement-page.tsx` owner.
- Add/modify the four route/page test files.

TDD checkpoint: RED then GREEN for status/permission visibility, supplier prefill/override, source defaults, exact endpoints/DTOs, queued-only success copy, stable retry key, double-submit prevention, new-key send-again, statement-date key reset, history/status labels, provider warning, loading/empty/error, keyboard accessibility, organization clear, and late-response suppression. Keep existing invoice/customer UI tests green; commit `feat: add supplier document delivery interface`.

## Milestone 6 — lifecycle, worker regression, and mandatory race proof

Files to create or modify:

- Create `apps/api/src/email/supplier-document-email-delivery.lifecycle.integration.spec.ts` for one mock-only supplier document lifecycle and statement changed-period replay.
- Modify `apps/api/src/email/email-retry-worker.service.spec.ts`, `email-provider-attachments.spec.ts`, `email-delivery-status.spec.ts`, and suppression/redaction specs for all four template types and generic invariants.
- Modify `apps/api/src/email/email-retry-worker.local-db.integration.spec.ts` to create/use `SupplierStatement` and prove the exact race/cleanup counts.

TDD checkpoint: RED then GREEN for queue zero provider calls, one archive, explicit worker `SENT_MOCK`, exact attachment metadata/content/hash, replay no second PDF/outbox/send, safe history, suppression before queue and after queue, provider failure/retry/max attempts, and the two-worker PostgreSQL proof. Start only local PostgreSQL, wait for health, generate/validate Prisma, run the exact Jest race command in band, remove rows and organization, stop PostgreSQL, and confirm no Compose container remains. Commit `test: prove supplier document delivery lifecycle and race`.

Race command:

```powershell
docker compose -f infra/docker-compose.yml up -d postgres
corepack pnpm --filter @ledgerbyte/api db:generate
corepack pnpm --filter @ledgerbyte/api exec prisma validate
corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand src/email/email-retry-worker.local-db.integration.spec.ts
docker compose -f infra/docker-compose.yml stop postgres
docker compose -f infra/docker-compose.yml ps
```

Use only the disposable local database URL and explicit local integration flag. The test itself must report claim winners, provider sends, attachments, final updates, winning token, and cleanup counts.

## Milestone 7 — truth-bearing docs and closure

Files to create or modify:

- Modify `docs/IMPLEMENTATION_STATUS.md`.
- Modify `docs/API_CATALOG.md`.
- Modify `docs/FRONTEND_ROUTE_CATALOG.md`.
- Modify `docs/email/EMAIL_DELIVERY_ARCHITECTURE.md`.
- Modify `docs/email/SMTP_PROVIDER_SETUP.md`.
- Create `docs/development/SME_DOCUMENT_DELIVERY_03_SPRINT_CLOSURE.md`.

Write the closure only from fresh evidence. It must include base/final/remote SHAs, source types, exact routes, permissions, eligibility, schema/migration, hash/snapshot identity, worker/concurrency counts, focused/full tests, mock-only boundary, cleanup and PostgreSQL stop evidence, independent review findings/fixes, no-real-email/hosted-access/production-data/deployment/accounting/compliance confirmations, and remaining production gates. Commit `docs: close supplier document delivery arc`.

## Milestone 8 — independent review and draft PR

Before publishing, inspect every changed file and the complete diff. Search for credentials, SMTP passwords, tokens, authorization headers, cookies, provider payloads, real addresses, PDF/base64 outbox content, raw idempotency keys, misleading `Delivered` wording, accidental `markSent`, accounting mutations, and compliance changes. Classify findings Critical/Important/Minor; fix every verified Critical/Important finding with a regression test first; rerun affected and full gates. Request independent advisory review using `requesting-code-review` with exact scope, requirements, baseline, compatibility boundary, old-owner disposition, base SHA, head SHA, and fresh evidence.

After all required verification passes, run `gh --version` and `gh auth status`, push `codex/sme-document-delivery-03`, create a draft PR against `main` with title `SME-DOCUMENT-DELIVERY-03: Extend email delivery to supplier documents`, and include the required body sections. Do not merge. Record PR URL, draft state, remote SHA, and the final/root preserved status in the closure and final report.

# Verification Commands

Run focused suites after each milestone. Before completion, run exactly these local commands, adapting only for current package scripts:

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
git status --short
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

Use local placeholder or local Compose database URLs only. Never load the root `.env` hosted values into a test command. Do not run deployment, hosted migrations, hosted proof, real SMTP, provider calls, or production commands.

# Risks and Rollback

- Generic hash change risk: source-number inclusion could change replay semantics; cover customer and supplier regression cases and retain the existing unique hash constraint.
- Prisma enum migration risk: use additive values only and validate on disposable local PostgreSQL.
- PDF archive risk: precomputed supplier statement data must be passed only to rendering/archive; it must not alter statement math.
- Permission risk: test exact role arrays and custom-role non-broadening; frontend gates do not replace backend guards.
- UI race risk: clear history on organization/source change and ignore previous tokens; test delayed responses.
- Worker risk: preserve the atomic claim and winning-token predicate; prove with real local PostgreSQL rather than mocks alone.
- Rollback surface: revert the arc commits in reverse order; existing customer routes, queue records, enum values, and generic delivery fields remain compatible because no existing enum is renamed/removed and no existing table is replaced.

# Retirement

- Old customer-named validation/UI exports: retain only as compatibility aliases while neutral implementations become canonical; remove aliases only in a separately approved cleanup after all customer consumers migrate.
- Existing AP generated-document email flow: retain unchanged because it is out of this arc's source-specific queue contract and remains a separate read/send permission path.
- Existing supplier PDF download and accounting actions: retain unchanged; this arc adds communication orchestration only.
- No duplicate supplier queue, worker, provider, suppression, idempotency, or PDF-byte path is allowed. Diff review and repository search must confirm this before the completion claim.

# Execution Readiness View

- Intent lock: implement only the approved four supplier document delivery workflows and their required evidence/docs/PR.
- Scope fence: exclude bills, refunds, expenses, receipts, returns, bulk/reminders/scheduled sending, portals, payment initiation, bank/providers, compliance, deployment, and hosted services.
- Baseline lock: start from `origin/main` SHA `3f5c31bc0ad96b3af2deba1348f55b7cead84888`; preserve root `BANK_STATEMENT_IMPORT_PROOF_REVIEW.md` exactly.
- Approved behavior: queue-only HTTP request, archived PDF reference, worker provider execution, truthful history/status, new-key intentional resend.
- Owner/contract constraints: thin source orchestrators; generic queue/hash; existing PDF/archive; existing worker/provider; shared UI.
- Compatibility boundary: customer delivery, download paths, accounting statuses/journals, permissions outside supplier send, ZATCA/UAE FTA, and hosted safety remain unchanged.
- Retirement boundary: compatibility aliases only; no destructive deletion of persistent data or existing customer paths.
- Task batches: milestones 1-4 backend/schema, milestone 5 UI, milestone 6 lifecycle/race, milestone 7 docs, milestone 8 review/publish.
- Test obligations: strict RED/GREEN for each behavior, focused suites per milestone, mandatory local PostgreSQL race, full gates, diff scan.
- Review gates: plan self-review, per-milestone focused tests, lifecycle/race proof, independent complete-diff review, final verification, draft PR only.
- Drift/rewind rules: if a dependency/content gate, scope boundary, or architecture invariant fails, stop that slice and report the exact failure; do not redesign or broaden scope.
- Evidence required before completion: final SHA, remote SHA, draft PR URL, test counts/results, race counts/cleanup/stop result, review findings/fixes, and all safety confirmations.
- Advisory boundary: this readiness view is execution guidance only, not a gate decision or completion authority.

# Plan Self-Review

- Spec coverage: all four source types, DTOs, endpoint pairs, eligibility, templates, permissions, idempotency inputs, tenant/attachment/worker invariants, lifecycle, race, UI, documentation, verification, review, and publishing are mapped to tasks or explicit boundaries.
- Placeholder scan: no unfinished-work marker or unbounded implementation instruction is present.
- Type consistency: common DTO, statement DTO, `DocumentDeliveryService` source-number hash input, optional supplier PDF data, history period metadata, and shared UI config are named consistently.
- Compatibility: customer route remains separate; existing document types/PDF downloads/worker/provider/permissions are preserved; only additive enum values are planned.
- Scope drift check: no excluded accounting, compliance, hosted, provider, portal, bulk, reminder, or deployment behavior is included.
- Verification: focused RED/GREEN gates, full commands, mock lifecycle, and mandatory PostgreSQL race with cleanup/stop are explicit.
- Complexity/ownership: source-specific rules are in four focused services; generic changes are limited to capabilities shared by all sources; shared UI is generalized rather than cloned.
- Retirement: old compatibility aliases and unchanged AP/download paths have explicit retention reasons and triggers.
- Readiness decision: plan is execution-ready in the isolated worktree; implementation may begin only after this plan is saved and committed.
