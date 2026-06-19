# Typed Onboarding Profile Selector Defaults

## Purpose

LedgerByte now has a frontend/shared selector helper for typed onboarding profile preview defaults.

The helper centralizes safe default selection, selector options, invalid-value fallback, preview data, and summary counts for the setup wizard's archetype-aware checklist preview.

This remains frontend-only and non-persistent.

## What Was Implemented

- Added `apps/web/src/lib/typed-onboarding-selector.ts`.
- Added selector options derived from typed onboarding archetype metadata.
- Added a safe default selector value of `general_services`.
- Added invalid selector value fallback to the safe default.
- Added preview helper output with selected archetype, selector options, checklist items, and active/planned/blocked summary counts.
- Updated the setup checklist preview component to consume the selector helper instead of owning selector metadata and counts locally.
- Added focused helper tests for selector options, safe fallback, preview summary counts, cloned metadata, and conservative wording.

## Selector Behavior

The setup preview still uses ephemeral React state only. The selected archetype is not persisted to an API, database, local storage, session storage, cookies, URL query parameters, or any other durable store.

Selector options are generated from `apps/web/src/lib/typed-onboarding.ts`. The component does not duplicate the archetype list, default selector key, preview checklist items, or summary counts.

Invalid selector values resolve to `general_services`.

## Active, Planned, And Blocked Handling

Active checklist items may link only through active setup/onboarding route helpers and the app route registry.

Planned and blocked checklist items remain non-actionable and do not expose route keys from the selector helper.

Generated-document object storage, signed URL delivery, KSA/ZATCA production submission, UAE/Peppol provider-network readiness, and provider behavior remain blocked unless separately implemented, proven, and approved.

## Clean-Room Confirmation

This implementation is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, dependencies, implementation structure, runtime modules, or production behavior. Production source selector helpers do not reference OpenBooks.

## Non-Goals

- No typed onboarding backend was implemented.
- No persistence was added.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, database write, or API write was added.
- No setup state machine, setup checklist database table, Prisma migration, API module, or hosted behavior was added.
- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No provider adapter, generated-document object storage, signed URL behavior, Convex integration, external dependency, or production compliance behavior was added.
- No future inactive routes were activated.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-selector`
- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-selector typed-onboarding-preview`
- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-selector typed-onboarding-preview typed-onboarding setup-progress setup-onboarding-routes app-routes setup-wizard`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Full typed onboarding, persistence, and setup state-machine behavior remain planned.
- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.

## Next Recommended PR

`Implement LedgerByte-native archetype-aware setup guidance copy`
