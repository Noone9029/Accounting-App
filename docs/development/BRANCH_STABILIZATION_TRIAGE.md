# LedgerByte Dirty Branch Stabilization Triage

Date: 2026-06-07

## Scope

This report preserves and classifies the current dirty branch before any new product, ZATCA, or production-roadmap work is added. It is triage, classification, preservation, and safe verification planning only.

Explicit non-changes in this triage:

- No files were deleted.
- No product, API, schema, ZATCA, marketing, or production behavior was changed.
- No staging or commit was performed.
- No migrations were run.
- No deploys, provider setting changes, Vercel/Supabase changes, real email, real ZATCA, backup/restore, smoke, E2E, production checks, or login/audit-writing browser flows were run.
- Graphify output was preserved on disk and excluded from the release commit plan by default.

LedgerByte remains controlled beta/user-testing only. Vercel remains beta/user-testing/staging only. This report does not make or imply production-readiness claims.

## Repository State

- Repository: `Noone9029/Accounting-App`
- Branch: `codex/dev-12-generated-documents-storage-retention`
- Latest commit inspected: `5083aaef Test ZATCA adapter no-network contracts`
- Collapsed dirty status entries: `123`
- File-level dirty paths: `223`
- Tracked modified files: `51`
- Untracked files: `172`
- `git diff --check`: no whitespace errors reported; only LF-to-CRLF working-copy warnings were printed.

The following status documents were checked and are not currently dirty:

- `CODEX_HANDOFF.md`
- `README.md`
- `docs/PRODUCT_READINESS_SCORECARD.md`
- `docs/REMAINING_ROADMAP.md`
- `docs/IMPLEMENTATION_STATUS.md`

Because they are not dirty, they should not be modified during stabilization unless a later explicit handoff/documentation update asks for it.

## Classification Summary

| Category | Count | Representative paths | Why it belongs here | Recommended action |
| --- | ---: | --- | --- | --- |
| A. Schema/API/product logic | 65 | `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20260605190000_purchase_returns_workflow/migration.sql`, `apps/api/src/purchase-returns/*`, `apps/api/src/sales-inventory-returns/*`, `apps/api/src/inventory/inventory-fifo-preview.service.ts`, `apps/api/src/contacts/supplier-ap-dashboard.service.ts` | Prisma schema, migrations, controllers, services, DTOs, and specs for purchase returns, sales inventory returns, supplier/AP dashboard, inventory previews, traceability, tracking validation, stock movements, and related product logic. | Preserve; run targeted API tests first; stage later as Commit 1 after review. |
| B. Web/UI workflow | 66 | `apps/web/src/app/(app)/purchases/returns/*`, `apps/web/src/app/(app)/sales/inventory-returns/*`, `apps/web/src/app/(app)/purchases/ap-dashboard/page.tsx`, `apps/web/src/app/(app)/inventory/fifo-preview/page.tsx`, `apps/web/src/components/inventory/traceability-setup-pages.tsx`, `apps/web/src/lib/inventory.ts` | App routes, forms, workflow pages, UI panels, route helpers, permissions, navigation, global search, type definitions, and frontend tests for the current product work. | Preserve; test after the API slice; stage later as Commit 2. |
| C. Docs/status/roadmap | 18 | `docs/development/PURCHASE_RETURNS_POLICY.md`, `docs/development/SALES_INVENTORY_RETURNS_SPRINT_CLOSURE.md`, `docs/development/LANDED_COST_PREVIEW_POLICY.md`, `docs/development/SERIAL_BATCH_BIN_LOCATION_POLICY.md` | Sprint closures and policy documents for the current product/API/UI work. | Preserve; stage later as Commit 3 after code slices. |
| D. Marketing/readiness pages | 13 | `apps/web/src/components/marketing/marketing-site.tsx`, `apps/web/src/app/pricing/page.tsx`, `apps/web/src/app/ar/page.tsx`, `apps/web/src/app/readiness/page.tsx`, `apps/web/src/app/marketing.test.tsx` | Public marketing/readiness routes and tests that are not part of the core stabilization slice. | Preserve; do not touch during product stabilization; Commit 4 only if explicitly approved. |
| E. Graphify/generated/cache/output | 61 | `graphify-out/*`, `graphify-out/cache/ast/*.json`, `apps/graphify-out/cache/*` | Graph analysis, generated reports, AST/cache artifacts, and local analysis output. These are not source behavior. | Preserve on disk; do not commit by default. |
| F. Ambiguous/high-risk | 0 by path classification | No path was unclassifiable by directory/name pattern. | Risk comes from mixed scope, not unknown paths. Prisma migrations and marketing pages still require careful review before staging. | Preserve; review migrations and marketing separately before any commit. |

## Category Detail

### A. Schema/API/Product Logic

Primary areas:

