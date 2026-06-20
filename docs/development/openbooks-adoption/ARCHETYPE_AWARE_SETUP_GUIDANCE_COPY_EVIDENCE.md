# Archetype-Aware Setup Guidance Copy Evidence

## Scope

This evidence record covers the LedgerByte-native archetype-aware setup guidance copy slice.

Branch: `feature/archetype-aware-setup-guidance-copy`

Base: `feature/openbooks-adoption-post-merge-baseline-audit`

Pull request: opened after validation

Commit: recorded in pull request closeout

## Adopted Behavior

The adopted behavior is archetype-aware setup guidance copy for typed onboarding checklist previews.

The setup preview now displays LedgerByte-native guidance for the selected archetype, including what the archetype emphasizes, what can be acted on now, what remains planned, and what is blocked until separately proven.

Feature status: `WORKING` for this guidance-copy slice after focused helper/UI tests pass. Full typed onboarding backend remains planned.

## Files Changed

- `apps/web/src/lib/typed-onboarding-guidance.ts`
- `apps/web/src/lib/typed-onboarding-guidance.test.ts`
- `apps/web/src/components/onboarding/typed-onboarding-checklist-preview.tsx`
- `apps/web/src/components/onboarding/typed-onboarding-preview.test.tsx`
- `docs/product/ARCHETYPE_AWARE_SETUP_GUIDANCE_COPY.md`
- `docs/development/openbooks-adoption/ARCHETYPE_AWARE_SETUP_GUIDANCE_COPY_EVIDENCE.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/PROJECT_AUDIT.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/development/openbooks-adoption/OPENBOOKS_ADOPTION_NEXT_GOALS.md`

## What Was Implemented

- Added a pure TypeScript guidance helper.
- Added guidance coverage for every typed onboarding archetype.
- Added safe default guidance and invalid-value fallback through existing selector resolution.
- Added active, planning, and blocked guidance tones.
- Added warning and compliance-caution helper buckets.
- Rendered selected-archetype guidance in the setup checklist preview.
- Kept planned and blocked guidance as non-actionable copy.

## Clean-Room Confirmation

- No OpenBooks code was copied.
- No OpenBooks schema, comments, UI text, implementation structure, dependencies, source imports, translated source, ported source, or vendored source were imported.
- No OpenBooks references were added to production source.
- The implementation is LedgerByte-native.
- Production guidance helper output is covered by a no-OpenBooks-reference test.

## Runtime Behavior

Runtime behavior changed: yes, frontend UI/helper copy behavior only.

The selected archetype state remains non-persistent and preview-only.

No API runtime behavior, backend setup state, database persistence, Prisma migration, hosted behavior, provider adapter, generated-document object storage, signed URL behavior, Convex integration, external dependency, or production compliance behavior changed.

## Conservative Guidance Evidence

- UAE guidance states local-readiness and planning-oriented behavior only and says no FTA reporting is enabled.
- UAE provider use remains blocked until provider evidence, sandbox proof, security review, webhook flow, and approval are separately completed.
- KSA guidance states local-readiness and planning-oriented behavior only and keeps production support blocked.
- Generated-document object storage and signed URLs remain blocked when mentioned.
- Planned and blocked guidance is rendered as copy only, not as active navigation.

## Test Evidence

`corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-guidance typed-onboarding-preview`

- Result: PASS after the expected red failure for the missing guidance helper/module and then assertion scoping updates for repeated guidance/checklist copy.

`corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-guidance typed-onboarding-selector typed-onboarding-preview setup-wizard typed-onboarding setup-progress setup-onboarding-routes app-routes sidebar route-load-verification`

- Result: PASS, 10 suites / 62 tests.

`corepack pnpm verify:openbooks-clean-room`

- Result: PASS.

`node scripts/openbooks-clean-room-validate.cjs --strict`

- Result: PASS.

Production-source scan for OpenBooks references in `apps` and `packages`

- Result: PASS, no matches.

`corepack pnpm verify:ci:local`

- Result: PASS.

`corepack pnpm --filter @ledgerbyte/web typecheck`

- Result: PASS.

`git diff --check`

- Result: PASS.

`git diff --cached --check`

- Result: PASS.

## Tests Skipped

Full monorepo exhaustive tests and browser/E2E are expected to be skipped because this is a narrow frontend guidance-copy/helper slice covered by focused Jest tests and local verification.

## Non-Goals Preserved

- Full typed onboarding backend was not implemented.
- Persistent setup checklist state was not added.
- Backend setup state and setup state-machine behavior were not added.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, database write, or API write was added.
- No Prisma migrations were added.
- No API runtime module was added.
- No Inbox runtime implementation was added.
- No AI proposal runtime implementation was added.
- No deterministic pipeline runtime implementation was added.
- No report-pack runtime implementation was added.
- No integration-health runtime implementation was added.
- No document-review runtime implementation was added.
- No provider adapter, hosted behavior, generated-document object storage, signed URL behavior, or compliance behavior changed.
- No future inactive routes were activated.

## Remaining Blockers

- PR #96 should merge before this PR if it remains open.
- Full typed onboarding remains planned.
- Persistent setup checklist state remains unimplemented.
- Generated-document object storage approval remains `BLOCKED`.
- Real object storage remains unimplemented and unproven.
- Signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven and approved.

## Next Recommended PR

Design LedgerByte-native typed onboarding persistence.

This should be design only. Do not implement Prisma schema changes, migrations, API routes, UI persistence, hosted behavior, provider behavior, storage behavior, signed URLs, or production compliance claims in that design PR.
