# Setup Checklist Template UI Consumption

## Purpose

LedgerByte setup now renders read-only archetype-aware checklist previews from `apps/web/src/lib/typed-onboarding.ts`.

This slice consumes the typed onboarding metadata foundation in the setup UI so users can preview how different business profiles affect setup checklist templates. It remains frontend-only and non-persistent.

## What Was Implemented

- Added `TypedOnboardingChecklistPreview` for setup checklist template previews.
- Wired the preview into the existing setup wizard.
- Rendered available typed onboarding archetypes with a client-side selector.
- Displayed active, planned, and blocked template items from typed onboarding metadata.
- Resolved active setup links through the setup/onboarding route helper stack and app route registry.
- Kept planned and blocked template items non-actionable.
- Added focused React Testing Library coverage for the setup checklist preview and setup wizard wiring.

## UI Behavior

The preview defaults to the general services archetype when no profile is selected.

Users can switch archetypes in local React state only. The selected archetype is not saved to an API, database, local storage, cookies, or any other persistent storage.

Active template items show safe links only when their route keys resolve to active LedgerByte routes. Planned and blocked items render as metadata-only rows without links.

## Planned And Blocked Handling

Future typed onboarding state remains planned metadata only.

Generated-document object storage, signed URL delivery, KSA/ZATCA production readiness, UAE/Peppol production readiness, and provider-network readiness remain blocked metadata only unless separately implemented, proven, and approved.

## Clean-Room Confirmation

This implementation is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, dependencies, implementation structure, runtime modules, or production behavior. Production source setup checklist UI does not reference OpenBooks.

## Non-Goals

- No typed onboarding backend was implemented.
- No persistent setup checklist state was added.
- No setup state machine, setup checklist database table, Prisma migration, API module, or hosted behavior was added.
- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No provider adapter, generated-document object storage, signed URL behavior, Convex integration, external dependency, or production compliance behavior was added.
- No future inactive routes were activated.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-preview`
- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding setup-progress setup-onboarding-routes app-routes setup-wizard`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Full typed onboarding, persistence, and setup state-machine behavior remain planned.
- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.

## Next Recommended PR

`Implement LedgerByte-native typed onboarding profile selector defaults`