- Prisma schema and four untracked Prisma migrations.
- Purchase returns API, DTOs, service, controller, and tests.
- Sales inventory returns API, DTOs, service, controller, and tests.
- Supplier/AP dashboard API service and tests.
- Inventory landed cost, FIFO, valuation variance, traceability, and tracking validation API surfaces.
- Contact ledger, purchase matching, stock movements, purchase receipts, sales stock issues, warehouse transfers, items, number sequences, audit events, and app module wiring.

Representative paths:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260605190000_purchase_returns_workflow/migration.sql`
- `apps/api/prisma/migrations/20260605203000_inventory_returns_integration/migration.sql`
- `apps/api/prisma/migrations/20260606100000_sales_inventory_returns/migration.sql`
- `apps/api/prisma/migrations/20260606143000_serial_batch_bin_location_groundwork/migration.sql`
- `apps/api/src/purchase-returns/*`
- `apps/api/src/sales-inventory-returns/*`
- `apps/api/src/inventory/inventory-fifo-preview.service.ts`
- `apps/api/src/inventory/inventory-landed-cost-preview.service.ts`
- `apps/api/src/inventory/inventory-valuation-variance-preview.service.ts`
- `apps/api/src/inventory/inventory-traceability.service.ts`
- `apps/api/src/inventory/inventory-tracking-validation.ts`
- `apps/api/src/contacts/supplier-ap-dashboard.service.ts`

Recommended action:

- Preserve all files.
- Review schema and migration consistency before staging.
- Run targeted API tests before broader checks.
- Stage as the first product commit only after targeted API checks and migration review.

### B. Web/UI Workflow

Primary areas:

- Purchase return pages, detail/edit/new routes, form, and frontend helpers.
- Sales inventory return pages, detail/edit/new routes, form, tests, and frontend helper library.
- Supplier/AP dashboard page and tests.
- Inventory landed cost, FIFO, valuation variance, traceability, serial, batch, and bin/location pages.
- Items page/test updates.
- Party pages, purchase matching panel, permissions, sidebar nav, global search, inventory helper library, and shared frontend types.

Representative paths:

- `apps/web/src/app/(app)/purchases/returns/*`
- `apps/web/src/components/forms/purchase-return-form.tsx`
- `apps/web/src/app/(app)/sales/inventory-returns/*`
- `apps/web/src/components/forms/sales-inventory-return-form.tsx`
- `apps/web/src/app/(app)/purchases/ap-dashboard/page.tsx`
- `apps/web/src/app/(app)/inventory/landed-cost/page.tsx`
- `apps/web/src/app/(app)/inventory/fifo-preview/page.tsx`
- `apps/web/src/app/(app)/inventory/valuation-variances/page.tsx`
- `apps/web/src/components/inventory/traceability-setup-pages.tsx`
- `apps/web/src/lib/inventory.ts`
- `apps/web/src/lib/types.ts`

Recommended action:

- Preserve all files.
- Do not stage until the API/schema slice is reviewed and targeted API tests are run.
- Run targeted web tests next.
- Stage as Commit 2 after UI-specific checks.

### C. Docs/Status/Roadmap

Primary areas:

- Sprint closure docs for purchase returns, inventory returns integration, sales inventory returns, supplier/AP dashboard, landed cost, FIFO, serial/batch/bin/location, and valuation variance preview.
- Policy docs for purchase returns, sales inventory returns, inventory returns integration, landed cost, FIFO preview, serial/batch/bin/location, supplier/AP dashboard attention, and valuation variance preview.
- Existing dirty docs for delivery notes and purchase matching review closure notes.

Representative paths:

- `docs/development/PURCHASE_RETURNS_POLICY.md`
- `docs/development/PURCHASE_RETURNS_WORKFLOW_SPRINT_CLOSURE.md`
- `docs/development/INVENTORY_RETURNS_INTEGRATION_POLICY.md`
- `docs/development/SALES_INVENTORY_RETURNS_POLICY.md`
- `docs/development/LANDED_COST_PREVIEW_POLICY.md`
- `docs/development/FIFO_COST_LAYER_PREVIEW_POLICY.md`
- `docs/development/SERIAL_BATCH_BIN_LOCATION_POLICY.md`
- `docs/development/SUPPLIER_AP_DASHBOARD_ATTENTION_POLICY.md`
- `docs/development/PURCHASE_MATCHING_REVIEW_WORKFLOW_SPRINT_CLOSURE.md`

Recommended action:

- Preserve all files.
- Stage as Commit 3 after product/API and UI slices.
- Include this stabilization triage report in the docs commit.

### D. Marketing/Readiness Pages

Primary areas:

- English and Arabic public route pages.
- Public marketing component.
- Marketing test file.

Representative paths:

- `apps/web/src/components/marketing/marketing-site.tsx`
- `apps/web/src/app/marketing.test.tsx`
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

Recommended action:

- Preserve all files.
- Do not touch or stage during the core product stabilization pass.
- Commit only if explicitly approved as a separate marketing/readiness slice.

### E. Graphify/Generated/Cache/Output

Primary areas:

- Root graphify reports and metadata.
- Root graphify AST/cache JSON.
- `apps/graphify-out` cache artifacts.
- Historical graphify backup/report directories.

Representative paths:

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/GRAPH_TREE.html`
- `graphify-out/graph.json`
- `graphify-out/manifest.json`
- `graphify-out/cache/ast/*.json`
- `graphify-out/2026-05-28/*`
- `graphify-out/2026-05-28_2/*`
- `graphify-out/backup-apps-before-codebase-refresh-20260528-233958/*`
- `apps/graphify-out/cache/*`

Recommended action:

- Preserve on disk.
- Do not commit by default.
- Consider adding graphify output to ignore rules only in a later explicit cleanup task, not during this preservation pass.

## Immediate Risk List

- Four untracked Prisma migration directories need schema-to-migration review before staging.
- The worktree mixes core product/API/UI changes with unrelated marketing/readiness work; accidental staging would make review harder.
- Graphify output is not currently ignored and can be accidentally staged.
- Full typecheck may expose broad unrelated failures; do not delete tests or weaken assertions to force green.
- ZATCA has a next prompt available, but it must wait until product stabilization is complete.
- Production foundation remains planning only and must not be mixed into this branch stabilization task.

## Targeted Test Plan

Run API tests first:

```powershell
corepack pnpm --filter @ledgerbyte/api test -- purchase-return
corepack pnpm --filter @ledgerbyte/api test -- sales-inventory-return
corepack pnpm --filter @ledgerbyte/api test -- inventory-fifo-preview
corepack pnpm --filter @ledgerbyte/api test -- inventory-landed-cost-preview
corepack pnpm --filter @ledgerbyte/api test -- inventory-valuation-variance-preview
corepack pnpm --filter @ledgerbyte/api test -- inventory-traceability
corepack pnpm --filter @ledgerbyte/api test -- inventory-tracking-validation
corepack pnpm --filter @ledgerbyte/api test -- purchase-matching
corepack pnpm --filter @ledgerbyte/api test -- supplier-ap-dashboard
corepack pnpm --filter @ledgerbyte/api test -- contact
corepack pnpm --filter @ledgerbyte/api test -- item.service
corepack pnpm --filter @ledgerbyte/api test -- stock-movement
```

Then run web tests:

```powershell
corepack pnpm --filter @ledgerbyte/web test -- purchases/returns
corepack pnpm --filter @ledgerbyte/web test -- sales/inventory-returns
corepack pnpm --filter @ledgerbyte/web test -- purchases/ap-dashboard
corepack pnpm --filter @ledgerbyte/web test -- inventory/landed-cost
corepack pnpm --filter @ledgerbyte/web test -- inventory/fifo-preview
corepack pnpm --filter @ledgerbyte/web test -- inventory/valuation-variances
corepack pnpm --filter @ledgerbyte/web test -- traceability-setup-pages
corepack pnpm --filter @ledgerbyte/web test -- items/page
corepack pnpm --filter @ledgerbyte/web test -- party-pages
corepack pnpm --filter @ledgerbyte/web test -- permissions
corepack pnpm --filter @ledgerbyte/web test -- inventory
```

After targeted failures are resolved:

```powershell
corepack pnpm typecheck
corepack pnpm verify:diff
corepack pnpm verify:ci:local -- --plan
```

## Blocked Or Deferred Checks

Do not run during this stabilization triage unless separately approved:

- Full E2E.
- Full smoke.
- Visual snapshot updates.
- Browser login or audit-writing flows.
- Migrations against live/shared data.
- Seed/reset/delete.
- Deploys.
- Real email.
- Real ZATCA.
- Backup/restore.
- Provider or environment changes.
- Production checks.

## Commit Slicing Plan

Commit 1: Schema/API/product logic

- Prisma schema and migration directories.
- Purchase returns API.
- Inventory returns integration.
- Sales inventory returns API.
- Supplier/AP dashboard API.
- Purchase matching, stock movements, landed cost, FIFO, valuation variance, tracking validation, and traceability API logic.
- Targeted API tests.

Commit 2: Web/UI workflows

- Purchase return UI.
- Sales inventory return UI.
- Supplier/AP dashboard UI.
- Inventory landed cost, FIFO, valuation variance, traceability, serial, batch, and bin/location UI.
- Items, parties, permissions, sidebar, search, inventory helper, and frontend type updates.
- Targeted web tests.

Commit 3: Docs/status/roadmap

- Development policy docs.
- Sprint closure docs.
- This stabilization triage report.

Commit 4 only if explicitly approved: Marketing/readiness pages

- Public marketing/readiness routes.
- Arabic public pages.
- `apps/web/src/components/marketing/marketing-site.tsx`.
- `apps/web/src/app/marketing.test.tsx`.

Do not commit by default:

- `graphify-out/*`
- `apps/graphify-out/*`
- Generated graph/cache/analysis artifacts.

## Recommended Next Prompt

`LedgerByte stabilize API and schema product slice`

This next prompt should review and verify the API/schema slice first, starting with Prisma schema/migration consistency and the targeted API tests listed above. It should not begin ZATCA, production-roadmap, marketing, or broad cleanup work.
