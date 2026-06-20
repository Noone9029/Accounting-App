# OpenBooks Adoption Next Goals

Date: 2026-06-20

This roadmap starts after PR #89 through PR #95 were merged into `main` at:

`a8ebc9e6d039c52675135fa77bc1eb838c00a70d`

The next work should continue as narrow LedgerByte-native clean-room slices. Provider, storage, and compliance work stays separate.

## Guardrails

- Do not copy OpenBooks code, schemas, comments, file structure, implementation details, dependencies, or production source text.
- Do not add OpenBooks references to production source.
- Keep each slice LedgerByte-native.
- Do not claim production compliance.
- Do not touch ZATCA, UAE, Peppol, ASP/provider integration, generated-document object storage, signed URLs, Vercel deployment behavior, Supabase, or hosted services unless a separate approved goal explicitly scopes that work.
- Keep generated-document object storage and signed URLs blocked until separately approved and proven.

## Goal 10: Archetype-Aware Setup Guidance Copy

Scope: frontend-only, no persistence.

Recommended outcome:

- Add LedgerByte-native guidance copy driven by existing typed onboarding/profile metadata.
- Keep selected archetype state ephemeral.
- Do not add API, database, Prisma migration, localStorage, cookies, URL persistence, Inbox, AI, report-pack, integration-health, provider, storage, or compliance behavior.

## Goal 11: Typed Onboarding Persistence Design Only

Scope: docs/API/schema design only, no migration.

Recommended outcome:

- Design the future typed onboarding persistence model.
- Define API boundaries, schema concepts, privacy/security concerns, audit events, and migration risks.
- Do not implement Prisma schema changes, migrations, API routes, UI persistence, or runtime state.

## Goal 12: Setup Checklist Persistence Implementation

Scope: implementation only after Goal 11 design approval.

Recommended outcome:

- Add local/test-safe API and persistence for setup checklist state after design approval.
- Keep persistence auditable and tenant-scoped.
- Do not include Inbox, AI, provider, storage, signed URL, or compliance production behavior.

## Goal 13: Exception Inbox Design Plan

Scope: docs/API/schema design only.

Recommended outcome:

- Design the Exception Inbox domain model, API boundaries, audit events, permissions, statuses, and operational risks.
- Keep AI out of scope.
- Do not implement DB/API/UI runtime behavior in this design goal.

## Goal 14: Inbox DB/API Foundation

Scope: local/test-safe DB/API foundation.

Recommended outcome:

- Implement the approved Inbox persistence and API foundation.
- Include tenant isolation, permissions, audit-safe mutations, and focused tests.
- No AI proposal behavior yet.

## Goal 15: Inbox UI And Audit-Safe Actions

Scope: Inbox UI and explicit operator actions.

Recommended outcome:

- Add UI for Inbox list/detail/action workflows backed by the approved API.
- Keep actions explicit, auditable, and deterministic.
- No AI proposal behavior yet.

## Goal 16: Deterministic Bookkeeping Pipeline Design

Scope: docs/service design only.

Recommended outcome:

- Design the deterministic bookkeeping pipeline service boundary, inputs, outputs, audit events, idempotency rules, and failure modes.
- Do not implement runtime posting behavior in this design goal.

## Goal 17: AI Proposal Boundary Design

Scope: docs/security/threat model only.

Recommended outcome:

- Define the future AI proposal boundary, permissions, review requirements, auditability, data minimization, prompt/data handling, and threat model.
- Keep AI non-authoritative and operator-approved.
- Do not implement AI runtime behavior.

## Separate Workstreams

The following work remains separate from Goals 10 through 17:

- Generated-document object storage approval and implementation.
- Signed URL design and implementation.
- Real object storage proof.
- UAE/ZATCA/Peppol/ASP/provider production readiness.
- Hosted deployment, Supabase, Vercel, and production infrastructure behavior.
- Production compliance claims or certification evidence.
