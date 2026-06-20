# Typed Onboarding Persistence Design

## Executive Summary

This document is a design-only plan for future persistence of typed onboarding profile selection and setup checklist state in LedgerByte.

It defines the intended domain model, future API boundaries, state machines, versioning strategy, tenancy/security requirements, and acceptance criteria for a later implementation. It does not add persistence, migrations, API modules, runtime behavior, or UI state persistence.

## Current Baseline

LedgerByte started with a frontend/helper baseline for typed onboarding:

- Typed onboarding metadata defines LedgerByte-native business archetypes and setup checklist templates.
- Selector/default helpers provide safe preview defaults, selector options, invalid-value fallback, and preview summary counts.
- The setup checklist preview renders archetype-aware checklist templates.
- Archetype-aware guidance copy explains active, planned, and blocked setup guidance for the selected archetype.
- The schema foundation adds persisted profile/checklist/checklist-item/event groundwork.
- The service foundation adds local onboarding profile/checklist domain behavior.
- The setup wizard API consumption slice starts UI consumption of the typed onboarding API for selected archetype and checklist state.
- Full typed onboarding remains partial.

## Implementation Status

As of the typed onboarding persistence schema foundation PR, LedgerByte has started the persistence implementation with additive Prisma schema and migration groundwork for onboarding profiles, checklists, checklist items, checklist events, and template version tracking.

As of the typed onboarding API/service foundation PR, LedgerByte has also started the local service/domain foundation for persisted onboarding profile and checklist state. The service layer covers explicit actor context, organization and optional branch scoping, selected-archetype validation, checklist generation/recompute, item complete/skip/reopen transitions, blocked-item fail-closed behavior, and onboarding checklist event records.

As of the setup wizard typed onboarding API consumption PR, LedgerByte has started consuming the service foundation from the setup wizard preview through a narrow controller/client path. The setup wizard can load saved typed onboarding profile/checklist state, save selected archetype changes through the API, and refresh checklist preview state from API recompute results.

This remains a partial foundation only:

- Full typed onboarding backend behavior remains incomplete.
- Setup wizard typed onboarding API consumption is started, but broader setup checklist integration, audit review, and polish remain future work.
- No localStorage, sessionStorage, cookies, indexedDB, or URL persistence is implemented for selected archetype/checklist state.
- Compliance, provider, storage, generated-document object storage, signed URL, hosted, Supabase, and Vercel behavior remains unchanged.

## Goals

Future typed onboarding persistence should support:

- Persisted selected archetype/profile per tenant and business scope.
- Generated setup checklist items based on versioned checklist templates.
- Checklist item completion state.
- Checklist item dismissal/skip state.
- Tenant and organization scoping, with optional business/entity scoping where future multi-entity workflows need it.
- Audit trail for meaningful setup changes.
- Safe reset and recompute behavior.
- Versioned checklist templates that can evolve without silently erasing user progress.

## Non-Goals

The design-only PR did not implement runtime behavior. Later implementation slices added schema groundwork, service/domain behavior, and a narrow setup wizard API consumption path.

- No full typed onboarding backend.
- No broad setup checklist state machine.
- No browser durable persistence through localStorage, sessionStorage, cookies, indexedDB, or URL state.
- No compliance, provider, storage, hosted, Supabase, Vercel, signed URL, or generated-document object storage behavior changes.
- No production readiness claims.

## Proposed Domain Model

The following sketches are future design concepts only. They are not implemented schema and should not be treated as Prisma models until a later approved implementation PR.

### OnboardingProfile

Represents the selected typed onboarding archetype for an organization or business scope.

```ts
type OnboardingProfile = {
  id: string;
  organizationId: string;
  businessId?: string | null;
  selectedArchetypeKey: string;
  templateVersion: string;
  status: "draft" | "active" | "completed" | "reset_requested" | "archived";
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};
```

Design notes:

- `organizationId` is mandatory for tenant isolation.
- `businessId` is optional until LedgerByte has a clear multi-business persistence boundary.
- `selectedArchetypeKey` must be validated against LedgerByte typed onboarding metadata.
- `templateVersion` pins the checklist template generation source.
- Profile changes should create audit events.

### OnboardingChecklist

Represents a generated checklist instance tied to an onboarding profile.

```ts
type OnboardingChecklist = {
  id: string;
  organizationId: string;
  businessId?: string | null;
  onboardingProfileId: string;
  templateVersion: string;
  status: "draft" | "active" | "completed" | "reset_requested" | "archived";
  generatedAt: string;
  completedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};
```

Design notes:

- A profile can have one active checklist at a time.
- Archived checklists remain queryable for audit/history.
- Recompute should update or append items through explicit rules rather than replacing the checklist wholesale.

### OnboardingChecklistItem

Represents an item generated from a template key and tracked inside a checklist.

