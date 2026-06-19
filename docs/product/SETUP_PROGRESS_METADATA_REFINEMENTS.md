# Setup Progress Metadata Refinements

## Purpose

LedgerByte setup progress metadata is now centralized in `apps/web/src/lib/setup-progress.ts`. The helper keeps setup wizard/dashboard onboarding progress labels, categories, statuses, route keys, action labels, and safe explanations aligned with the app route registry and setup/onboarding route consumers.

## What Was Implemented

- Added `apps/web/src/lib/setup-progress.ts` as a pure TypeScript setup progress metadata helper.
- Added `apps/web/src/lib/setup-progress.test.ts` with coverage for categories, status derivation, active route handling, first workflow ordering, planned metadata, safe unknown-item fallback, and production-source clean-room reference scanning.
- Updated `apps/web/src/lib/dashboard.ts` so setup wizard steps, first workflow steps, and dashboard onboarding helpers consume setup progress metadata instead of owning duplicated setup copy.
- Preserved current setup wizard labels, action labels, dashboard behavior, return-to links, and local-readiness wording.

## Registry Consumption

`setup-progress.ts` consumes:

- `app-routes.ts` through setup/onboarding route helpers.
- `setup-onboarding-routes.ts` for active route availability, setup return-to links, and checklist-item route mapping.

Active setup progress items receive registry-backed `routeKey` and `href` values. Unknown or unavailable checklist items fail closed as non-actionable with `SETUP_PROGRESS_ROUTE_UNAVAILABLE`.

## Active Route Handling

Only active LedgerByte routes are returned as actionable setup progress links. Planned or unavailable routes do not become active navigation. Setup completion remains anchored to the active dashboard destination through the existing route consumer.

## Planned And Blocked Handling

The helper exposes planned setup metadata only as non-actionable metadata. The typed onboarding state remains planned and has no active route, persistence, backend state, or UI navigation in this slice.

## Clean-Room Confirmation

This implementation is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, dependencies, implementation structure, runtime modules, or production behavior. Production source setup progress helpers do not reference OpenBooks.

## Non-Goals

- No full typed onboarding backend was implemented.
- No persistent setup checklist database tables, backend setup state, setup state machine, or Prisma migrations were added.
- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No API runtime module, hosted deployment behavior, provider adapter, generated-document object storage, signed URL behavior, Convex integration, external dependency, or production compliance behavior was added.
- No UAE, ZATCA, Peppol, ASP, provider, storage, or compliance readiness status changed.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- setup-progress`
- `corepack pnpm --filter @ledgerbyte/web test -- setup-progress dashboard setup-wizard`
- `corepack pnpm --filter @ledgerbyte/web test -- setup-progress setup-onboarding-routes app-routes sidebar route-load-verification`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Full typed onboarding, persistent checklist state, and setup state-machine behavior remain planned.
- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.

## Next Recommended PR

`Implement LedgerByte-native setup dashboard progress grouping`
