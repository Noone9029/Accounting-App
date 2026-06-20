# Setup Wizard Typed Onboarding API Consumption Evidence

Date: 2026-06-20

Branch: `feature/setup-wizard-typed-onboarding-api-consumption`

## Status

This PR adds a narrow LedgerByte-native setup wizard typed onboarding API consumption slice.

Feature status: `PARTIAL`.

The implementation connects the existing setup wizard typed onboarding preview to LedgerByte typed onboarding API/service behavior so the selected archetype and generated checklist state can be loaded and updated through the API when available.

This is not the full typed onboarding backend, not a production readiness claim, and not a provider/storage/compliance implementation.

## Adopted Behavior

- Added a narrow onboarding controller for typed onboarding profile/checklist reads and mutations.
- Added DTO validation for selected archetype updates and checklist item action reasons.
- Added a frontend typed onboarding API helper for profile, checklist, recompute, and item action calls.
- Updated the setup checklist preview to load the saved typed onboarding profile/checklist from the API.
- Updated the preview to keep the default selector behavior while loading or when no profile exists.
- Updated archetype switching to save through the API and refresh the checklist preview from the recomputed API checklist.
- Preserved local React state as UI state only; durable state is API-backed.
- Kept planned and blocked setup items non-actionable.
- Kept storage, compliance, provider, UAE, ZATCA, Peppol, and ASP guidance conservative.

## Clean-Room Confirmation

- No OpenBooks code was copied.
- No OpenBooks schemas, comments, UI text, route structures, dependencies, or implementation details were imported.
- No OpenBooks references were added to production source.
- The implementation is LedgerByte-native.

## Runtime Behavior Changed

Yes.

Runtime behavior changed only for typed onboarding API/UI persistence consumption:

- The backend exposes narrow typed onboarding profile/checklist controller endpoints over the existing onboarding service foundation.
- The setup wizard typed onboarding preview can load and update typed onboarding profile/checklist state through LedgerByte API calls.

No Inbox, AI proposal, deterministic pipeline, report-pack, integration-health, document-review, provider, storage, generated-document object storage, signed URL, hosted, Supabase, Vercel, UAE, ZATCA, Peppol, ASP, or production compliance runtime behavior changed.

## Database Behavior Changed

This PR uses the existing typed onboarding schema foundation.

No Prisma migration was added.

No hosted migration was run.

## UI Behavior Changed

Yes.

The setup wizard typed onboarding preview can now:

- Load saved selected archetype/checklist state from the LedgerByte API.
- Fall back to the default local preview when no saved profile is available or the API is unavailable.
- Save selected archetype changes through the API.
- Refresh checklist preview state after an API recompute.

Blocked and planned items remain non-actionable.

## Frontend Browser Persistence

No browser durable persistence was added.

This PR does not use `localStorage`, `sessionStorage`, cookies, indexedDB, or URL query persistence for selected archetype or checklist state.

Selected archetype state may exist in React state for rendering only. Durable state is the typed onboarding API.

## Hosted Mutations

None.

No hosted migrations, Supabase mutations, production database commands, seed/reset/delete commands, Vercel mutations, provider calls, ZATCA/UAE/Peppol/ASP actions, generated-document object storage operations, or signed URL operations were run.

## Provider, Storage, And Compliance Behavior

No provider, storage, generated-document object storage, signed URL, hosted deployment, ZATCA, UAE, Peppol, ASP, or production compliance behavior changed.

Compliance/storage/provider checklist items remain blocked or planned unless separately proven and approved.

## Checks Run

- `corepack pnpm --filter @ledgerbyte/api db:generate` PASS
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/onboarding/onboarding.service.spec.ts src/onboarding/onboarding.controller.spec.ts` PASS
  - 2 suites / 21 tests
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runTestsByPath src/onboarding/onboarding-persistence-schema.spec.ts` PASS
  - 1 suite / 5 tests
- `corepack pnpm --filter @ledgerbyte/web test -- onboarding-api typed-onboarding-preview` PASS
  - 123 suites / 565 tests
- `corepack pnpm --filter @ledgerbyte/web test -- setup-wizard typed-onboarding-preview typed-onboarding-selector typed-onboarding-guidance typed-onboarding setup-progress setup-onboarding-routes app-routes` PASS
  - 123 suites / 565 tests
- `corepack pnpm --filter @ledgerbyte/web typecheck` PASS
- `node scripts/openbooks-clean-room-validate.cjs --strict` PASS
- `corepack pnpm verify:openbooks-clean-room` PASS
- production-source scan for `OpenBooks` in `apps` and `packages` PASS, no matches
- setup/onboarding browser persistence scan PASS, no matches for `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, or `URLSearchParams`
- `git diff --check` PASS
- `corepack pnpm verify:ci:local` PASS
  - included `git diff --check`
  - included Prisma client generation
  - included API typecheck
  - included onboarding service spec
  - included API production build

## Checks Skipped

Full monorepo exhaustive tests and browser/E2E are expected to be skipped because this is a narrow controller/client/setup-preview API consumption slice with focused API and Jest coverage plus local CI verification.

Hosted/Supabase/Vercel mutations, provider calls, production URLs, hosted migrations, seed/reset/delete commands, ZATCA/UAE/Peppol/ASP actions, generated-document object storage, and signed URL actions were not run.

## Important Non-Goals Preserved

- Full typed onboarding remains partial.
- No unrelated Prisma migration was added.
- No browser durable persistence was added.
- No Inbox runtime implementation was added.
- No AI proposal runtime implementation was added.
- No deterministic pipeline runtime implementation was added.
- No report-pack runtime implementation was added.
- No integration-health runtime implementation was added.
- No document-review runtime implementation was added.
- No provider/storage/compliance behavior changed.
- No production compliance claim was added.
- No Convex dependency was added.

## Remaining Blockers

- Full typed onboarding remains partial.
- Broader setup checklist polish, audit review, and setup checklist integration remain planned.
- Generated-document object storage approval remains `BLOCKED`.
- Runtime generated documents remain database-backed unless separately changed.
- Real object storage remains unimplemented/unproven.
- Signed URLs remain unimplemented/unproven.
- UAE/ZATCA/Peppol/ASP/provider production readiness remains blocked unless separately proven and approved.
- Inbox, AI proposals, deterministic bookkeeping pipeline, report pack, integration health, and document review remain planned.

## Next Recommended PR

Merge and stabilize the setup wizard typed onboarding API consumption slice from `main`.

That follow-up should verify the merged baseline, update handoff/status docs, and keep feature work paused until the stack is stable. It must not add provider/storage/compliance behavior, hosted mutations, signed URLs, production compliance claims, Inbox, AI proposals, report-pack runtime, integration-health runtime, or document-review runtime.
