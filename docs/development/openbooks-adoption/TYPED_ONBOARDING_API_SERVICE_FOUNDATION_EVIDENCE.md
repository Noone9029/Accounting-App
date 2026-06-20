# Typed Onboarding API Service Foundation Evidence

Date: 2026-06-20

Branch: `feature/typed-onboarding-api-service-foundation`

## Status

This PR adds a narrow LedgerByte-native typed onboarding API/service foundation.

Feature status: `PARTIAL`.

The implementation adds local service/domain behavior for persisted onboarding profile and checklist state using the schema foundation from PR #99. It does not wire setup wizard UI persistence, expose frontend API writes, or complete the full typed onboarding backend.

## Adopted Behavior

- Added `OnboardingService` and `OnboardingModule` under `apps/api/src/onboarding`.
- Added API-side typed onboarding archetype allowlist and checklist template metadata.
- Added explicit actor/context permission checks for read and management operations.
- Added organization and optional branch scoping on profile, checklist, item, and event operations.
- Added profile creation and selected-archetype updates.
- Added checklist generation/recompute behavior using the current code-defined template version.
- Added recompute behavior that preserves completed/skipped/reopened progress, appends new template items, and leaves removed template items historical.
- Added complete, skip, and reopen state transitions with blocked-item fail-closed behavior.
- Added onboarding checklist event records for meaningful mutations.

## Clean-Room Confirmation

- No OpenBooks code was copied.
- No OpenBooks schemas, comments, UI text, route structures, dependencies, or implementation details were imported.
- No OpenBooks references were added to production source.
- The implementation is LedgerByte-native.

## Runtime Behavior Changed

API/service foundation only.

No public controller or setup wizard frontend usage was added in this PR.

## UI Behavior Changed

No.

## Frontend Persistence Changed

No.

This PR does not add localStorage, sessionStorage, cookies, indexedDB, URL persistence, frontend API writes, or setup wizard persistence.

## Database Behavior Changed

The service uses the typed onboarding persistence schema foundation from PR #99 locally.

No new Prisma migration was added in this PR.

No hosted migration was run.

## Hosted Mutations

None.

No hosted/Supabase/Vercel/provider mutations were run.

No seed/reset/delete commands were run against hosted data.

## Provider, Storage, And Compliance Behavior

No provider, storage, generated-document object storage, signed URL, ZATCA, UAE, Peppol, ASP, hosted deployment, or production compliance behavior changed.

Compliance/storage/provider-related checklist items may exist as blocked service template items, but they do not trigger external calls and cannot be completed directly while blocked.

## Checks Run

- `corepack pnpm install --frozen-lockfile` PASS
- `corepack pnpm --filter @ledgerbyte/api db:generate` PASS
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/onboarding/onboarding.service.spec.ts` PASS
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/onboarding/onboarding-persistence-schema.spec.ts src/onboarding/onboarding.service.spec.ts` PASS
- `node scripts/openbooks-clean-room-validate.cjs --strict` PASS
- `corepack pnpm verify:openbooks-clean-room` PASS
- `git diff --check` PASS
- `corepack pnpm verify:ci:local` PASS
  - included `git diff --check`
  - included Prisma client generation
  - included API typecheck
  - included onboarding schema foundation test
  - included API production build
- production-source scan for `OpenBooks` in `apps` and `packages` returned no matches

## Checks Skipped

- Full monorepo exhaustive tests.
- Browser/E2E tests.
- Hosted migrations.
- Supabase mutations.
- Vercel mutations.
- Provider calls.
- ZATCA/UAE/Peppol/ASP actions.
- Generated-document object storage operations.
- Signed URL operations.

## Remaining Blockers

- PR #99 should merge before this PR unless this PR remains stacked on the schema foundation branch.
- Full typed onboarding backend remains partial.
- Setup wizard persistence remains unimplemented.
- Frontend/UI persistence remains unimplemented.
- Generated-document object storage approval remains `BLOCKED`.
- Runtime generated documents remain database-backed unless separately changed.
- Real object storage remains unimplemented/unproven.
- Signed URLs remain unimplemented/unproven.
- UAE/ZATCA/Peppol/ASP/provider production readiness remains blocked unless separately proven and approved.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report pack, integration health, and document review remain planned.

## Next Recommended PR

After PR #99 and this API/service foundation land, implement setup wizard API consumption behind explicit UI/API contracts.

That follow-up should stay narrow, keep frontend persistence intentional and tested, and must not add provider/storage/compliance behavior, hosted mutations, signed URLs, production compliance claims, Inbox, AI proposals, report-pack runtime, integration-health runtime, or document-review runtime.