```ts
type OnboardingChecklistItem = {
  id: string;
  organizationId: string;
  businessId?: string | null;
  onboardingChecklistId: string;
  itemKey: string;
  templateVersion: string;
  status: "not_started" | "available" | "blocked" | "completed" | "skipped" | "reopened";
  blockedReason?: string | null;
  completedAt?: string | null;
  completedByUserId?: string | null;
  skippedAt?: string | null;
  skippedByUserId?: string | null;
  reopenedAt?: string | null;
  reopenedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};
```

Design notes:

- `itemKey` must be stable across template versions when the item represents the same user task.
- Blocked compliance, storage, and provider items stay blocked until separate evidence proves readiness.
- `skipped` means user-dismissed for setup flow ergonomics, not completed capability proof.

### OnboardingChecklistEvent

Represents the audit stream for profile/checklist/item changes.

```ts
type OnboardingChecklistEvent = {
  id: string;
  organizationId: string;
  businessId?: string | null;
  onboardingProfileId?: string | null;
  onboardingChecklistId?: string | null;
  onboardingChecklistItemId?: string | null;
  eventType:
    | "profile_selected"
    | "profile_changed"
    | "checklist_generated"
    | "checklist_recomputed"
    | "item_completed"
    | "item_skipped"
    | "item_reopened"
    | "item_blocked"
    | "item_archived";
  previousValue?: Record<string, unknown> | null;
  nextValue?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
  createdByUserId: string;
};
```

Design notes:

- Events should be append-only.
- Sensitive provider, compliance, and storage data should not be embedded in free-form event payloads.
- Event metadata should be minimal and redacted by default.

### OnboardingTemplateVersion

Optional future registry for persisted template metadata snapshots.

```ts
type OnboardingTemplateVersion = {
  id: string;
  version: string;
  archetypeKey: string;
  itemKeys: string[];
  status: "draft" | "active" | "archived";
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
};
```

Design notes:

- Template versions should map to LedgerByte-native typed onboarding metadata.
- Published template versions should be immutable. Corrections should create a new version.
- A later implementation can start with code-defined template versions before adding a persisted template table.

## API Design Status

The following endpoint family began as a design sketch. The setup wizard API consumption PR starts a narrow implemented controller/client path for these onboarding profile and checklist operations while keeping full typed onboarding partial.

### `GET /onboarding/profile`

Returns the current organization-scoped onboarding profile, selected archetype, template version, and status.

Required behavior:

- Scope by authenticated organization.
- Return empty/default design response when no persisted profile exists.
- Do not expose other tenants' profile state.

### `PUT /onboarding/profile`

Sets or changes the selected onboarding archetype.

Required behavior:

- Require setup/admin-level permission.
- Validate selected archetype against typed onboarding metadata.
- Write an audit event for profile selection/change.
- Either create a checklist or mark an explicit recompute requirement, depending on implementation phase.

### `GET /onboarding/checklist`

Returns the current generated checklist and item states.

Required behavior:

- Scope by authenticated organization and optional business scope.
- Include template version and item status metadata.
- Preserve blocked/planned item distinctions.

### `POST /onboarding/checklist/recompute`

Recomputes checklist items from the selected archetype and template version rules.

Required behavior:

- Require explicit permission.
- Never silently erase completed, skipped, or reopened item history.
- Append new items when templates add them.
- Archive removed items instead of deleting them.
- Write a recompute audit event.

### `POST /onboarding/checklist/items/:itemKey/complete`

Marks an available checklist item complete.

Required behavior:

- Validate item belongs to the caller's organization.
- Reject blocked items unless a separate implementation explicitly proves unblock conditions.
- Record `completedAt` and `completedByUserId`.
- Write an audit event.

### `POST /onboarding/checklist/items/:itemKey/skip`

Marks a checklist item skipped/dismissed.

Required behavior:

- Validate item belongs to the caller's organization.
- Preserve the item in history.
- Record `skippedAt`, `skippedByUserId`, and an optional reason.
- Write an audit event.

### `POST /onboarding/checklist/items/:itemKey/reopen`

Reopens a completed or skipped item.

Required behavior:

- Validate item belongs to the caller's organization.
- Preserve previous completion/skip history in audit events.
- Record `reopenedAt` and `reopenedByUserId`.
- Write an audit event.

## State Machine

### Checklist Item States

- `not_started`: item exists but is not yet available to act on.
- `available`: item can be acted on through an implemented LedgerByte route or workflow.
- `blocked`: item is intentionally not actionable until separate proof or implementation exists.
- `completed`: user or system marked the item complete through an approved future API.
- `skipped`: user dismissed or deferred the item; this is not proof of completion.
- `reopened`: completed or skipped item was reopened for follow-up.

Allowed future transitions:

- `not_started` -> `available`
- `not_started` -> `blocked`
- `available` -> `completed`
- `available` -> `skipped`
- `completed` -> `reopened`
- `skipped` -> `reopened`
- `reopened` -> `available`
- `reopened` -> `completed`
- `blocked` -> `available` only after separate evidence proves the blocker is cleared
- `blocked` -> `archived` only through template removal/archive rules

