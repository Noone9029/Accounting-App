# Web Workflow UI Slice Stabilization

Date: 2026-06-07

Branch: `codex/dev-12-generated-documents-storage-retention`

Baseline commits:
- `788094fd Document branch stabilization triage`
- `c734ee32 Stabilize API schema product slice`

References:
- `docs/development/BRANCH_STABILIZATION_TRIAGE.md`
- `docs/development/API_SCHEMA_PRODUCT_SLICE_STABILIZATION.md`

## Scope

This stabilization pass covers only the web workflow/UI slice from the dirty branch. It preserves existing work and leaves marketing/readiness pages, graphify output, unrelated docs/status files, API/schema/product logic, ZATCA, production-roadmap work, deployments, and provider settings untouched.

## Included Web/UI Files

Workflow routes:
- `apps/web/src/app/(app)/purchases/returns/**`
- `apps/web/src/app/(app)/sales/inventory-returns/**`
- `apps/web/src/app/(app)/purchases/ap-dashboard/**`
- `apps/web/src/app/(app)/inventory/fifo-preview/**`
- `apps/web/src/app/(app)/inventory/landed-cost/**`
- `apps/web/src/app/(app)/inventory/valuation-variances/**`
- `apps/web/src/app/(app)/inventory/traceability/**`
- `apps/web/src/app/(app)/inventory/batches/**`
- `apps/web/src/app/(app)/inventory/bin-locations/**`
- `apps/web/src/app/(app)/inventory/serial-numbers/**`

Existing workflow pages updated:
- `apps/web/src/app/(app)/inventory/balances/page.tsx`
- `apps/web/src/app/(app)/inventory/inventory-guidance.test.tsx`
- `apps/web/src/app/(app)/inventory/purchase-receipts/[id]/page.tsx`
- `apps/web/src/app/(app)/inventory/reports/movement-summary/page.tsx`
- `apps/web/src/app/(app)/inventory/reports/stock-valuation/page.tsx`
- `apps/web/src/app/(app)/inventory/stock-movements/page.tsx`
- `apps/web/src/app/(app)/inventory/warehouses/[id]/page.tsx`
- `apps/web/src/app/(app)/items/page.tsx`
- `apps/web/src/app/(app)/items/page.test.tsx`
- `apps/web/src/app/(app)/purchases/bills/[id]/page.tsx`
- `apps/web/src/app/(app)/purchases/matching/page.tsx`
- `apps/web/src/app/(app)/purchases/matching/page.test.tsx`

Workflow components and helpers:
- `apps/web/src/components/forms/purchase-return-form.tsx`
- `apps/web/src/components/forms/sales-inventory-return-form.tsx`
- `apps/web/src/components/forms/sales-inventory-return-form.test.tsx`
- `apps/web/src/components/inventory/**`
- `apps/web/src/components/parties/party-new-transaction-menu.tsx`
- `apps/web/src/components/parties/party-new-transaction-menu.test.tsx`
- `apps/web/src/components/parties/party-pages.tsx`
- `apps/web/src/components/parties/party-pages.test.tsx`
- `apps/web/src/components/purchases/purchase-matching-panel.tsx`
- `apps/web/src/components/purchases/purchase-matching-panel.test.tsx`

Web libs and types required by the workflow screens:
- `apps/web/src/lib/global-search.ts`
- `apps/web/src/lib/inventory.ts`
- `apps/web/src/lib/inventory.test.ts`
- `apps/web/src/lib/parties.ts`
- `apps/web/src/lib/parties.test.ts`
- `apps/web/src/lib/permissions.ts`
- `apps/web/src/lib/permissions.test.ts`
- `apps/web/src/lib/purchase-returns.ts`
- `apps/web/src/lib/sales-inventory-returns.ts`
- `apps/web/src/lib/sales-inventory-returns.test.ts`
- `apps/web/src/lib/sidebar-nav.ts`
- `apps/web/src/lib/types.ts`

## Behavior Confirmed By Inspection

- Purchase return and sales inventory return pages/forms call the committed API slice and keep return movement wording operational/non-posting.
- Inventory preview pages use preview-only copy for FIFO, landed cost, valuation variance, and traceability surfaces.
- Traceability setup pages gate create/update actions behind inventory manage permission while allowing view-only access where appropriate.
- AP dashboard and party pages present supplier attention, purchase returns, and valuation variance previews as read-only/operational review surfaces.
- Navigation, global search, sidebar links, permission checks, and web types were expanded to expose the new controlled-beta workflows.

## Deliberately Excluded

- `apps/api/**`, Prisma migrations, and API tests already committed in the API/schema/product slice.
- Public marketing/readiness routes and content: `apps/web/src/app/ar/**`, `apps/web/src/app/pricing/**`, `apps/web/src/app/product/**`, `apps/web/src/app/readiness/**`, `apps/web/src/app/resources/**`, `apps/web/src/app/workflows/**`, `apps/web/src/app/marketing.test.tsx`, and `apps/web/src/components/marketing/**`.
- `graphify-out/**` and `apps/graphify-out/**` generated graph/cache/output artifacts.
- Unrelated docs/status/policy files waiting for the docs/status slice.
- ZATCA roadmap work, production settings, deploys, smoke/E2E/browser login flows, migrations, seed/reset/delete, real email, backup/restore, and provider/env changes.

## Targeted Verification

Passed:
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=purchase` - 12 suites / 45 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=return` - 5 suites / 13 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=inventory` - 11 suites / 46 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=supplier` - 4 suites / 12 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=ap-dashboard` - 1 suite / 3 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=landed` - 1 suite / 5 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=fifo` - 1 suite / 4 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=valuation` - 2 suites / 5 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=traceability` - 1 suite / 4 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=items` - 1 suite / 1 test.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=parties` - 4 suites / 13 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand src/lib/permissions.test.ts` - 1 suite / 10 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=global-search` - 2 suites / 11 tests.
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=sidebar` - 1 suite / 3 tests.

Typecheck:
- `corepack pnpm --filter @ledgerbyte/web typecheck` - passed.

Blocked / not accepted as slice signal:
- `corepack pnpm --dir apps/web exec jest --config jest.config.cjs --runInBand --testPathPatterns=ap` was too broad and ran 90 of 91 suites. It failed in `src/lib/permission-matrix.test.ts` because the permission matrix omits unrelated customer-payment and ZATCA permission catalog entries. This was not fixed in the web workflow UI slice because it is outside the selected workflow scope and touches ZATCA/catalog behavior.

## Known Blockers

- Permission matrix catalog coverage remains a separate blocker for a later permissions/admin-hardening or docs/status task. It should not be solved by weakening tests.
- Marketing/readiness pages are still dirty and intentionally unstaged for a separate review lane.
- Full E2E, smoke, browser login/audit-writing flows, visual snapshot updates, production checks, deploys, real email, real ZATCA, backup/restore, provider/env changes, and migration execution were intentionally not run.

## Follow-Up Items

Marketing/readiness follow-up:
- Classify and verify public marketing/readiness routes separately before any commit.

Docs follow-up:
- Review product policy and sprint-closure docs in the docs/status slice after code slices are stable.

Graphify decision:
- Preserve `graphify-out/**` and `apps/graphify-out/**` on disk, but keep them unstaged and uncommitted by default.

Next prompt title: `LedgerByte stabilize docs and status slice`
