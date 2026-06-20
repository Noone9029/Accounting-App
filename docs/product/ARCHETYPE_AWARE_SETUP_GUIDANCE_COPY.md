# Archetype-Aware Setup Guidance Copy

## Purpose

LedgerByte now has frontend/shared guidance copy for typed onboarding archetype previews.

The guidance helps users understand what each setup archetype emphasizes, what can be acted on now, what remains planned, and what is blocked until separately proven.

This remains frontend-only, preview-only, and non-persistent.

## What Was Implemented

- Added `apps/web/src/lib/typed-onboarding-guidance.ts`.
- Added guidance copy for every typed onboarding archetype.
- Added helper functions for default guidance, invalid-value fallback, tone lookup, warning buckets, and compliance/storage/provider cautions.
- Updated the setup checklist preview to render the selected archetype's guidance.
- Kept selector state in ephemeral React state only.
- Added focused helper and UI tests for guidance coverage, fallback behavior, conservative compliance/storage wording, and preview rendering.

## Guidance Copy Rules

Guidance copy is generated from LedgerByte-native helper metadata and is consumed by the setup checklist preview.

Each guidance entry includes:

- headline
- summary
- emphasis
- active-now copy
- planned-next copy
- blocked-until-proven copy
- tone: `active`, `planning`, or `blocked`

Invalid archetype values resolve to the default `general_services` guidance.

## Active, Planned, And Blocked Handling

Active guidance may describe existing setup routes and checklist items.

Planned guidance remains descriptive and does not expose planned route links.

Blocked guidance remains non-actionable. Storage, signed URL, provider, ZATCA, UAE, Peppol, and ASP-related guidance does not imply readiness.

## Storage, Compliance, And Provider Caution

Generated-document object storage remains blocked unless separately approved and proven.

Real object storage and signed URLs remain unimplemented and unproven.

UAE eInvoicing guidance stays local-readiness and planning-oriented. It does not claim FTA reporting, Peppol certification, ASP readiness, provider validation, webhook readiness, or production evidence storage.

KSA/ZATCA guidance stays local-readiness and planning-oriented. It does not claim production support, production signing, certified submission, or official network submission.

## Non-Persistent State Rule

Selected archetype and guidance state remain preview-only.

This slice does not write to an API, database, localStorage, sessionStorage, cookies, indexedDB, URL query parameters, hosted service, or any other durable store.

## Clean-Room Confirmation

This implementation is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, dependencies, implementation structure, runtime modules, or production behavior. Production guidance source does not reference OpenBooks.

## Non-Goals

- No typed onboarding backend was implemented.
- No persistence was added.
- No setup checklist state machine, setup checklist database table, Prisma migration, API module, hosted behavior, or external dependency was added.
- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No provider adapter, generated-document object storage, signed URL behavior, Convex integration, or production compliance behavior was added.
- No future inactive routes were activated.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-guidance typed-onboarding-preview`
- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-guidance typed-onboarding-selector typed-onboarding-preview setup-wizard typed-onboarding setup-progress setup-onboarding-routes app-routes sidebar route-load-verification`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `corepack pnpm verify:ci:local`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Full typed onboarding backend remains planned.
- Persistent setup checklist state remains unimplemented.
- Generated-document object storage approval remains `BLOCKED`.
- Real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven and approved.

## Next Recommended PR

`Design LedgerByte-native typed onboarding persistence`

This should be docs/API/schema design only. It should not implement Prisma schema changes, migrations, API routes, UI persistence, hosted behavior, provider behavior, storage behavior, signed URLs, or production compliance claims.
