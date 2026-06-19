# Typed Onboarding Profile Metadata Foundation

## Purpose

LedgerByte now has a metadata-only typed onboarding profile foundation in `apps/web/src/lib/typed-onboarding.ts`.

The helper defines LedgerByte-native business archetypes and setup checklist template metadata that can later support a full typed onboarding workflow. This slice does not add backend persistence, setup state machines, Prisma migrations, API modules, or active UI runtime behavior.

## What Was Implemented

- Added centralized typed onboarding archetype metadata.
- Added setup checklist template item metadata for active, planned, and blocked capabilities.
- Added helper functions for listing archetypes, resolving a single archetype, reading default templates, filtering recommended items, filtering by capability status, and identifying actionable template items.
- Added focused tests in `apps/web/src/lib/typed-onboarding.test.ts`.

## Archetypes

The metadata currently defines:

- `general_services`
- `software_saas`
- `agency`
- `trading`
- `ecommerce`
- `contractor`
- `multi_entity`
- `ksa_zatca_readiness`
- `uae_einvoicing_readiness`

Each archetype includes LedgerByte-native title, description, recommended-for copy, and default checklist template metadata.

## Route Registry Use

Active template items reference route registry keys only. The helper does not duplicate route hrefs.

Setup-progress-backed items consume the setup/onboarding route helper stack, which in turn consumes the app route registry. Additional active route-backed template items store only `routeKey` values.

Planned and blocked items do not receive route keys and cannot become active navigation from this helper.

## Planned And Blocked Handling

Future typed onboarding state is represented as planned metadata only.

Generated-document object storage and signed URL delivery remain blocked metadata only. KSA and UAE production/provider-network capabilities remain blocked unless separately implemented, proven, and approved.

## Clean-Room Confirmation

This implementation is LedgerByte-native. It does not add OpenBooks source code, schema, comments, UI text, dependencies, implementation structure, runtime modules, or production behavior. Production source typed onboarding helpers do not reference OpenBooks.

## Non-Goals

- No full typed onboarding backend was implemented.
- No persistent setup checklist database tables, backend setup state, setup state machine, or Prisma migrations were added.
- No Inbox, AI proposal, deterministic bookkeeping pipeline, report-pack, integration-health, or document-review runtime was implemented.
- No API runtime module, hosted deployment behavior, provider adapter, generated-document object storage, signed URL behavior, Convex integration, external dependency, or production compliance behavior was added.
- No UAE, ZATCA, Peppol, ASP, provider, storage, or compliance readiness status changed.

## Validation Commands

- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding`
- `corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding setup-progress setup-onboarding-routes app-routes`
- `corepack pnpm verify:openbooks-clean-room`
- `node scripts/openbooks-clean-room-validate.cjs --strict`
- `git diff --check`
- `git diff --cached --check` after staging

## Remaining Blockers

- Full typed onboarding, persistence, and setup state-machine behavior remain planned.
- Generated-document object storage remains `BLOCKED`; real object storage and signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven.

## Next Recommended PR

`Implement LedgerByte-native typed onboarding profile selector helpers`
