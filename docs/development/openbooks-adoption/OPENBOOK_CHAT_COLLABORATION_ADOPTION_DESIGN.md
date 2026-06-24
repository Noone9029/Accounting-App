# OpenBook Chat Collaboration Adoption Design

Date: 2026-06-21

OpenBook source: `muhammad-fiaz/OpenBook` at `437406a81e34eeee8c5e7022e2d3211ad2ecf149`

## Scope

Design only.

Chat and collaboration are optional discussion surfaces, not audit logs or accounting evidence.

No Prisma schema, migration, API endpoint, UI route, realtime service, notification send, accounting mutation, provider call, hosted mutation, storage behavior, or compliance claim is added by this design.

This slice records the LedgerByte-native boundaries for a future collaboration workflow inspired by OpenBook's product shape. It intentionally does not change runtime behavior.

## Source Use

No OpenBook source copied.

No OpenBook schema, action, component, route, text, migration, or utility is copied, translated, vendored, imported, or ported.

The OpenBook repository was inspected only for behavior-level product concepts:

- Direct, group, and team conversations.
- Membership-scoped rooms.
- Message send, delete, hide, clear, leave, and room delete actions.
- Conversation listing and search.
- Member selection for creating discussions.

These concepts are treated as MIT-licensed product inspiration. Any future source-level reuse must be small, reviewable, attributed, and listed in LedgerByte's third-party source inventory before it lands.

## LedgerByte Product Fit

Internal collaboration can help LedgerByte users discuss operational work without changing accounting state. Good candidate contexts include:

- Invoice, quote, bill, and payment review.
- Banking exception triage.
- Generated-document review.
- Inventory variance investigation.
- Onboarding task handoffs.
- Support and accountant handoffs.

LedgerByte audit logs, journal lines, source documents, and approved evidence packages remain the authoritative records.

Collaboration must stay subordinate to those systems. A message can point to a business entity, but it cannot certify, approve, reverse, post, transmit, or replace the entity.

## Required Guardrails

Collaboration messages must never store secrets, raw provider payloads, customer document bodies, compliance credentials, OTPs, private keys, access tokens, or generated-document source bodies.

Messages are not audit evidence. They can explain a discussion but cannot replace LedgerByte audit events, approval records, source documents, generated-document records, or accounting entries.

Deleting, hiding, clearing, or archiving messages must not delete audit events, journal lines, business records, generated documents, storage objects, provider evidence, or approval packages.

Collaboration must never automatically post journals, finalize invoices, allocate payments, certify reports, mutate generated documents, send provider payloads, change compliance package state, mutate storage keys, or generate signed URLs.

Future APIs must validate organization membership, tenant scope, target-entity ownership, and route-level permissions before any read or write.

Future message mutations must be permission-checked, rate-limited, and auditable as collaboration events only. Collaboration events must not replace existing LedgerByte audit logs.

User-authored text must be treated as untrusted. Future implementations need length limits, sanitization, redaction for sensitive references, and predictable rendering in web and export surfaces.

Retention, export, and deletion rules must be defined separately from accounting records and compliance evidence. Collaboration retention cannot weaken retention requirements for authoritative records.

## Future Interfaces

Future implementation PRs should define LedgerByte-owned interfaces before adding runtime behavior:

- `CollaborationThreadSummary`: thread id, organization id, display title, linked entity preview, participant count, unread count, last-message preview, archived state, and timestamps.
- `CollaborationMessageSummary`: message id, thread id, author summary, sanitized body preview, edited/deleted state, visibility for current user, and timestamps.
- `CollaborationParticipantSummary`: user id, display name, role summary, membership state, and notification preference.
- `CollaborationEntityLink`: entity type, entity id, display label, route key, tenant ownership proof, and permission predicate.
- `CollaborationReadiness`: explicit feature flag, retention policy state, export policy state, and guardrail validation state.

Candidate mutations for later PRs:

- Create a thread.
- Add or remove participants.
- Send, edit, delete, or hide a message.
- Link or unlink a LedgerByte entity.
- Export a thread.
- Archive a thread.

## Implementation Sequence

1. Schema design PR with relationships, retention semantics, permission predicates, and no migration.
2. Schema foundation PR with migration, indexes, and tenant isolation tests.
3. Read-only API PR for listing threads and messages behind a disabled-by-default feature flag.
4. Thread and message mutation API PR with permission, tenant isolation, rate-limit, sanitization, and audit tests.
5. Entity linking PR for invoices, quotes, bills, banking exceptions, generated documents, inventory variances, and onboarding tasks.
6. Notification PR limited to local in-app notifications unless separate approval allows email or provider sends.
7. Web UI PRs for list, thread, compose, participants, linked-entity preview, empty, loading, and error states.
8. Export and retention PR with explicit policy tests and no weakening of authoritative record retention.

## Test Plan

Future runtime work must include focused checks for:

- Tenant isolation across organizations.
- Permission filtering for thread, message, participant, and entity-link reads.
- Permission checks for all mutations.
- Sensitive-content redaction and length enforcement.
- Membership changes and participant removal.
- Collaboration event audit coverage.
- Retention and export behavior.
- Web loading, empty, error, mobile, and keyboard states.
- Clean source attribution if any OpenBook chunk is reused.

## Current Slice Evidence

- Runtime behavior: no.
- OpenBook source copied: no.
- Hosted mutation: no.
- Provider call or send: no.
- Storage behavior: no.
- Accounting mutation: no.
- Generated-document mutation: no.
- Compliance claim: no.
- Realtime service: no.

## Next Recommended Slice

After this design is reviewed, the next narrow slice should be a schema design PR for LedgerByte collaboration threads and messages. It should define entity relationships, retention semantics, tenant boundaries, and permissions without applying a migration or adding runtime endpoints.
