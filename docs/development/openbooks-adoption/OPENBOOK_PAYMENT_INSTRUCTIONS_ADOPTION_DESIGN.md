# OpenBook Payment Instructions Adoption Design

Date: 2026-06-21

OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`

## Scope

Design only.

Payment instructions are document-display metadata, not payment execution, bank-transfer posting, payment-gateway integration, provider onboarding, or settlement proof.

No Prisma schema, migration, API endpoint, UI route, payment provider call, bank transfer, email send, hosted mutation, storage behavior, generated-document mutation, accounting mutation, or compliance claim is added by this design.

This slice captures how LedgerByte can adopt the useful OpenBook settings pattern for invoice defaults and payment instructions without weakening LedgerByte's accounting, audit, tenant, document, and provider boundaries.

## Source Use

No OpenBook source copied.

No OpenBook schema, action, component, route, validation, text, migration, or utility is copied, translated, vendored, imported, or ported.

The OpenBook repository was inspected only for behavior-level product concepts:

- Invoice default terms and notes.
- Invoice number prefix configuration.
- Organization payment methods that can be displayed on invoices.
- Bank-transfer, wallet, payment-link, and other instruction types.
- A default payment method flag for future documents.
- Settings grouping for data management and document defaults.

LedgerByte already has stronger primitives for document settings, number sequences, bank account profiles, payment allocations, and audit logs. Future work should adapt the useful product shape to those existing primitives rather than importing OpenBook's simplified model.

## LedgerByte Product Fit

LedgerByte should eventually support reusable payment-instruction templates for sales documents. The safe product value is faster document preparation and clearer customer-facing instructions, not automatic settlement.

Good candidate surfaces:

- Sales invoices.
- Sales quotes that may later become invoices.
- Recurring invoice templates.
- Customer statements.
- Generated PDF preview data.

LedgerByte bank account profiles, journal entries, payment allocations, audit logs, generated documents, and approved evidence packages remain the authoritative records.

Payment instructions can reference a bank or cash profile for display, but they must not post transfers, create receipts, allocate payments, mark invoices paid, call payment gateways, or prove settlement.

## Required Guardrails

Payment instruction records must never store secrets, full card numbers, online banking credentials, access tokens, private keys, OTPs, provider webhook secrets, raw provider payloads, customer document bodies, or generated-document source bodies.

Instruction fields should store only display-safe text such as a label, masked account reference, beneficiary name, masked IBAN or last four digits when applicable, branch or bank display name, currency, and short customer-facing instructions.

Payment links must be treated as untrusted text until a later provider-specific review exists. They must not imply provider setup, settlement, payment collection, charge authorization, webhooks, refunds, dispute handling, or reconciliation automation.

Future APIs must validate organization membership, tenant scope, target bank profile ownership, target document ownership, and document-settings permissions before any read or write.

Future mutations must write audit events that capture safe metadata only: instruction id, label, type, default flag changes, linked bank profile id, and before/after display fields after redaction. Audit logs must not store raw secrets or customer document bodies.

Document rendering must snapshot the selected display text into future generated-document data only through explicit document generation paths. Updating a payment instruction must not mutate already generated documents.

Default invoice terms and notes must remain separate from number sequences. Prefix, padding, and next-number changes stay under the existing number sequence model and cannot be replaced by a free-form invoice-prefix setting.

Deleting or disabling a payment instruction must not delete bank profiles, payment records, journal entries, generated documents, audit logs, provider evidence, storage objects, or historical document snapshots.

## Future Interfaces

Future implementation PRs should define LedgerByte-owned interfaces before adding runtime behavior:

- `PaymentInstructionSummary`: instruction id, organization id, label, type, active state, default state, display-safe preview, linked bank profile summary, and timestamps.
- `PaymentInstructionDetail`: editable display fields, linked bank profile id, supported document scopes, redaction state, and audit metadata.
- `DocumentDefaultSummary`: default terms, default notes, default payment instruction id, supported document scopes, and updated actor/timestamp.
- `PaymentInstructionRenderSnapshot`: immutable display-safe fields copied into a generated-document render request.
- `PaymentInstructionReadiness`: feature flag, permission state, redaction validation, linked-profile validation, and document-snapshot behavior.

Candidate mutations for later PRs:

- Create, update, disable, or delete a payment instruction.
- Set or clear the default payment instruction for future sales documents.
- Save default terms and notes for future sales documents.
- Select an instruction on a draft invoice, quote, recurring invoice template, or statement.
- Snapshot selected display text during explicit document generation.

## Implementation Sequence

1. Schema design PR with no migration, covering payment-instruction templates, document default settings, redaction rules, linked bank profile behavior, and generated-document snapshot semantics.
2. Schema foundation PR with migration, tenant indexes, linked bank profile constraints, and no runtime route exposure.
3. Read-only API PR for listing instruction summaries behind existing document-settings permissions.
4. Mutation API PR with tenant isolation, permission, audit, redaction, and no provider/payment/accounting side-effect tests.
5. Sales document draft selection PR for invoices and quotes, with no generated-document mutation outside explicit save or generate actions.
6. Generated-document snapshot PR that copies display-safe fields at generation time and proves historical documents do not change when templates change later.
7. Web settings PR for instruction management, empty states, disabled states, validation errors, and linked bank profile previews.
8. Web sales document PR for selecting the default or overriding it per draft.

## Test Plan

Future runtime work must include focused checks for:

- Tenant isolation across organizations.
- Permission filtering for reads and mutations.
- Linked bank profile ownership and inactive-profile behavior.
- Redaction of account, link, token, and credential-like fields.
- Audit logging with safe metadata only.
- No payment provider, bank-transfer, email, storage, generated-document, or accounting side effects from settings changes.
- Generated-document snapshot immutability after instruction changes.
- Number sequence separation for invoice and quote numbering.
- Web empty, loading, disabled, invalid, and mobile states.
- Clean source attribution if any OpenBook chunk is reused.

## Current Slice Evidence

- Runtime behavior: no.
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

After this design is reviewed, the next narrow slice should be a schema design PR for payment-instruction templates and document defaults. It should define tenant ownership, linked bank profile semantics, redacted display fields, default selection, and generated-document snapshot behavior without applying a migration or adding runtime endpoints.
