# API Schema Product Slice Stabilization

Date: 2026-06-07

Branch: `codex/dev-12-generated-documents-storage-retention`

Baseline commit: `5083aaef Test ZATCA adapter no-network contracts`

Triage reference: `docs/development/BRANCH_STABILIZATION_TRIAGE.md` (`788094fd Document branch stabilization triage`)

## Scope

This stabilization pass covers only the API/schema/product-logic slice from the dirty branch. It preserves all existing work and leaves web/UI, marketing/readiness, graphify output, ZATCA, and unrelated docs for later review.

## Included API/Schema/Product Files

Schema and migrations:
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260605190000_purchase_returns_workflow/migration.sql`
- `apps/api/prisma/migrations/20260605203000_inventory_returns_integration/migration.sql`
- `apps/api/prisma/migrations/20260606100000_sales_inventory_returns/migration.sql`
- `apps/api/prisma/migrations/20260606143000_serial_batch_bin_location_groundwork/migration.sql`

API wiring, audit events, and numbering:
- `apps/api/src/app.module.ts`
- `apps/api/src/audit-log/audit-events.ts`
- `apps/api/src/number-sequences/number-sequence.service.ts`

Contacts and supplier/AP dashboard API:
- `apps/api/src/contacts/contact-ledger-rules.spec.ts`
- `apps/api/src/contacts/contact-ledger.service.ts`
- `apps/api/src/contacts/contact.controller.ts`
- `apps/api/src/contacts/contact.module.ts`
- `apps/api/src/contacts/contact.service.spec.ts`
- `apps/api/src/contacts/contact.service.ts`
- `apps/api/src/contacts/supplier-ap-dashboard.controller.spec.ts`
- `apps/api/src/contacts/supplier-ap-dashboard.service.spec.ts`
- `apps/api/src/contacts/supplier-ap-dashboard.service.ts`

Inventory previews, traceability, and tracking validation:
- `apps/api/src/inventory/dto/inventory-fifo-preview-query.dto.ts`
- `apps/api/src/inventory/dto/inventory-traceability.dto.ts`
- `apps/api/src/inventory/dto/landed-cost-preview.dto.ts`
- `apps/api/src/inventory/inventory.controller.spec.ts`
- `apps/api/src/inventory/inventory.module.ts`
- `apps/api/src/inventory/inventory-fifo-preview.controller.ts`
- `apps/api/src/inventory/inventory-fifo-preview.service.spec.ts`
- `apps/api/src/inventory/inventory-fifo-preview.service.ts`
- `apps/api/src/inventory/inventory-landed-cost-preview.controller.ts`
- `apps/api/src/inventory/inventory-landed-cost-preview.service.spec.ts`
- `apps/api/src/inventory/inventory-landed-cost-preview.service.ts`
- `apps/api/src/inventory/inventory-traceability.controller.ts`
- `apps/api/src/inventory/inventory-traceability.service.spec.ts`
- `apps/api/src/inventory/inventory-traceability.service.ts`
- `apps/api/src/inventory/inventory-tracking-validation.spec.ts`
- `apps/api/src/inventory/inventory-tracking-validation.ts`
- `apps/api/src/inventory/inventory-valuation-variance-preview.controller.ts`
- `apps/api/src/inventory/inventory-valuation-variance-preview.service.spec.ts`
- `apps/api/src/inventory/inventory-valuation-variance-preview.service.ts`

Items, returns, matching, and stock movement logic:
- `apps/api/src/items/dto/create-item.dto.ts`
- `apps/api/src/items/item.service.spec.ts`
- `apps/api/src/items/item.service.ts`
- `apps/api/src/purchase-returns/**`
- `apps/api/src/sales-inventory-returns/**`
- `apps/api/src/purchase-matching/purchase-matching.service.spec.ts`
- `apps/api/src/purchase-matching/purchase-matching.service.ts`
- `apps/api/src/purchase-receipts/purchase-receipt.service.ts`
- `apps/api/src/inventory-adjustments/inventory-adjustment.service.ts`
- `apps/api/src/sales-stock-issues/sales-stock-issue.service.ts`
- `apps/api/src/stock-movements/dto/create-stock-movement.dto.ts`
- `apps/api/src/stock-movements/stock-movement-rules.ts`
- `apps/api/src/stock-movements/stock-movement.service.spec.ts`
- `apps/api/src/stock-movements/stock-movement.service.ts`
- `apps/api/src/warehouse-transfers/warehouse-transfer.service.ts`

## Deliberately Excluded

- `apps/web/**` web/UI workflow and marketing/readiness changes.
- `docs/development/*` policy and sprint-closure docs unrelated to this API slice.
- `graphify-out/**` and `apps/graphify-out/**` generated graph/cache/output artifacts.
- ZATCA docs, scripts, behavior, provider settings, and roadmap work.
- Visual snapshots, browser login/audit-writing flows, smoke/E2E work, deploys, seed/reset/delete work, and live/shared database migrations.

## Targeted Verification

Initial command:
- `corepack pnpm --filter @ledgerbyte/api test -- --runInBand purchase-return` - passed, 2 suites / 16 tests. This forwarded a literal `--` into Jest, so later commands used `pnpm exec jest` directly.

Targeted API commands:
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand sales-inventory-return` - passed, 2 suites / 12 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand inventory-fifo-preview` - passed, 1 suite / 12 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand inventory-landed-cost-preview` - passed, 1 suite / 11 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand inventory-valuation-variance-preview` - passed, 1 suite / 8 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand inventory-traceability` - passed, 1 suite / 8 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand inventory-tracking-validation` - passed, 1 suite / 3 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand purchase-matching` - passed, 2 suites / 11 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand supplier-ap-dashboard` - passed, 2 suites / 4 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand contact` - passed, 4 suites / 29 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand item.service` - passed, 1 suite / 4 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand stock-movement` - passed, 2 suites / 9 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand purchase` - passed, 10 suites / 93 tests.
- `corepack pnpm --filter @ledgerbyte/api exec jest --config jest.config.cjs --runInBand inventory` - passed, 14 suites / 113 tests.

Typecheck:
- `corepack pnpm --filter @ledgerbyte/api typecheck` - passed.

## Schema And Migration Handling

Prisma schema and four migration files are included in this API/schema slice. They were inspected as local source artifacts only. No migrations were executed, no database was reset or seeded, and no live/shared data was touched.

## Known Blockers

No API-slice blockers were found in targeted tests or API typecheck.

Full workspace typecheck, CI verification, smoke tests, E2E, browser flows, production checks, deploys, real email, real ZATCA, backup/restore, provider/env changes, and migration execution were intentionally not run in this stabilization pass.

## Follow-Up Items

Web/UI follow-up:
- Stabilize purchase return UI, sales inventory return UI, AP dashboard UI, inventory preview UI, traceability pages, item/party/permissions helpers, and related web tests in the next slice.

Docs follow-up:
- Review and commit product policy and sprint-closure docs in the docs/status slice after code slices are stable.

Graphify decision:
- Preserve `graphify-out/**` and `apps/graphify-out/**` on disk, but keep them unstaged and uncommitted by default.

Next prompt title: `LedgerByte stabilize web workflow UI slice`
