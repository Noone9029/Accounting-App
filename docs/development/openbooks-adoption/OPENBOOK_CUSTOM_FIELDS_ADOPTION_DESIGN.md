# OpenBook Custom Fields Adoption Design

Date: 2026-06-21

OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`

## Scope

Design only

This slice records a LedgerByte-native adoption design for optional custom fields. Custom fields are optional metadata extensions, not accounting truth. They can help customers tag contacts, sales documents, payments, transactions, projects, and operational workflows, but they must not become an unreviewed path for accounting, generated-document, provider, storage, tax, or compliance state.

No Prisma schema, migration, API endpoint, UI route, generated-document mutation, accounting mutation, provider call, hosted mutation, storage behavior, or compliance claim is added by this design.

## Source Use

- No OpenBook source copied.
- No OpenBook schema, action, component, route, SQL, text, dependency, file name, or implementation structure is copied, translated, vendored, imported, or ported.
- The source repo was inspected only to identify product concepts: organization-scoped custom field definitions, field types, entity scoping, ordered display, default values, option lists, and per-entity values.
- OpenBook is MIT licensed at the inspected commit, but this slice uses behavior-level inspiration only.

## LedgerByte Product Fit

LedgerByte already has strong typed domain models for accounting, documents, inventory, banking, email, storage proof, and compliance planning. Custom fields should sit beside those models as user-defined metadata, not inside the core accounting rules.

Recommended future entity families:

- Contacts: customer/supplier grouping, account manager, onboarding stage, internal reference.
- Sales documents: sales invoice, quote, credit note, delivery note, recurring template metadata.
- Purchase documents: purchase order, purchase bill, debit note, purchase receipt metadata.
- Payments and banking: internal reconciliation tags and customer/supplier remittance references.
- Inventory operations: warehouse, item, receipt, stock issue, adjustment, transfer, and variance proposal tags.
- Projects and time tracking: future optional domain metadata after the project/time design is approved.

LedgerByte journal lines, source documents, and approved settings remain the authoritative accounting and compliance sources.

## Required Guardrails

- Custom-field values must never store secrets, raw provider payloads, customer document bodies, compliance credentials, OTPs, private keys, or access tokens.
- Custom fields must not override account mappings, VAT/tax treatment, fiscal-lock status, document status, inventory valuation, generated-document content, provider delivery state, storage object keys, signed URLs, or compliance readiness.
- Any future schema must keep definitions tenant-scoped and values tenant-scoped through the target entity.
- Any future API must validate entity ownership before reading or writing values.
- Any future mutation must be permission-checked, audited, idempotency-safe where bulk updates exist, and explicit.
- Required custom fields must not block statutory or accounting corrections unless a separately approved workflow proves that behavior.
- Export behavior must respect existing role permissions, tenant boundaries, retention rules, and redaction rules.
- Field labels, options, and values must be length-limited and rendered as untrusted user content.

## Future Field Types

Recommended first pass:

- Text: short user-defined label or identifier.
- Long text: internal notes only, length-limited and excluded from sensitive generated-document surfaces by default.
- Number: non-accounting operational quantity or score.
- Date: operational milestone date.
- Boolean: yes/no classification.
- Select: single option from an organization-owned option set.
- Multi-select: bounded list of options from an organization-owned option set.
- URL: optional reference link, validated and rendered safely.

Deferred field types:

- File attachment fields, because storage and retention rules need a separate proof path.
- Formula fields, because they can imply accounting calculations.
- Lookup fields across tenants or unrelated entities.
- Secret fields, because LedgerByte should use dedicated custody mechanisms instead.
- Rich text fields, because they increase sanitization and generated-document leakage risk.

## Future Interfaces

Recommended read models:

- `CustomFieldDefinitionSummary`: id, entity family, key, label, field type, required flag, active flag, display order, option summaries, created and updated metadata.
- `CustomFieldValueSummary`: definition id, entity id, normalized display value, validation status, and redaction status.
- `CustomFieldEntityEnvelope`: target entity summary plus visible custom field values for the current user.
- `CustomFieldReadiness`: disabled/enabled state, supported entity families, blocked reasons, redaction guarantees, and implementation evidence status.

Recommended mutation boundaries:

- Create/update/archive definition: administrator-only, tenant-scoped, audited.
- Reorder definitions: administrator-only, tenant-scoped, audited.
- Set entity values: entity-edit permission plus custom-field permission, tenant-scoped, audited.
- Bulk import values: future design only; must include dry-run, row-level validation, and rollback-safe batches.
- Export values: read-only export path with redaction and permission checks.

## Implementation Sequence

1. Schema design PR: define definition/value boundaries, supported entity families, type validation, and redaction rules without applying a migration.
2. Schema foundation PR: add additive Prisma schema and migration after design review.
3. Read-only API PR: list definitions and entity values with tenant isolation and permission tests.
4. Definition management PR: create/update/archive/reorder definitions with audit logging.
5. Entity value PR: set values on a small first entity family, such as contacts, with ownership and permission tests.
6. Export/readiness PR: read-only export and readiness surfaces with redaction guarantees.
7. UI PRs: settings management, entity-detail display, and inline value editing.
8. Bulk import PR: separate dry-run-first design and implementation only after single-entity behavior is proven.

## Test Plan For Future PRs

- API tests for tenant isolation across definitions, values, target entities, and exports.
- Permission tests for definition administration, entity value editing, read-only display, and exports.
- Audit tests for every create/update/archive/reorder/value mutation.
- Validation tests for field type coercion, required flags, option limits, length limits, and unsupported entity families.
- Redaction tests proving secrets, raw provider payloads, document bodies, compliance credentials, OTPs, private keys, and access tokens are rejected or never rendered.
- Web tests for empty, loading, error, permission-blocked, field-management, entity-detail, and export states.
- Clean-room validation for every OpenBook adoption PR.

## Current Slice Evidence

- Runtime behavior changed: no.
- Source copied: no.
- Hosted mutation: no.
- Provider call: no.
- Storage behavior changed: no.
- Accounting behavior changed: no.
- Generated-document behavior changed: no.
- Compliance or authority workflow changed: no.

## Next Recommended Slice

Add a chat/collaboration adoption design PR that keeps internal discussion separate from audit logs, accounting evidence, compliance evidence, provider payloads, and generated-document records.
