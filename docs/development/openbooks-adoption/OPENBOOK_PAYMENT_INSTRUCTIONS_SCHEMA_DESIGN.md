# OpenBook Payment Instructions Schema Design

Date: 2026-06-21

OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`

## Scope

Schema design only.

No Prisma schema change, migration, generated Prisma client, API endpoint, UI route, payment provider call, bank transfer, hosted mutation, storage behavior, generated-document mutation, accounting mutation, or compliance claim is added by this design.

This is the contract for a future LedgerByte-native schema that can support OpenBook-style invoice defaults and payment instructions without adopting OpenBook's simpler settings/payment-method model.

## Source Use

No OpenBook source copied.

No OpenBook schema, action, component, route, validation, text, migration, or utility is copied, translated, vendored, imported, or ported.

The OpenBook repository was inspected only for product concepts: reusable invoice defaults, payment methods, display instructions, default selection, and settings grouping. The future LedgerByte implementation must use LedgerByte-owned names, fields, validation, permissions, audit events, and migrations.

## Existing LedgerByte Fit

The schema must fit current LedgerByte primitives:

- `OrganizationDocumentSettings` controls document rendering options such as titles, footer text, colors, notes, terms, tax number display, and payment summary display.
- `NumberSequence` controls document numbering and already audits future-numbering changes.
- `BankAccountProfile` stores tenant-owned bank/cash profile metadata linked to posting asset accounts.
- `SalesInvoice`, `SalesQuote`, and `RecurringInvoiceTemplate` already store per-document `notes` and `terms`.
- `GeneratedDocument` archives explicit document outputs and must not be silently rewritten by settings changes.
- `AuditLog` records safe metadata for administrative and accounting mutations.

LedgerByte bank account profiles, journal entries, customer payment allocations, supplier payment allocations, audit logs, generated documents, and approved evidence packages remain the authoritative records.

Payment instructions remain display metadata and must not create, post, allocate, settle, transmit, reconcile, archive, or certify anything.

Number sequences remain the only source for invoice, quote, receipt, statement, and payment numbering.

Generated-document snapshots must be immutable after the explicit document generation action stores them.

## Proposed Models

The future schema should add `PaymentInstructionTemplate`, `OrganizationDocumentDefault`, and `PaymentInstructionRenderSnapshot` only after a migration PR is explicitly approved.

### `PaymentInstructionTemplate`

Purpose: reusable tenant-owned display instructions that can be selected on future sales documents.

Proposed fields:

- `id`: UUID primary key.
- `organizationId`: required tenant owner, indexed.
- `label`: required display label, unique per active organization after trimming and case normalization.
- `type`: enum, initially `BANK_PROFILE`, `MANUAL_BANK_TRANSFER`, `PAYMENT_LINK_TEXT`, `OTHER_TEXT`.
- `status`: enum, `ACTIVE` or `DISABLED`.
- `isDefault`: boolean, at most one active default per organization and supported document scope.
- `bankAccountProfileId`: nullable link to `BankAccountProfile` when `type` is `BANK_PROFILE`.
- `currency`: optional display currency, validated against LedgerByte supported currencies when provided.
- `displayBeneficiaryName`: optional safe text.
- `displayBankName`: optional safe text.
- `displayAccountReference`: optional masked reference only.
- `displayIbanOrRoutingReference`: optional masked reference only.
- `instructions`: optional short display text.
- `metadata`: JSON for future display-safe fields only.
- `createdById`, `updatedById`, `createdAt`, `updatedAt`, `disabledAt`.

Required constraints:

- `organizationId` must match the linked `BankAccountProfile.organizationId`.
- A linked bank profile must be active when selected by a new document unless a later design explicitly allows historical disabled profiles for unchanged snapshots.
- Full account numbers, card numbers, online banking credentials, access tokens, OTPs, private keys, webhook secrets, raw provider payloads, customer document bodies, and generated-document source bodies must not be stored.
- Default selection must be concurrency-safe. Prefer a partial unique index for one active default per organization and document scope where supported by the database migration.

### `OrganizationDocumentDefault`

Purpose: tenant defaults for future documents, separate from presentation settings and number sequences.

Proposed fields:

- `id`: UUID primary key.
- `organizationId`: required tenant owner.
- `documentScope`: enum, initially `SALES_INVOICE`, `SALES_QUOTE`, `RECURRING_INVOICE_TEMPLATE`, `CUSTOMER_STATEMENT`.
- `defaultTerms`: optional text copied into new drafts only.
- `defaultNotes`: optional text copied into new drafts only.
- `defaultPaymentInstructionTemplateId`: nullable link to `PaymentInstructionTemplate`.
- `createdById`, `updatedById`, `createdAt`, `updatedAt`.

Required constraints:

- Unique `(organizationId, documentScope)`.
- Linked payment instruction must belong to the same organization.
- Terms and notes defaults must not mutate existing documents.
- Invoice and quote prefixes must not be stored here because numbering belongs to `NumberSequence`.

### `PaymentInstructionRenderSnapshot`

Purpose: immutable display-safe payment instruction snapshot associated with an explicit document render or generated-document archive.

Proposed fields:

- `id`: UUID primary key.
- `organizationId`: required tenant owner.
- `sourceType`: enum, initially `SALES_INVOICE`, `SALES_QUOTE`, `RECURRING_INVOICE_TEMPLATE`, `CUSTOMER_STATEMENT`.
- `sourceId`: required source document id.
- `paymentInstructionTemplateId`: nullable source template id.
- `generatedDocumentId`: nullable link to `GeneratedDocument` after archive creation.
- `label`, `type`, `currency`, `displayBeneficiaryName`, `displayBankName`, `displayAccountReference`, `displayIbanOrRoutingReference`, `instructions`: copied display-safe values.
- `createdById`, `createdAt`.

Required constraints:

- Snapshot rows are append-only by service convention. No update path should alter display fields after creation.
- Snapshot creation happens only during explicit save, render, or generate actions approved by the relevant document workflow.
- Template updates must not rewrite existing snapshots or generated documents.
- Snapshot data must be safe for PDF rendering and archive metadata review.

## Permission And Audit Contract

Future APIs should use existing document settings permissions unless a later RBAC design introduces a more specific permission:

- Read summaries: `documentSettings.view`.
- Create/update/disable/delete templates: `documentSettings.manage`.
- Save document defaults: `documentSettings.manage`.
- Select a template on a document draft: the existing create/update permission for that document type.
- Generate or download documents: existing generated-document and source-document permissions.

Audit events should be safe metadata only:

- `PAYMENT_INSTRUCTION_TEMPLATE_CREATED`
- `PAYMENT_INSTRUCTION_TEMPLATE_UPDATED`
- `PAYMENT_INSTRUCTION_TEMPLATE_DISABLED`
- `PAYMENT_INSTRUCTION_TEMPLATE_DEFAULT_CHANGED`
- `ORGANIZATION_DOCUMENT_DEFAULT_UPDATED`
- `PAYMENT_INSTRUCTION_RENDER_SNAPSHOT_CREATED`

Audit payloads must include ids, labels, type, default flags, linked bank profile id, document scope, and redacted display fields only. They must not include secrets, raw provider payloads, document bodies, PDF bytes, or generated-document source bodies.

## Migration Guardrails

A future migration PR must prove:

- All new tables include `organizationId` indexes.
- Linked records are tenant scoped in service code before write.
- Unique default behavior is concurrency-safe.
- Redaction validation rejects secret-like fields before persistence.
- Deleting or disabling templates does not cascade into bank profiles, payments, journals, generated documents, audit logs, or historical snapshots.
- No automatic provider, bank-transfer, email, storage, generated-document, compliance, or accounting side effects exist.

## Future Test Plan

Future runtime work should add focused tests for:

- Tenant isolation for templates, defaults, and snapshots.
- Permission checks for read and manage paths.
- Same-tenant bank profile linking.
- Active/inactive bank profile selection rules.
- Redaction of account numbers, credential-like text, provider payloads, and document bodies.
- One-default-per-scope behavior under concurrent updates.
- Terms and notes copied only into new drafts.
- Number sequence separation from document defaults.
- Snapshot immutability after template updates.
- No payment provider call, bank transfer, email send, storage write, generated-document rewrite, or accounting mutation from template/default changes.

## Current Slice Evidence

- Runtime behavior: no.
- Prisma schema change: no.
- Migration: no.
- OpenBook source copied: no.
- Hosted mutation: no.
- Payment provider call: no.
- Bank transfer: no.
- Email send: no.
- Storage behavior: no.
- Accounting mutation: no.
- Generated-document mutation: no.
- Compliance claim: no.

## Next Recommended Slice

After this schema design is reviewed, the next narrow slice should add Prisma schema models and a migration for `PaymentInstructionTemplate` and `OrganizationDocumentDefault` only. It should not expose API endpoints or UI routes, and it should include migration-level indexes plus service-free schema validation notes.
