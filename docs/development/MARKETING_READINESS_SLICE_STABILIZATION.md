# Marketing Readiness Slice Stabilization

Date: 2026-06-07

Branch: `codex/dev-12-generated-documents-storage-retention`

Baseline commits:
- `788094fd Document branch stabilization triage`
- `c734ee32 Stabilize API schema product slice`
- `42d09d3e Stabilize web workflow UI slice`
- `aa9af3b2 Stabilize docs status slice`

## Scope

This stabilization pass covers only the remaining marketing/readiness app routes, marketing component, and marketing claim-safety test. It preserves API/schema/product logic, workflow UI, docs/status files, graphify output, ZATCA behavior, production settings, deployments, provider settings, and unrelated files.

## Included Marketing/Readiness Files

Public route files:
- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/app/product/page.tsx`
- `apps/web/src/app/readiness/page.tsx`
- `apps/web/src/app/resources/page.tsx`
- `apps/web/src/app/workflows/page.tsx`
- `apps/web/src/app/ar/page.tsx`
- `apps/web/src/app/ar/pricing/page.tsx`
- `apps/web/src/app/ar/product/page.tsx`
- `apps/web/src/app/ar/readiness/page.tsx`
- `apps/web/src/app/ar/resources/page.tsx`
- `apps/web/src/app/ar/workflows/page.tsx`

Marketing component and test:
- `apps/web/src/components/marketing/marketing-site.tsx`
- `apps/web/src/app/marketing.test.tsx`

Closure note:
- `docs/development/MARKETING_READINESS_SLICE_STABILIZATION.md`

## Wording Safety Result

- LedgerByte remains framed as private/controlled beta and user-testing oriented.
- Public pricing and public launch are described as later, review-gated steps.
- Vercel is not presented as production hosting; it remains outside the marketing claims and limited to beta/user-testing/staging context.
- ZATCA is described as readiness groundwork only, with no certification, compliance, clearance, reporting, or production claim.
- Hosted backup, object storage, monitoring, email delivery, support evidence, production operations, and official compliance claims remain review-gated.
- No paid production launch, public trial, real email/provider, deploy, backup/storage compliance, or production readiness claim was added.

## Files Deliberately Excluded

- `apps/api/**`, Prisma migrations, and API tests.
- Previously committed workflow UI files outside the public marketing/readiness routes.
- Previously committed docs/status files, except this slice closure note.
- `graphify-out/**` and `apps/graphify-out/**` generated graph/cache/output artifacts.
- ZATCA code/scripts, production-roadmap implementation, provider/env changes, deploys, migrations, smoke/E2E, browser login/audit-writing flows, real email, backup/restore, and production checks.

## Targeted Verification

Passed:
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=marketing` - 1 suite / 4 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=readiness` - 2 suites / 2 tests.
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.

No matching dedicated test files were found for `home`, `landing`, `pricing`, or `public`; those public routes are covered by marketing metadata/path assertions and the web typecheck in this slice.

## Known Blockers

- Graphify generated/cache/output artifacts remain untracked and should stay uncommitted by default.
- No browser rendering, visual snapshots, smoke, E2E, deploy, production checks, provider checks, real email, real ZATCA, backup/restore, seed/reset/delete, or migrations were run.

Graphify decision:
- Preserve `graphify-out/**` and `apps/graphify-out/**` on disk, but keep them unstaged and uncommitted by default.

Next prompt title: `LedgerByte finalize graphify generated-output decision and cleanup`