### Profile And Checklist States

- `draft`: selected or generated but not yet active.
- `active`: current onboarding profile/checklist for the organization.
- `completed`: checklist has reached its completion criteria.
- `reset_requested`: explicit reset/recompute has been requested but not finalized.
- `archived`: no longer active but retained for audit/history.

Allowed future transitions:

- `draft` -> `active`
- `active` -> `completed`
- `active` -> `reset_requested`
- `reset_requested` -> `active`
- `active` -> `archived`
- `completed` -> `archived`

## Versioning And Recompute Strategy

Checklist templates must be versioned before persistence is enabled.

Recompute rules:

- Recompute must not silently erase user progress.
- Completed, skipped, reopened, and blocked history must remain auditable.
- New template items can be appended without losing old item state.
- Removed template items should be archived, not deleted.
- Renamed items should keep the same `itemKey` when they represent the same underlying task.
- Blocked compliance, storage, signed URL, provider, and country-readiness items must remain blocked until separate implementation, proof, and approval exist.
- Recompute should record an event with previous template version, next template version, item additions, item archives, and the acting user.

Versioning can begin as code-defined template metadata with explicit version strings. A later persisted `OnboardingTemplateVersion` table should be introduced only when product or audit requirements need stored snapshots.

## Security And Tenancy

Future implementation must enforce:

- Organization scoping on every profile, checklist, item, and event read/write.
- Optional business/entity scoping where multi-entity onboarding needs it.
- Permission checks for profile selection, checklist recompute, completion, skip, and reopen actions.
- Audit logging for meaningful setup changes.
- No cross-tenant leakage through item keys, template versions, event payloads, or error messages.
- No AI direct mutation of onboarding profile or checklist state.
- No provider, storage, compliance, hosted, or production readiness mutation from onboarding APIs.
- Sensitive provider/compliance details should be referenced by stable status keys or redacted metadata, not copied into onboarding event payloads.

Suggested permission boundary:

- Read access: authenticated organization members with setup/dashboard access.
- Write access: owner/admin or a future explicit setup-management permission.
- Audit access: owner/admin/accountant roles according to the existing audit permission model.

## Interaction With Future Inbox

Onboarding blockers may later create or link to Inbox items. This design does not implement Inbox.

Future integration should be one-way and explicit:

- Onboarding can surface that a blocked item has a related Inbox task.
- Inbox actions should remain audited in the Inbox domain.
- Onboarding should not directly mutate Inbox state without an approved API contract.
- AI proposal behavior remains out of scope.

## Interaction With Integration Health

Provider, storage, compliance, and hosted readiness states may later be read from integration health. This design does not implement integration health.

Future integration should:

- Treat integration health as a read source for blocker display and availability.
- Keep compliance/storage/provider blockers fail-closed when health data is missing or stale.
- Avoid turning readiness labels into production claims.
- Keep onboarding checklist state separate from provider execution state.

## Storage And Compliance Caution

Generated-document object storage approval remains `BLOCKED`.

Runtime generated documents remain database-backed unless separately changed.

Real object storage remains unimplemented and unproven.

Signed URLs remain unimplemented and unproven.

UAE, ZATCA, Peppol, ASP, and provider production readiness remain blocked unless separately proven and approved.

This design does not change any storage, provider, compliance, hosted, Supabase, Vercel, signed URL, or generated-document behavior.

## Implementation Phases

1. Design only: this PR.
2. Prisma schema/migration behind focused tests after design approval.
3. API service foundation with local tests for tenant scoping, permissions, state transitions, and audit events.
4. Web client consumption that replaces preview-only state with API-backed state.
5. Audit event integration and audit UI visibility.
6. Optional Inbox integration after Inbox design/API approval.
7. Optional integration-health read integration after integration-health design/API approval.

Each implementation phase should remain narrow and independently verified.

## Acceptance Criteria For Future Implementation

Future implementation PRs should prove:

- Tenant isolation tests for profile, checklist, item, and event reads/writes.
- Permission tests for profile updates, recompute, complete, skip, and reopen.
- Audit logging tests for every meaningful mutation.
- Checklist recompute tests that append new items and archive removed items.
- Template versioning tests.
- No silent progress loss when archetypes or template versions change.
- Blocked compliance, storage, signed URL, provider, UAE, ZATCA, Peppol, and ASP items stay blocked until separate proof clears them.
- Invalid archetype keys fail closed to a safe default or validation error according to the approved API contract.
- No production source references to external inspiration sources.
- Docs and status updates remain conservative.

## Review Checklist For This Design PR

- Design document exists.
- Evidence record exists.
- Status docs and next-goals roadmap are updated.
- No runtime behavior changed.
- No Prisma schema or migrations were added.
- No API modules were added.
- No persistence was added.
- No production readiness claims changed.
