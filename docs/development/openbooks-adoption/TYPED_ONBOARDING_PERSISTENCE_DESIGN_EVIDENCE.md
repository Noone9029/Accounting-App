# Typed Onboarding Persistence Design Evidence

## Scope

This evidence record covers the LedgerByte-native typed onboarding persistence design slice.

Branch: `feature/typed-onboarding-persistence-design`

Base: `feature/archetype-aware-setup-guidance-copy`

Pull request: opened after validation

Commit: recorded in pull request closeout

## Adopted Behavior

The adopted behavior is typed onboarding persistence design.

Feature status: `PLANNED`.

This PR defines future persistence boundaries for selected onboarding profile, generated checklist items, checklist item state, audit events, versioning, recompute rules, tenancy, permissions, and future API contracts.

## Clean-Room Confirmation

- No OpenBooks code was copied.
- No OpenBooks schema, comments, UI text, implementation structure, dependencies, source imports, translated source, ported source, or vendored source were imported.
- No OpenBooks references were added to production source.
- The implementation is LedgerByte-native design documentation only.

## Runtime Behavior

Runtime behavior changed: no.

API/database behavior changed: no.

Migrations added: no.

Prisma schema changed: no.

Production source changed: no.

## Files Changed

- `docs/architecture/TYPED_ONBOARDING_PERSISTENCE_DESIGN.md`
- `docs/development/openbooks-adoption/TYPED_ONBOARDING_PERSISTENCE_DESIGN_EVIDENCE.md`
- `docs/development/openbooks-adoption/OPENBOOKS_ADOPTION_NEXT_GOALS.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/PROJECT_AUDIT.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`

## What Was Designed

- Future-only domain sketches for `OnboardingProfile`, `OnboardingChecklist`, `OnboardingChecklistItem`, `OnboardingChecklistEvent`, and optional `OnboardingTemplateVersion`.
- Future-only API sketches for profile, checklist, recompute, complete, skip, and reopen operations.
- Future item/profile/checklist state machines.
- Template versioning and recompute rules that avoid silent progress loss.
- Tenant, permission, and audit requirements.
- Future interaction boundaries with Inbox and integration health.
- Storage, signed URL, provider, and compliance cautions.
- Future implementation phases and acceptance criteria.

## Non-Implementation Confirmation

- Full typed onboarding backend remains unimplemented.
- Persistent setup checklist state remains unimplemented.
- No selected archetype persistence was added.
- No checklist completion, skip, dismissal, reset, recompute, or audit persistence was added.
- No API runtime module, controller, service, route, or client behavior was added.
- No localStorage, sessionStorage, indexedDB, cookies, URL query persistence, database write, or API write was added.
- No Prisma schema changes or migrations were added.

## Remaining Blockers

- PR #96 and PR #97 should merge before this PR if they remain open.
- Full typed onboarding remains planned.
- Persistent setup checklist state remains unimplemented.
- Generated-document object storage approval remains `BLOCKED`.
- Runtime generated documents remain database-backed unless separately changed.
- Real object storage remains unimplemented and unproven.
- Signed URLs remain unimplemented and unproven.
- UAE, ZATCA, Peppol, ASP, provider-network, and production compliance readiness remain blocked unless separately proven and approved.

## Checks Run

`corepack pnpm --filter @ledgerbyte/web test -- typed-onboarding-guidance typed-onboarding-selector typed-onboarding-preview setup-wizard typed-onboarding setup-progress setup-onboarding-routes app-routes`

- Result: PASS, 8 suites / 46 tests.

`node scripts/openbooks-clean-room-validate.cjs --strict`

- Result: PASS.

`corepack pnpm verify:openbooks-clean-room`

- Result: PASS.

`corepack pnpm verify:ci:local`

- Result: PASS.
- Included `git diff --check`, web typecheck, focused onboarding tests, and web production build.

Production-source scan for OpenBooks references in `apps` and `packages`

- Result: PASS, no matches.

`git diff --check`

- Result: PASS.

`git diff --cached --check`

- Result: PASS.

## Tests Skipped

Full monorepo exhaustive tests and browser/E2E are expected to be skipped because this is a docs/design-only slice with no runtime behavior changes.

## Next Recommended PR

Implement the approved typed onboarding persistence foundation only after design review.

That future PR should start with Prisma schema/migration and local tests, then add API service/controller behavior in a separate narrow slice if needed. It should not include Inbox, AI proposal behavior, provider/storage/compliance behavior, signed URLs, hosted behavior, or production readiness claims.
