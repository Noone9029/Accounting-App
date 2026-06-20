# Typed Onboarding Persistence Schema Foundation Evidence

## Scope

This evidence record covers the LedgerByte-native typed onboarding persistence schema foundation slice.

Branch: `feature/typed-onboarding-persistence-schema-foundation`

Base: `main` after Goal 12 merge/stabilization.

## Adopted Behavior

The adopted behavior is a narrow typed onboarding persistence schema foundation.

Feature status: `PARTIAL`.

This PR adds additive Prisma schema and migration groundwork for persisted typed onboarding profile selection, generated checklist containers, checklist item state, checklist events, and template version tracking.

It does not add public runtime behavior.

## Clean-Room Confirmation

- No OpenBooks code was copied.
- No OpenBooks schema, comments, UI text, implementation structure, dependencies, source imports, translated source, ported source, or vendored source were imported.
- No OpenBooks references were added to production source.
- The implementation is LedgerByte-native schema groundwork.

## Runtime Behavior

Runtime behavior changed: no public runtime behavior.

Database schema changed: yes, local Prisma schema/migration foundation.

API behavior changed: no public API behavior.

UI behavior changed: no.

Migrations added: yes.

Prisma schema changed: yes.

## Files Changed

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260620043000_typed_onboarding_persistence_schema_foundation/migration.sql`
- `apps/api/src/onboarding/onboarding-persistence-schema.spec.ts`
- `docs/architecture/TYPED_ONBOARDING_PERSISTENCE_DESIGN.md`
- `docs/development/openbooks-adoption/TYPED_ONBOARDING_PERSISTENCE_SCHEMA_FOUNDATION_EVIDENCE.md`
- `docs/development/openbooks-adoption/OPENBOOKS_ADOPTION_NEXT_GOALS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/PROJECT_AUDIT.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`

## What Was Added

- `OnboardingProfileStatus`, `OnboardingChecklistStatus`, `OnboardingChecklistItemStatus`, `OnboardingChecklistEventType`, and `OnboardingTemplateVersionStatus` Prisma enums.
- `OnboardingProfile` for organization-scoped selected archetype and template version state.
- `OnboardingChecklist` for generated checklist container state.
- `OnboardingChecklistItem` for item keys, categories, status, route/setup-progress keys, blocked reason metadata, and completion/skip/reopen timestamps.
- `OnboardingChecklistEvent` for append-style audit records tied to profile/checklist/item changes.
- `OnboardingTemplateVersion` for versioned template metadata tracking.
- Organization scoping indexes and optional `branchId` indexes for future branch/entity-specific onboarding.
- Partial unique migration indexes for one active organization-level profile, one active branch-level profile, and one active checklist per profile.
- A focused schema contract test that checks the model/enumeration/migration surface and non-goals.

## Non-Goals Preserved

- Full typed onboarding backend remains unimplemented.
- Setup wizard persistence remains unimplemented.
- No setup wizard UI persistence was added.
- No public API endpoint, controller, service, or client write behavior was added.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, or UI API writes were added.
- No Inbox runtime implementation was added.
- No AI proposal runtime implementation was added.
- No deterministic pipeline runtime implementation was added.
- No report-pack runtime implementation was added.
- No integration-health runtime implementation was added.
- No document-review runtime implementation was added.
- No generated-document object storage behavior changed.
- No signed URL behavior changed.
- No provider/storage/compliance behavior changed.
- No production compliance claim was added.
- No Convex dependency was added.

## Remaining Blockers

- Full typed onboarding API/service behavior remains planned.
- Setup wizard API-backed persistence remains planned.
- Tenant-isolated onboarding mutations remain unimplemented until the future API/service slice.
- Generated-document object storage approval remains `BLOCKED`.
- Runtime generated documents remain database-backed unless separately changed.
- Real object storage remains unimplemented and unproven.
- Signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven and approved.

## Checks Run

`corepack pnpm install --frozen-lockfile`

- Result: PASS.

`corepack pnpm --filter @ledgerbyte/api db:generate`

- Result: PASS.

`$env:DATABASE_URL='postgresql://postgres:postgres@localhost:5432/ledgerbyte_validation'; $env:DIRECT_URL=$env:DATABASE_URL; corepack pnpm --filter @ledgerbyte/api exec prisma validate`

- Result: PASS.
- Note: dummy local PostgreSQL URLs were supplied for Prisma validation only. No database connection or hosted mutation was performed.

`corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/onboarding/onboarding-persistence-schema.spec.ts`

- Result: PASS, 1 suite / 5 tests.

`node scripts/openbooks-clean-room-validate.cjs --strict`

- Result: PASS.

`corepack pnpm verify:openbooks-clean-room`

- Result: PASS.

`corepack pnpm verify:ci:local`

- Result: PASS.

Production-source scan for OpenBooks references in `apps` and `packages`

- Result: PASS, no matches.

`git diff --check`

- Result: PASS.

`git diff --cached --check`

- Result: PASS before commit.

## Checks Skipped

Full monorepo exhaustive tests and browser/E2E are expected to be skipped because this is a narrow schema/test/docs foundation with no public runtime or UI behavior changes.

Hosted/Supabase/Vercel mutations, provider calls, production URLs, hosted migrations, seed/reset/delete commands, ZATCA/UAE/Peppol/ASP actions, generated-document object storage, and signed URL actions were not run.

## Next Recommended PR

Implement the typed onboarding API/service foundation with local tests for tenant scoping, permissions, state transitions, and audit event creation.

That future PR should not wire setup wizard UI persistence yet and should not include Inbox, AI proposal behavior, report-pack behavior, integration-health behavior, provider/storage/compliance behavior, signed URLs, hosted behavior, or production readiness claims.
